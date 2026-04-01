const { sequelize } = require('./src/config/db');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const { FundRequest } = require('./src/models/FundRequest');
const ODRequest = require('./src/models/ODRequest');
const EventRequest = require('./src/models/EventRequest');
const Notification = require('./src/models/Notification');
const AcademicMetric = require('./src/models/AcademicMetric');
const Document = require('./src/models/Document');
const EquipmentRequest = require('./src/models/EquipmentRequest');

const seedData = async () => {
    try {
        // Sync models (alter: false avoids dropping or modifying tables unnecessarily)
        await sequelize.sync({ alter: false });
        console.log('PostgreSQL Schema Synced (No destruction)...');

        // Check if data already exists to avoid duplicates/overwrites
        const userCount = await User.count();
        if (userCount > 0) {
            console.log('Database already contains data. Skipping seed process to preserve user entries.');
            process.exit();
        }

        // Create Default Users
        const admin = await User.create({
            name: 'Dr. Bharathi',
            email: 'admin@sathyabama.ac.in',
            password: 'password123',
            role: 'ADMIN',
            department: 'RESEARCH'
        });

        const faculty = await User.create({
            name: 'Dr. Priya Sharma',
            email: 'faculty@sathyabama.ac.in',
            password: 'password123',
            role: 'FACULTY',
            department: 'CSE',
            centre: 'Centre for Nano Science and Nanotechnology',
            isProfileCompleted: false
        });

        const finance = await User.create({
            name: 'Mr. Suresh Menon',
            email: 'finance@sathyabama.ac.in',
            password: 'password123',
            role: 'FINANCE_OFFICER',
            department: 'FINANCE'
        });

        console.log('Default users seeded (Clean Slate)');
        console.log('Seeding completed successfully');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
