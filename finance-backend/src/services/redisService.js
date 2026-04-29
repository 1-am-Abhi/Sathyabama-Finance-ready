const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisDisabled = process.env.NODE_ENV !== 'production';

if (redisDisabled) {
    const disabledClient = {
        status: 'disabled',
        duplicate: () => disabledClient,
        on: () => disabledClient,
        get: async () => null,
        set: async () => null,
        incr: async () => 1,
        del: async () => 0,
        keys: async () => [],
        ping: async () => 'DISABLED',
        quit: async () => undefined,
    };

    const cache = {
        async get() { return null; },
        async set() { return false; },
        async invalidate() { return false; },
        async lock() { return null; }
    };

    module.exports = {
        redis: disabledClient,
        pubClient: disabledClient,
        subClient: disabledClient,
        cache,
        isHealthy: () => false,
        redlock: null,
        redisDisabled: true
    };
    return;
}

const createClient = () => {
    return new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: process.env.NODE_ENV !== 'production',
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.slice(0, targetError.length) === targetError) return true;
            return false;
        },
        retryStrategy: (times) => {
            if (process.env.NODE_ENV !== 'production' && times > 2) {
                logger.warn('[Redis] Max retries reached, running in standalone mode.');
                return null; // Stop retrying
            }
            return Math.min(times * 100, 3000);
        }
    });
};

const redis = createClient();
const pubClient = createClient();
const subClient = pubClient.duplicate();

let redisHealthy = false;
redis.on('ready', () => { redisHealthy = true; logger.info('[Redis] Healthy'); });
redis.on('error', (err) => { redisHealthy = false; logger.error('[Redis] Error', err.message); });

// Specialized Redlock Initialization for Distributed Systems
let redlock;
try {
    const Redlock = require('redlock');
    redlock = new Redlock([redis], {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 200,
        retryJitter: 200,
        automaticExtensionThreshold: 500
    });

    redlock.on('error', (err) => {
        logger.error('[Redlock] Critical Failure:', err.message);
    });
} catch (err) {
    logger.warn('[Redlock] Failed to initialize. Running without distributed locks.', err.message);
    redlock = null;
}

const cache = {
    async get(key) {
        if (!redisHealthy) return null;
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (err) { return null; }
    },

    async set(key, value, ttlSeconds = 60) {
        if (!redisHealthy) return false;
        try {
            await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            return true;
        } catch (err) { return false; }
    },

    async invalidate(pattern) {
        if (!redisHealthy) return false;
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) await redis.del(...keys);
            return true;
        } catch (err) { return false; }
    },

    /**
     * Managed Redlock with auto-renewal and graceful fallback
     */
    async lock(resource, ttlMs = 5000) {
        if (!redisHealthy || !redlock) {
            logger.warn(`[Lock] Skipping lock for ${resource}: System in standalone mode.`);
            return null;
        }
        try {
            return await redlock.acquire([`lock:${resource}`], ttlMs);
        } catch (err) {
            logger.warn(`[Redlock] Failed to acquire lock for ${resource}`);
            return null;
        }
    }
};

module.exports = { redis, pubClient, subClient, cache, isHealthy: () => redisHealthy, redlock };
