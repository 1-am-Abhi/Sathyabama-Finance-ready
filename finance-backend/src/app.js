const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

// Middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (
            uniqueAllowedOrigins.length === 0 &&
            process.env.NODE_ENV !== 'production'
        ) {
            return callback(null, true);
        }

        if (uniqueAllowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
app.use(cors(corsOptions));

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(morgan('dev'));
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '10mb' }));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login requests per windowMs
    message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Serve static files (for document uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const fundRequestRoutes = require('./routes/fundRequestRoutes');
const odRequestRoutes = require('./routes/odRequestRoutes');
const eventRequestRoutes = require('./routes/eventRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const equipmentRequestRoutes = require('./routes/equipmentRequestRoutes');
const documentRoutes = require('./routes/documentRoutes');
const academicMetricRoutes = require('./routes/academicMetricRoutes');
const profileRoutes = require('./routes/profileRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const financeRoutes = require('./routes/financeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/fund-requests', fundRequestRoutes);
app.use('/api/od-requests', odRequestRoutes);
app.use('/api/event-requests', eventRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/equipment-requests', equipmentRequestRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/academic-metrics', academicMetricRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api', dashboardRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Sathyabama Finance API is running' });
});

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Sathyabama Finance API',
        status: 'Live',
        timestamp: new Date().toISOString()
    });
});

// Test Database Route
app.get('/test-db', async (req, res) => {
    try {
        const { sequelize } = require('./config/db');
        const [results] = await sequelize.query('SELECT NOW() as current_time');
        res.json({ 
            success: true, 
            message: 'PostgreSQL Database connected successfully via Sequelize!', 
            server_time: results[0].current_time 
        });
    } catch (error) {
        console.error('Test DB Route Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Log error for developers
    console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Default error status and message
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        success: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
});

module.exports = app;
