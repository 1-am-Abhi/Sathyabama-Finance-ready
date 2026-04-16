const { sequelize } = require('./src/config/db');
const models = require('./src/models');
const { User, Centre, FundSource } = models;

const seedData = async () => {
    try {
        console.log('Initiating Database Seeding...');
        
        // Safety Check: Avoid accidental wipes unless FORCE_WIPE is set
        const userCount = await User.count();
        const shouldForce = process.env.FORCE_WIPE === 'true';

        if (userCount > 0 && !shouldForce) {
            console.log('Database already contains data. Skipping seed process to preserve entries.');
            console.log('Use FORCE_WIPE=true to reset the database.');
            process.exit(0);
        }

        if (shouldForce) {
            console.log('FORCE_WIPE detected. Resetting database...');
            await sequelize.sync({ force: true });
            console.log('PostgreSQL Schema Reset (All tables dropped and recreated)');
        } else {
            await sequelize.sync({ alter: false });
            console.log('Syncing Schema (No destruction)...');
        }

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

        // 1. Create Default Centres
        console.log('Creating default centres...');
        const createdCentres = {};
        for (const name of centresList) {
            const centre = await Centre.create({ name });
            createdCentres[name] = centre;
        }
        console.log(`${centresList.length} Centres seeded.`);

        // 2. Create Default Users
        console.log('Creating default users...');
        await User.create({
            name: 'Dr. Bharathi',
            email: 'admin@sathyabama.ac.in',
            password: 'password123',
            role: 'ADMIN',
            department: 'RESEARCH'
        });

        const nanoCentre = createdCentres['Centre for Nano Science and Nanotechnology'];
        // Faculty and Finance Officer seeding removed to ensure a clean state
        console.log('Admin User seeded.');

        // 3. Create Default Fund Sources
        console.log('Creating default fund sources...');
        await FundSource.findOrCreate({
            where: { sourceType: 'collegeFunds' },
            defaults: { totalAllocated: 5000000 }
        });
        await FundSource.findOrCreate({
            where: { sourceType: 'pfmsFunds' },
            defaults: { totalAllocated: 2500000 }
        });

        console.log('Database seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
