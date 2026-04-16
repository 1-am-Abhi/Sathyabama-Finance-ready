const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
    })
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            dialect: 'postgres',
            port: process.env.DB_PORT || 5432,
            logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
            pool: {
                max: 20,
                min: 5,
                acquire: 30000,
                idle: 10000
            }
        }
    );

const shouldSyncDatabase = process.env.DB_SYNC === 'true' && process.env.NODE_ENV !== 'production';
const shouldAlterSchema = process.env.DB_SYNC_ALTER !== 'false';

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('PostgreSQL (Sequelize) Connected successfully.');
        
        // Import models to ensure associations are registered
        const models = require('../models');
        logger.info('Models and associations initialized.');
        
        if (shouldSyncDatabase) {
            await sequelize.sync({ alter: shouldAlterSchema });
            logger.warn(`WARNING: Database synced (alter=${shouldAlterSchema}). This should not happen in production!`);
        } else {
            logger.info('Database sync skipped natively. Migrations should manage the schemas moving forward.');
        }
    } catch (error) {
        logger.error('PostgreSQL connection error:', { error: error.message, stack: error.stack });
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
