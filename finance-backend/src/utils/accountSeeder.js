const logger = require('../utils/logger');
const { Account } = require('../models');
const { ACCOUNTS } = require('../constants/accounts');

const seedAccounts = async () => {
  logger.info('[AccountSeed] Synchronizing Chart of Accounts...');

  try {
    // 🔴 CHECK MODEL EXISTS
    if (!Account) {
      logger.warn('[AccountSeed] Account model not found, skipping');
      return;
    }

    // 🔴 CHECK DATA EXISTS
    if (!ACCOUNTS || Object.keys(ACCOUNTS).length === 0) {
      logger.warn('[AccountSeed] ACCOUNTS data missing, skipping');
      return;
    }

    // 🔥 SAFE COUNT CHECK
    let existingCount = 0;
    try {
      existingCount = await Account.count();
    } catch (err) {
      logger.warn('[AccountSeed] Table not ready, skipping seeding');
      return;
    }

    if (existingCount > 0) {
      logger.info('⚠️ Accounts already exist, skipping seeding');
      return;
    }

    // 🔥 PREPARE DATA
    const accountsArray = Object.values(ACCOUNTS).map(acc => ({
      name: acc.name,
      code: acc.code,
      type: acc.type,
      isActive: true,
      organizationId: acc.organizationId || 'ORG_1',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // 🔥 BULK INSERT
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