const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const timeout = require('connect-timeout');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
let logger;
try {
    logger = require('./utils/logger');
} catch (e) {
    console.warn("Logger not found, using console fallback");
    logger = console;
}


const app = express();

// Security & Optimization
app.use(helmet());
app.use(compression());
app.use(timeout('10s')); // Fail fast on slow requests
app.set('trust proxy', 1);
app.disable('x-powered-by');

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim()).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}
app.use(cors({
    origin: [...new Set(allowedOrigins)],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

// Request Tracing
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('x-request-id', req.id);
    next();
});

app.use(morgan('dev'));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
            requestId: req.id,
            user: req.user?.id || 'anonymous'
        });
    });
    next();
});
app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const AlertService = require('./services/alertService');

// System Status (Public)
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        data: AlertService.getSystemStatus(),
        timestamp: new Date().toISOString()
    });
});

// Health Check (Deep)
app.get('/health', async (req, res) => {

    const { sequelize } = require('./config/db');
    const { redis } = require('./services/redisService');
    
    const dbStatus = await sequelize.authenticate().then(() => 'up').catch(() => 'down');
    const redisStatus = redis.status === 'ready' ? 'up' : 'down';
    
    const status = (dbStatus === 'up' && redisStatus === 'up') ? 200 : 503;
    
    res.status(status).json({
        status: status === 200 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: { database: dbStatus, redis: redisStatus }
    });
});

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests' }
});
app.use('/api/', globalLimiter);

// API Versioning & Routes
const v1 = express.Router();
const path = require('path');
const { mountRoutes } = require('./utils/routeHelper');

// Automatically mount all routes in the routes directory
mountRoutes(v1, path.join(__dirname, 'routes'));

app.use('/api/v1', v1);
app.use('/api', v1); // Fallback for backward compatibility

// Global Error Handler
app.use((err, req, res, next) => {
    if (req.timedout) return res.status(503).json({ success: false, message: 'Request timed out' });
    
    const status = err.status || 500;
    logger.error(`[App Error] ${err.message}`, {
        requestId: req.id,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(status).json({
        success: false,
        message: status === 500 ? 'Internal Server Error' : err.message,
        requestId: req.id
    });
});

// Final 404 Catch-all (Must be last)
app.use((req, res) => {
    logger.warn(`[API ERROR] Missing route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: "Route not found",
        data: [] 
    });
});


module.exports = app;

