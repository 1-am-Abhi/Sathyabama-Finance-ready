const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

let server;

// Connect to PostgreSQL
connectDB()
    .then(() => {
        server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error starting server:', error.message);
        process.exit(1);
    });

const shutdown = (signal) => {
    if (!server) {
        process.exit(0);
    }

    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
