const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
const corsOptions = {
    origin: [
        process.env.FRONTEND_URL,
        'https://finance-frontend-pxh9.onrender.com',
        'http://localhost:3000',
        'http://localhost:10000',
        'http://127.0.0.1:10000'
    ].filter(Boolean),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/fund-requests', fundRequestRoutes);
app.use('/api/od-requests', odRequestRoutes);
app.use('/api/event-requests', eventRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/equipment-requests', equipmentRequestRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/academic-metrics', academicMetricRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/finance', financeRoutes);

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
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
