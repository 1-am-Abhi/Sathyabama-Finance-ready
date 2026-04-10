const models = require('./src/models');
const { FundSource, Project } = models;

async function check() {
    try {
        const sources = await FundSource.findAll();
        console.log('--- Fund Sources ---');
        console.table(sources.map(s => s.toJSON()));

        const projectCounts = await Project.findAll({
            attributes: [
                'fundingSource',
                [models.sequelize.fn('COUNT', models.sequelize.col('_id')), 'count'],
                [models.sequelize.fn('SUM', models.sequelize.col('sanctionedBudget')), 'totalBudget']
            ],
            group: ['fundingSource']
        });
        console.log('--- Projects by Source ---');
        console.table(projectCounts.map(p => p.toJSON()));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
