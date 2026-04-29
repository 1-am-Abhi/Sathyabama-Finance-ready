const logger = require('../utils/logger');
const { Account } = require('../models');
const { ACCOUNTS } = require('../constants/accounts');

const seedAccounts = async () => {
    logger.info('[AccountSeed] Synchronizing Chart of Accounts...');
    
    for (const key in ACCOUNTS) {
        const accountData = ACCOUNTS[key];
        try {
            await Account.findOrCreate({
                where: { code: accountData.code },
                defaults: accountData
            });
        } catch (err) {
            logger.error(`[AccountSeed] Failed to seed ${accountData.name}:`, err.message);
        }
    }
    
    logger.info('[AccountSeed] Chart of Accounts synchronization complete.');
};

module.exports = seedAccounts;
