const { Redis } = require("ioredis");

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    tls: process.env.REDIS_URL?.includes('rediss://') ? { rejectUnauthorized: false } : undefined
});

module.exports = { redisConnection };
