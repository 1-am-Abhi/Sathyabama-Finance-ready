const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const timeout = require('connect-timeout');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

let logger = console;
try {
    // If custom logger is available, use it; otherwise fall back to console
    logger = require('./utils/logger');
} catch (e) {
    console.warn("Logger not found, using console fallback");
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

// CORS
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

// Serve locally-stored uploads (bills/UC/proofs) so Finance can preview/download
// them. NOTE: Render's filesystem is ephemeral — for multi-instance/persistent
// production, configure Cloudinary (deps already present) so uploads return a
// durable CDN URL instead of a local path.
const pathModule = require('path');
// Durable proof serving: try Postgres (survives Render's ephemeral filesystem)
// first, then fall back to any file still on local disk (legacy uploads).
app.get('/uploads/:filename', async (req, res, next) => {
    try {
        const { UploadedFile } = require('./models');
        const record = await UploadedFile.findByPk(req.params.filename);
        if (record && record.data) {
            res.setHeader('Content-Type', record.mimetype || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
            res.setHeader('Cache-Control', 'private, max-age=86400');
            return res.send(record.data);
        }
    } catch (e) {
        logger.warn(`[uploads] DB lookup failed for ${req.params.filename}: ${e.message}`);
    }
    return next();
});
app.use('/uploads', require('express').static(pathModule.join(__dirname, '..', 'uploads')));

const AlertService = require('./services/alertService');
const { getEmptyAdminStatsData } = require('./utils/researchCenterSafety');

// Root route for basic health / Render checks
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Finance backend is running',
        path: '/',
        timestamp: new Date().toISOString()
    });
});

const healthHandler = async (req, res) => {
    const { isDbReady } = require('./config/db');
    const { redis } = require('./services/redisService');

    const dbStatus = isDbReady() ? 'up' : 'reconnecting';
    const redisStatus = redis && redis.status === 'ready' ? 'up' : 'down';

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
v1.stack = v1.stack.filter(
    (layer) => !layer.route || !layer.route.path.includes('/auth')
);

app.use('/api/v1', v1);
app.use('/api', v1); // Fallback for backward compatibility

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error('GLOBAL ERROR:', err);
    // Multer (file upload) errors are client errors, not server faults — surface
    // a clear 400 instead of a generic 500 (e.g. file too large / unexpected field).
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            code: err.code,
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Maximum upload size is 15 MB.'
                : `Upload error: ${err.message}`
        });
    }
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