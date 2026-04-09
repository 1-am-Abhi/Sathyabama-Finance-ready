const { sequelize } = require('../config/db');
const Centre = require('../models/Centre');
const User = require('../models/User');
const Project = require('../models/Project');
const { FundRequest } = require('../models/FundRequest');

const initialCentres = [
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

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        
        // Ensure tables exist
        await sequelize.sync({ alter: true });
        console.log('Database synced');
        
        // 1. Seed Centres
        const centreMap = {};
        for (const name of initialCentres) {
            const [centre] = await Centre.findOrCreate({ where: { name } });
            centreMap[name] = centre._id;
            console.log(`Synced Centre: ${name} (${centre._id})`);
        }

        // 2. Update Users
        const users = await User.findAll();
        for (const user of users) {
            if (user.centre && centreMap[user.centre]) {
                await user.update({ centreId: centreMap[user.centre] });
            }
        }
        console.log(`Updated ${users.length} users`);

        // 3. Update Projects
        const projects = await Project.findAll();
        for (const project of projects) {
            if (project.centre && centreMap[project.centre]) {
                await project.update({ centreId: centreMap[project.centre] });
            }
        }
        console.log(`Updated ${projects.length} projects`);

        // 4. Update FundRequests
        const requests = await FundRequest.findAll();
        for (const req of requests) {
            if (req.centre && centreMap[req.centre]) {
                await req.update({ centreId: centreMap[req.centre] });
            }
        }
        console.log(`Updated ${requests.length} requests`);

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
// Simon says: I used UUIDs in models, so centreMap will have UUIDs.
