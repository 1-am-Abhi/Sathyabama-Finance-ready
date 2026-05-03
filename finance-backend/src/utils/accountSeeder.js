const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { Account } = require('../models');
const { ACCOUNTS } = require('../constants/accounts');

const seedAccounts = async () => {
  logger.info('[AccountSeed] Synchronizing Chart of Accounts...');

  try {
    // 🔥 GLOBAL CHECK (MOST IMPORTANT)
    const existingCount = await Account.count();

    if (existingCount > 0) {
      logger.info('⚠️ Accounts already exist, skipping seeding');
      return;
    }

    // 🔥 BULK INSERT (SAFE + FAST)
    const accountsArray = Object.values(ACCOUNTS).map(acc => ({
      ...acc,
      isActive: true,
      organizationId: acc.organizationId || 'ORG_1'
    }));

    await Account.bulkCreate(accountsArray);

    logger.info('✅ Chart of Accounts seeded successfully');

  } catch (err) {
    logger.error('[AccountSeed] Critical failure:', err.message);
  }
};

module.exports = seedAccounts;