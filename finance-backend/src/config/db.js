const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const logger = require('../utils/logger');
const { makeSequelizeOptions } = require('./sequelizeOptions');

dotenv.config();

const sequelizeOptions = makeSequelizeOptions();

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, sequelizeOptions)
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            ...sequelizeOptions,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432
        }
    );

const shouldSyncDatabase = false;
let dbReady = false;
let retryTimer = null;
let retryDelay = 5000;
let hasLoggedDbFailure = false;
global.dbReady = false;

const connectDB = async (onConnected) => {
    try {
        await sequelize.authenticate();
        logger.info('PostgreSQL Connected successfully.');
        
        if (!dbReady) {
            require('../models');
            logger.info('Models and associations initialized.');
        }
        
        if (shouldSyncDatabase) {
            logger.warn('Database sync is disabled. Run Sequelize migrations instead.');
        }
        logger.info('Database sync skipped. Migrations manage schema creation and changes.');

        retryDelay = 5000;
        hasLoggedDbFailure = false;
        dbReady = true;
        global.dbReady = true;
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }

        if (typeof onConnected === 'function') {
            await onConnected();
        }
    } catch (error) {
        dbReady = false;
        global.dbReady = false;
        if (!hasLoggedDbFailure) {
            logger.error('PostgreSQL connection error:', {
                message: error.message,
                stack: error.stack
            });
            logger.warn('DB connection lost, retrying...');
            hasLoggedDbFailure = true;
        }

        logger.debug(`Retrying DB connection in ${retryDelay / 1000} seconds...`);

        if (!retryTimer) {
            retryTimer = setTimeout(() => {
                retryTimer = null;
                connectDB(onConnected);
            }, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 30000);
        }
    }
};

const isDbReady = () => dbReady;

module.exports = { sequelize, connectDB, isDbReady };
