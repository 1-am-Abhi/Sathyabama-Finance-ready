const { sequelize } = require('./src/config/db');
const models = require('./src/models');
const { User, Centre, Project, ProjectMember, Revenue, Disbursement } = models;
const { FundRequest } = require('./src/models/FundRequest');

const seedData = async () => {
    try {
        console.log('Initiating Full Production-Grade Database Seeding...');
        
        await sequelize.sync({ force: true });
        console.log('PostgreSQL Schema Reset (All tables dropped and recreated)');

        const centresList = [
            'Centre for Nano Science and Nanotechnology',
            'Centre of Excellence for Energy Research',
            'Centre for Waste Management',
            'Centre for Climate Studies',
            'Others'
        ];

        console.log('Creating default centres...');
        const createdCentres = {};
        for (const name of centresList) {
            const centre = await Centre.create({ name });
            createdCentres[name] = centre;
        }

        console.log('Creating users...');
        const admin = await User.create({
            name: 'Dr. Bharathi',
            email: 'admin@sathyabama.ac.in',
            password: 'password123',
            role: 'ADMIN',
            department: 'RESEARCH'
        });

        const faculty = await User.create({
            name: 'Dr. Rajesh Khanna',
            email: 'rajesh@sathyabama.ac.in',
            password: 'password123',
            role: 'FACULTY',
            department: 'Physics',
            centre: 'Centre for Nano Science and Nanotechnology'
        });

        console.log('Creating realistic projects...');
        const projects = await Project.bulkCreate([
            {
                title: 'Quantum Computing in Nanotech',
                description: 'Exploring quantum states in carbon nanotubes.',
                sanctionedBudget: 2500000,
                fundingSource: 'DST-SERB',
                projectType: 'RESEARCH',
                status: 'ACTIVE',
                pi: faculty.name,
                facultyId: faculty._id || faculty.id,
                department: 'Physics',
                centre: 'Centre for Nano Science and Nanotechnology'
            },
            {
                title: 'Ocean Thermal Energy Conversion',
                description: 'Prototype for deep sea thermal exchange.',
                sanctionedBudget: 1500000,
                fundingSource: 'NIOT',
                projectType: 'RESEARCH',
                status: 'ACTIVE',
                pi: admin.name,
                facultyId: admin._id || admin.id,
                department: 'Mechanical',
                centre: 'Centre of Excellence for Energy Research'
            },
            {
                title: 'Bio-Polymer Waste Synthesis',
                description: 'Creating biodegradable polymers from waste.',
                sanctionedBudget: 800000,
                fundingSource: 'Institution',
                projectType: 'PROJECT',
                status: 'ACTIVE',
                pi: faculty.name,
                facultyId: faculty._id || faculty.id,
                department: 'Chemistry',
                centre: 'Centre for Waste Management'
            },
            {
                title: 'Micro-Grid Stability Analysis',
                description: 'Stability of hybrid renewable grids.',
                sanctionedBudget: 1200000,
                fundingSource: 'AICTE',
                projectType: 'CONSULTANCY',
                status: 'ACTIVE',
                pi: faculty.name,
                facultyId: faculty._id || faculty.id,
                department: 'EEE',
                centre: 'Centre of Excellence for Energy Research'
            },
            {
                title: 'Carbon Capture Metrics',
                description: 'Monitoring carbon sequestering in urban areas.',
                sanctionedBudget: 500000,
                fundingSource: 'MOEF',
                projectType: 'RESEARCH',
                status: 'PENDING',
                pi: admin.name,
                facultyId: admin._id || admin.id,
                department: 'Environment',
                centre: 'Centre for Climate Studies'
            }
        ]);

        console.log('Mapping project members...');
        for(const p of projects) {
            await ProjectMember.create({
                projectId: p._id || p.id,
                userId: p.facultyId,
                role: 'PI'
            });
        }

        console.log('Creating fund requests and disbursements...');
        // Request 1: Disbursed
        const fr1 = await FundRequest.create({
            projectId: projects[0]._id || projects[0].id,
            projectTitle: projects[0].title,
            faculty: projects[0].pi,
            facultyId: projects[0].facultyId,
            requestedAmount: 500000,
            purpose: 'Equipment Purchase (Spectrometer)',
            status: 'DISBURSED',
            currentStage: 'COMPLETED'
        });
        await Disbursement.create({
            requestId: fr1._id || fr1.id,
            projectId: projects[0]._id || projects[0].id,
            amount: 500000,
            transactionId: 'TXN-990011',
            disbursedBy: admin._id || admin.id
        });

        // Request 2: Pending
        await FundRequest.create({
            projectId: projects[1]._id || projects[1].id,
            projectTitle: projects[1].title,
            faculty: projects[1].pi,
            facultyId: projects[1].facultyId,
            requestedAmount: 200000,
            purpose: 'Consumables for Lab Test',
            status: 'PENDING',
            currentStage: 'INITIAL_APPROVAL'
        });

        // Request 3: Disbursed
        const fr3 = await FundRequest.create({
            projectId: projects[2]._id || projects[2].id,
            projectTitle: projects[2].title,
            faculty: projects[2].pi,
            facultyId: projects[2].facultyId,
            requestedAmount: 100000,
            purpose: 'Travel for Field Work',
            status: 'DISBURSED',
            currentStage: 'COMPLETED'
        });
        await Disbursement.create({
            requestId: fr3._id || fr3.id,
            projectId: projects[2]._id || projects[2].id,
            amount: 100000,
            transactionId: 'TXN-990022',
            disbursedBy: admin._id || admin.id
        });

        console.log('Creating revenue entries...');
        await Revenue.create({
            facultyId: faculty._id || faculty.id,
            revenueSource: 'Consultancy',
            clientName: 'Tata Power',
            amount: 250000,
            verifiedAmount: 250000,
            status: 'VERIFIED',
            paymentDate: new Date()
        });

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
