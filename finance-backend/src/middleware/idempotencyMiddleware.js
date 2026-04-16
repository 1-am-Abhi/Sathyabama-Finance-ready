const crypto = require('crypto');
const { cache } = require('../services/redisService');
const logger = require('../utils/logger');

const canonicalSerialize = require('../utils/normalization');

/**
 * Enterprise Canonical Idempotency Middleware
 */
const advancedIdempotency = async (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].indexOf(req.method) === -1) return next();

    const key = req.headers['x-idempotency-key'];
    if (!key) return next();

    const userId = req.user?.id || req.user?._id || 'unauthenticated';
    const requestId = req.id || 'unknown';

    // Canonical representation for perfect hashing
    const canonicalPayload = canonicalSerialize({
        body: req.body || {},
        url: req.originalUrl,
        userId
    });

    const signature = crypto.createHash('sha256')
        .update(canonicalPayload)
        .digest('hex');



    const cacheKey = `idempotency:${key}:${userId}`;

    try {
        const cached = await cache.get(cacheKey);

        if (cached) {
            // Collision detection check
            if (cached.signature !== signature) {
                logger.warn('[Idempotency] Potential key collision or body mismatch', { key, userId, requestId });
                return res.status(409).json({
                    success: false,
                    message: 'Idempotency collision: A different request already used this key.'
                });
            }

            logger.info('[Idempotency] Replaying cached response', { key, requestId });
            return res.status(cached.status).json(cached.body);
        }

        // Intercept response to cache it
        const originalJson = res.json;
        res.json = function (body) {
            // Only cache successful or intentional 4xx/5xx responses
            // Avoid caching transient failures if possible, but for financial-grade, 
            // even failures should be idempotent if they are definitive.
            cache.set(cacheKey, {
                status: res.statusCode,
                body,
                signature,
                requestId,
                timestamp: Date.now()
            }, 86400); // 24-hour TTL for memory safety and business requirements

            return originalJson.call(this, body);
        };

        next();
    } catch (err) {
        logger.error('[Idempotency] Middleware fault', { error: err.message, requestId });
        next();
    }
};

module.exports = advancedIdempotency;
