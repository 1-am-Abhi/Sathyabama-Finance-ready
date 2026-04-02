const { sequelize } = require('./src/config/db');
const Project = require('./src/models/Project');
const { FundRequest } = require('./src/models/FundRequest');
const { Op } = require('sequelize');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Normalize Projects
        const projects = await Project.findAll({
            where: {
                status: { [Op.iLike]: 'active' }
            }
        });
        console.log(`Found ${projects.length} projects to normalize.`);
        for (const p of projects) {
            await p.update({ status: 'ACTIVE' });
        }

        // Normalize others if needed...
        const pendingProjects = await Project.findAll({
            where: {
                status: { [Op.iLike]: 'pending' }
            }
        });
        for (const p of pendingProjects) {
            await p.update({ status: 'PENDING' });
        }

        console.log('Normalization complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
