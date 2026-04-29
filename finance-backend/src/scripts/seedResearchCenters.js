const logger = require('../utils/logger');
const { ResearchCenter } = require('../models');
const { sequelize } = require('../config/db');

const seedResearchCenters = async () => {
    try {
        logger.info('--- SEEDING RESEARCH CENTERS ---');
        
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
                logger.info(`[SEED] Created center: ${centerData.name}`);
            } else {
                logger.info(`[SEED] Center already exists: ${centerData.name}`);
            }
        }

        logger.info('--- SEEDING COMPLETE ---');
    } catch (error) {
        logger.error('[SEED ERROR]', error);
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
