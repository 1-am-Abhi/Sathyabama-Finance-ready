const { sequelize } = require('./src/config/db');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const { FundRequest } = require('./src/models/FundRequest');
const ODRequest = require('./src/models/ODRequest');
const EventRequest = require('./src/models/EventRequest');

const seedData = async () => {
    try {
        // Sync models (force: true drops existing tables)
        await sequelize.sync({ force: true });
        console.log('PostgreSQL Tables Synced (Recreated)...');

        // Create Users
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
            centre: 'Centre for Nano Science and Nanotechnology'
        });

        const finance = await User.create({
            name: 'Mr. Suresh Menon',
            email: 'finance@sathyabama.ac.in',
            password: 'password123',
            role: 'FINANCE_OFFICER',
            department: 'FINANCE'
        });

        console.log('Users seeded');

        // Create Projects
        const project1 = await Project.create({
            title: 'AI-Driven Traffic Management System',
            description: 'IoT based real-time traffic monitoring',
            pi: faculty.name,
            department: faculty.department,
            centre: faculty.centre,
            sanctionedBudget: 1500000,
            utilizedBudget: 600000,
            status: 'ACTIVE',
            fundingSource: 'PFMS'
        });

        const project2 = await Project.create({
            title: 'Renewable Energy Grid Optimization',
            description: 'Solar grid efficiency research',
            pi: faculty.name,
            department: faculty.department,
            centre: 'Centre of Excellence for Energy Research',
            sanctionedBudget: 2000000,
            utilizedBudget: 0,
            status: 'ACTIVE',
            fundingSource: "DIRECTOR_INNOVATION"
        });

        console.log('Projects seeded');

        // Create Fund Requests
        await FundRequest.create({
            projectTitle: project1.title,
            faculty: faculty.name,
            requestedAmount: 500000,
            purpose: 'GPU Server Purchase',
            department: faculty.department,
            centre: faculty.centre,
            source: 'PFMS',
            status: 'PENDING',
            currentStage: 'FUND_APPROVED'
        });

        await FundRequest.create({
            projectTitle: project2.title,
            faculty: faculty.name,
            requestedAmount: 300000,
            purpose: 'Solar Panel Sensors',
            department: faculty.department,
            centre: 'Centre of Excellence for Energy Research',
            source: 'DIRECTOR_INNOVATION',
            status: 'APPROVED',
            currentStage: 'CHEQUE_RELEASED',
            chequeStatus: 'Approved',
            auditTrail: [
                { stage: 'FUND_APPROVED', updatedBy: admin._id, updatedByName: admin.name, timestamp: new Date('2024-01-20') },
                { stage: 'FUND_RELEASED', updatedBy: finance._id, updatedByName: finance.name, timestamp: new Date('2024-01-22') },
                { stage: 'CHEQUE_RELEASED', updatedBy: finance._id, updatedByName: finance.name, timestamp: new Date('2024-01-25') }
            ]
        });

        console.log('Fund Requests seeded');
        console.log('Seeding completed successfully');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
