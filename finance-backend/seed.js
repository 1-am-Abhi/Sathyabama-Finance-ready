const { sequelize } = require('./src/config/db');
const models = require('./src/models');
const { User, Centre } = models;

const seedData = async () => {
    try {
        console.log('Initiating Strict Administrative Database Seeding...');

        // Disable constraints and truncate all involved tables safely
        await sequelize.query('TRUNCATE TABLE "Users" CASCADE;');
        await sequelize.query('TRUNCATE TABLE "Centres" CASCADE;');
        await sequelize.query('TRUNCATE TABLE "ResearchCenters" CASCADE;');
        await sequelize.query('TRUNCATE TABLE "Projects" CASCADE;');
        await sequelize.query('TRUNCATE TABLE "FundRequests" CASCADE;');
        await sequelize.query('TRUNCATE TABLE "Disbursements" CASCADE;');
        await sequelize.query('TRUNCATE TABLE "Revenues" CASCADE;');

        console.log('Database Cleaned: Truncated Users, Centres, Projects, and Financial tables.');

        const centresList = [
            'Centre for Nano Science and Nanotechnology',
            'Centre of Excellence for Energy Research',
            'Centre for Waste Management',
            'Centre for Climate Studies',
            'Centre for Molecular and Nanomedical Sciences',
            'Centre for Drug Discovery and Development',
            'Centre of Excellence for Additive Manufacturing',
            'Centre for Indian System of Medicine',
            'Centre for Aqua Culture',
            'Others'
        ];

        console.log('Seeding default centres...');
        for (const name of centresList) {
            await Centre.create({ name });
        }

        console.log('Seeding primary administrative users...');

        const admin = await User.create({
            name: 'System Admin',
            email: 'admin@sathyabama.ac.in',
            password: 'password123',
            role: 'ADMIN',
            department: 'RESEARCH',
            isProfileCompleted: true
        });
        console.log(`[USER CREATED] ${admin.email} - ${admin.role}`);

        const finance = await User.create({
            name: 'Finance Officer',
            email: 'finance@sathyabama.ac.in',
            password: 'password123',
            role: 'FINANCE_OFFICER',
            department: 'FINANCE',
            isProfileCompleted: true
        });
        const faculty = await User.create({
            name: 'Sample Faculty',
            email: 'faculty@sathyabama.ac.in',
            password: 'password123',
            role: 'FACULTY',
            department: 'CSE',
            isProfileCompleted: true
        });
        console.log(`[USER CREATED] ${faculty.email} - ${faculty.role}`);

        console.log('Seeding completed. Admin, Finance Officer, and Faculty users initialized.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
