const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');
const path = require('path');
const fs = require('fs');
const logger = require('./src/utils/logger');

// Load environment variables
dotenv.config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Local uploads directory replaced by Cloudinary in production

let server;

// Connect to PostgreSQL
connectDB()
    .then(() => {
        server = app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        logger.error('Error starting server', { error: error.message, stack: error.stack });
        process.exit(1);
    });

const shutdown = (signal) => {
    if (!server) {
        process.exit(0);
    }

    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
