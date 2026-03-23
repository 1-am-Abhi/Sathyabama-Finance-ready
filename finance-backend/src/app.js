const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for document uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const fundRequestRoutes = require('./routes/fundRequestRoutes');
const odRequestRoutes = require('./routes/odRequestRoutes');
const eventRequestRoutes = require('./routes/eventRequestRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/fund-requests', fundRequestRoutes);
app.use('/api/od-requests', odRequestRoutes);
app.use('/api/event-requests', eventRequestRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Sathyabama Finance API is running' });
});

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Sathyabama Finance API' });
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
