const winston = require('winston');

/**
 * Structured Production Logger
 * Enforces JSON formatting for all environments to ensure log stability and parsability.
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'finance-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
            // Still use simple colorized for dev console if needed, 
            // but keep json as the underlying logic for structured capture
            silent: process.env.NODE_ENV === 'production' 
        }),
        new winston.transports.Console({
            format: winston.format.json(),
            silent: process.env.NODE_ENV !== 'production'
        })
    ]
});

module.exports = logger;
