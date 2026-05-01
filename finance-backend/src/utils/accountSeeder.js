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
                    code: accountData.code,
                    name: accountData.name,
                    type: accountData.type,
                    isActive: true,
                    organizationId: existing.organizationId || 'ORG_1'
                });

                logger.info(`[AccountSeed] Updated: ${accountData.name}`);
                continue;
            }

            await Account.create({
                ...accountData,
                isActive: true,
                organizationId: accountData.organizationId || 'ORG_1'
            });

            logger.info(`[AccountSeed] Created: ${accountData.name}`);

        } catch (err) {
            logger.error(
                `[AccountSeed] Failed for ${accountData.name}`,
                err.message
            );
        }
    }

    logger.info('[AccountSeed] Chart of Accounts synchronization complete.');
};

module.exports = seedAccounts;