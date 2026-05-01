const logger = require('../utils/logger');

const sslOptions = {
    require: true,
    rejectUnauthorized: false
};

const makeSequelizeOptions = () => ({
    dialect: 'postgres',
    dialectOptions: {
        ssl: sslOptions,
        keepAlive: true
    },
    pool: {
        max: Number(process.env.DB_POOL_MAX || 2),
        min: Number(process.env.DB_POOL_MIN || 0),
        acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
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
