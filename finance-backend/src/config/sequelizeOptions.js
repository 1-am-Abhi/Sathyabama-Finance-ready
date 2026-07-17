const logger = require('../utils/logger');

const sslOptions = {
    require: true,
    rejectUnauthorized: false
};

// SSL is required by managed Postgres (Render) but not by a local/unencrypted
// server. Honour DB_SSL explicitly, otherwise disable SSL for localhost so the
// app is runnable locally. Mirrors the logic in src/config/config.js.
const shouldUseSsl = () => {
    if (process.env.DB_SSL === 'false') return false;
    if (process.env.DB_SSL === 'true') return true;
    const url = process.env.DATABASE_URL || '';
    try {
        const { hostname } = new URL(url);
        if (['localhost', '127.0.0.1', '::1', ''].includes(hostname)) return false;
    } catch {
        /* no/invalid DATABASE_URL — fall through to default */
    }
    return true;
};

const makeSequelizeOptions = () => ({
    dialect: 'postgres',
    dialectOptions: {
        ...(shouldUseSsl() ? { ssl: sslOptions } : {}),
        keepAlive: true
    },
    pool: {
        // A max of 2 connections was the root cause of proof uploads (and other
        // writes) hanging until the request timeout: notification polling + the
        // disbursement worker + concurrent users exhausted the pool, so the next
        // query waited for a free connection and the request timed out (→ "UC NO").
        // 10 is safely within Render's free-tier Postgres connection limit.
        max: Number(process.env.DB_POOL_MAX || 10),
        min: Number(process.env.DB_POOL_MIN || 0),
        // Fail fast (8s) rather than hanging up to the request timeout if the pool
        // is genuinely saturated — surfaces a clear error instead of a 30s stall.
        acquire: Number(process.env.DB_POOL_ACQUIRE || 8000),
        idle: Number(process.env.DB_POOL_IDLE || 10000),
        evict: Number(process.env.DB_POOL_EVICT || 1000)
    },
    retry: {
        max: Number(process.env.DB_RETRY_MAX || 3),
        match: [
            /Connection terminated unexpectedly/i,
            /Connection terminated/i,
            /ECONNRESET/i,
            /ETIMEDOUT/i,
            /SequelizeConnection/i,
            /deadlock detected/i
        ]
    },
    logging: false
});

module.exports = { makeSequelizeOptions };
