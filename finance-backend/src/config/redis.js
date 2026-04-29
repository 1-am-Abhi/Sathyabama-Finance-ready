const { Redis } = require("ioredis");

const redisDisabled = process.env.NODE_ENV !== 'production';

if (redisDisabled) {
    const noopRedisConnection = {
        status: 'disabled',
        connect: async () => undefined,
        disconnect: async () => undefined,
        duplicate: () => noopRedisConnection,
        on: () => noopRedisConnection,
        once: () => noopRedisConnection,
        emit: () => false,
        quit: async () => undefined,
        ping: async () => 'DISABLED',
    };

    module.exports = { redisConnection: noopRedisConnection, redisDisabled };
    return;
}

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    tls: process.env.REDIS_URL?.includes('rediss://') ? { rejectUnauthorized: false } : undefined
});

module.exports = { redisConnection, redisDisabled };
