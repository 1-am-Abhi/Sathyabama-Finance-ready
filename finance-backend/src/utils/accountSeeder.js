const logger = require('../utils/logger');
const { Account } = require('../models');
const { ACCOUNTS } = require('../constants/accounts');

const seedAccounts = async () => {
  logger.info('[AccountSeed] Synchronizing Chart of Accounts...');

  try {
    if (!Account) {
      logger.warn('[AccountSeed] Account model not found, skipping');
      return;
    }

    if (!ACCOUNTS || Object.keys(ACCOUNTS).length === 0) {
      logger.warn('[AccountSeed] ACCOUNTS data missing, skipping');
      return;
    }

    // ✅ Check if table is ready
    let existingCount = 0;
    try {
      existingCount = await Account.count();
    } catch {
      logger.warn('[AccountSeed] Table not ready, skipping');
      return;
    }

    if (existingCount > 0) {
      logger.info('⚠️ Accounts already exist, skipping seeding');
      return;
    }

    // ✅ Clean mapping (NO unwanted fields like description)
    const accountsArray = Object.values(ACCOUNTS).map(acc => ({
      name: acc.name,
      code: acc.code,
      type: acc.type,
      isActive: true,
      organizationId: acc.organizationId || 'ORG_1',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await Account.bulkCreate(accountsArray, {
      validate: true,
      ignoreDuplicates: true
    });

    logger.info('✅ Chart of Accounts seeded successfully');

  } catch (err) {
    logger.error('[AccountSeed] Critical failure:', {
      message: err.message,
      stack: err.stack
    });
  }
};

module.exports = seedAccounts;