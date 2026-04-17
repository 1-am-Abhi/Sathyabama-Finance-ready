const { sequelize } = require('./src/config/db');
const { User } = require('./src/models');
const { Op } = require('sequelize');

const cleanup = async () => {
    try {
        console.log('Initiating One-Time System User Cleanup...');
        
        const deletedCount = await User.destroy({
            where: {
                role: {
                    [Op.notIn]: ['ADMIN', 'FINANCE_OFFICER']
                }
            }
        });
        
        console.log(`Cleanup Success: Removed ${deletedCount} unauthorized users.`);
        process.exit(0);
    } catch (error) {
        console.error('Cleanup Failed:', error);
        process.exit(1);
    }
};

cleanup();
