const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sathyabama-finance';

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}

// Connect to PostgreSQL
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error starting server:', error.message);
        process.exit(1);
    });
