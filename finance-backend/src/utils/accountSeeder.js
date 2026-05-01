const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { Account } = require('../models');
const { ACCOUNTS } = require('../constants/accounts');

const seedAccounts = async () => {
    logger.info('[AccountSeed] Synchronizing Chart of Accounts...');
    
    for (const key in ACCOUNTS) {
        const accountData = ACCOUNTS[key];
        try {
            const existing = await Account.findOne({
                where: {
                    [Op.or]: [
                        { code: accountData.code },
                        { name: accountData.name }
                    ]
                }
            });

            if (existing) {
                await existing.update({
                    name: accountData.name,
                    code: accountData.code,
                    type: accountData.type,
                    isActive: true
                });
                continue;
            }

            await Account.create({
                ...accountData,
                isActive: true
            });
        } catch (err) {
            logger.error(`[AccountSeed] Failed to seed ${accountData.name}:`, err.message);
        }
    }
    
    logger.info('[AccountSeed] Chart of Accounts synchronization complete.');
};

module.exports = seedAccounts;
