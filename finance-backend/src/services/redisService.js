const Redis = require('ioredis');
const Redlock = require('redlock');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const createClient = () => {
    return new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.slice(0, targetError.length) === targetError) return true;
            return false;
        },
        retryStrategy: (times) => Math.min(times * 100, 3000)
    });
};

const redis = createClient();
const pubClient = createClient();
const subClient = pubClient.duplicate();

let redisHealthy = false;
redis.on('ready', () => { redisHealthy = true; logger.info('[Redis] Healthy'); });
redis.on('error', (err) => { redisHealthy = false; logger.error('[Redis] Error', err.message); });

const redlock = new Redlock([redis], {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200,
    automaticExtensionThreshold: 500, // Extend if lock has <500ms remaining
});

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
     * Managed Redlock with auto-renewal support
     * Usage: const lock = await cache.lock('res'); try { ... } finally { await lock.release(); }
     */
    async lock(resource, ttlMs = 5000) {
        if (!redisHealthy) return null;
        try {
            const lock = await redlock.acquire([`lock:${resource}`], ttlMs);
            return lock;
        } catch (err) {
            logger.warn(`[Redlock] Failed to acquire lock for ${resource}`);
            return null;
        }
    }
};

module.exports = { redis, pubClient, subClient, cache, isHealthy: () => redisHealthy, redlock };
