const { sequelize } = require('./src/config/db');
const models = require('./src/models');
const { User, Centre } = models;

// ============================================================
// SAFE SEED SCRIPT — READ BEFORE RUNNING
// This script NEVER deletes or overwrites existing data.
// It only INSERTS records that do not already exist.
// Run manually: npm run seed
// BLOCKED in production automatically.
// ============================================================

const seedData = async () => {
    // SAFETY GUARD: Prevent accidental execution in production
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ BLOCKED: Seed script cannot run in production environment.');
        console.error('   This protects live data from accidental deletion.');
        process.exit(1);
    }

    try {
        console.log('🌱 Starting SAFE database seeding (no data will be deleted)...');

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

        console.log('Seeding default centres (skipping existing)...');
        let centresCreated = 0;
        for (const name of centresList) {
            const [, created] = await Centre.findOrCreate({ where: { name } });
            if (created) centresCreated++;
        }
        console.log(`✅ Centres: ${centresCreated} new, ${centresList.length - centresCreated} already existed.`);

        console.log('Seeding default users (skipping existing)...');
        const defaultUsers = [
            {
                name: 'System Admin',
                email: 'admin@sathyabama.ac.in',
                password: 'password123',
                role: 'ADMIN',
                department: 'RESEARCH',
                isProfileCompleted: true
            },
            {
                name: 'Finance Officer',
                email: 'finance@sathyabama.ac.in',
                password: 'password123',
                role: 'FINANCE_OFFICER',
                department: 'FINANCE',
                isProfileCompleted: true
            },
            {
                name: 'Sample Faculty',
                email: 'faculty@sathyabama.ac.in',
                password: 'password123',
                role: 'FACULTY',
                department: 'CSE',
                isProfileCompleted: true
            }
        ];

        let usersCreated = 0;
        for (const userData of defaultUsers) {
            const existing = await User.findOne({ where: { email: userData.email } });
            if (!existing) {
                await User.create(userData);
                console.log(`  ✅ Created user: ${userData.email} (${userData.role})`);
                usersCreated++;
            } else {
                console.log(`  ⏭️  Skipped user: ${userData.email} (already exists)`);
            }
        }

        console.log(`\n✅ Seeding complete: ${usersCreated} users created, ${centresCreated} centres created.`);
        console.log('   Existing data was NOT modified or deleted.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
