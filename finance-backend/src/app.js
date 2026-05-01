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
    logger.warn("Logger not found, using console fallback");
    logger = console;
}


const app = express();

// Security & Optimization
app.use(helmet());
app.use(compression());
app.use(timeout('10s')); // Fail fast on slow requests
app.use((req, res, next) => {
    res.setTimeout(15000, () => {
        if (!res.headersSent) {
            res.status(503).json({
                success: false,
                message: 'Request timed out'
            });
        }
    });
    next();
});
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin === process.env.FRONTEND_URL) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
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
const { getEmptyAdminStatsData } = require('./utils/researchCenterSafety');

const healthHandler = async (req, res) => {
    const { isDbReady } = require('./config/db');
    const { redis } = require('./services/redisService');
    
    const dbStatus = isDbReady() ? 'up' : 'reconnecting';
    const redisStatus = redis.status === 'ready' ? 'up' : 'down';
    
    res.status(200).json({
        status: 'OK',
        db: dbStatus === 'up' ? 'connected' : 'reconnecting',
        redis: redisStatus === 'up' ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
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

// 1. Auth & Analytics Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);

const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/analytics', analyticsRoutes);

const projectRoutes = require('./routes/projectRoutes');
const fundRequestRoutes = require('./routes/fundRequestRoutes');
const financeRoutes = require('./routes/financeRoutes');
const dbReady = require('./middleware/dbReady');
app.use('/api/projects', projectRoutes);
app.use('/api/fund-requests', dbReady, fundRequestRoutes);
app.use('/api/finance', dbReady, financeRoutes);

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
  logger.error('GLOBAL ERROR:', err);
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      message: 'Database error'
    });
  }
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
