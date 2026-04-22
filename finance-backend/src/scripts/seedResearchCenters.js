const { ResearchCenter } = require('../models');
const { sequelize } = require('../config/db');

const seedResearchCenters = async () => {
    try {
        console.log('--- SEEDING RESEARCH CENTERS ---');
        
        const centers = [
            { name: 'Centre for Molecular and Nanomedical Sciences', code: 'CMNS' },
            { name: 'AI Lab', code: 'AIL' },
            { name: 'Biotech', code: 'BIO' }
        ];

        for (const centerData of centers) {
            const [center, created] = await ResearchCenter.findOrCreate({
                where: { name: centerData.name },
                defaults: centerData
            });

            if (created) {
                console.log(`[SEED] Created center: ${centerData.name}`);
            } else {
                console.log(`[SEED] Center already exists: ${centerData.name}`);
            }
        }

        console.log('--- SEEDING COMPLETE ---');
    } catch (error) {
        console.error('[SEED ERROR]', error);
    } finally {
        // Only process exit if run directly
        if (require.main === module) {
            process.exit(0);
        }
    }
};

if (require.main === module) {
    seedResearchCenters();
}

module.exports = seedResearchCenters;
