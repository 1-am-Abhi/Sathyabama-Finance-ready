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

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.options('*', cors());

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
const { getEmptyAdminStatsData } = require('./utils/researchCenterSafety');

const healthHandler = async (req, res) => {
    const { sequelize } = require('./config/db');
    const { redis } = require('./services/redisService');
    
    const dbStatus = await sequelize.authenticate().then(() => 'up').catch(() => 'down');
    const redisStatus = redis.status === 'ready' ? 'up' : 'down';
    
    const status = (dbStatus === 'up' && redisStatus === 'up') ? 200 : 503;
    
    res.status(status).json({
        status: status === 200 ? 'OK' : 'ERROR',
        db: dbStatus === 'up' ? 'connected' : 'disconnected',
        redis: redisStatus === 'up' ? 'connected' : 'disconnected'
    });
};

// System Status (Public)
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        data: AlertService.getSystemStatus(),
        timestamp: new Date().toISOString()
    });
});

// Health Check (Deep)
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Versioning & Routes
const v1 = express.Router();
const path = require('path');
const { mountRoutes } = require('./utils/routeHelper');

// 1. Auth Routes (Exempt from global rate limiting)
const authRoutes = require('./routes/authRoutes');
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);

// 2. Rate Limiting (Applied to all OTHER institutional APIs)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests' },
    skip: (req) => req.path.includes('/auth/') // Double safety
});
app.use('/api/', globalLimiter);

// 3. Mount remaining institutional routes
mountRoutes(v1, path.join(__dirname, 'routes'));
// Filter out auth from v1 to prevent double mounting if mountRoutes picks it up
v1.stack = v1.stack.filter(layer => !layer.route || !layer.route.path.includes('/auth'));

app.use('/api/v1', v1);
app.use('/api', v1); // Fallback for backward compatibility

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Final 404 Catch-all (Must be last)
app.use((req, res) => {
    logger.warn(`[API ERROR] Missing route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
        correlationId: req.correlationId
    });
});


module.exports = app;
