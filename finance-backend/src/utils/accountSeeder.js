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

    // 🔥 Check DB ready
    let existingCount = 0;
    try {
      existingCount = await Account.count();
    } catch {
      logger.warn('[AccountSeed] Table not ready, skipping');
      return;
    }

    if (existingCount > 0) {
      logger.info(`⚠️ Accounts already exist (${existingCount}), skipping`);
      return;
    }

    // 🔥 STRICT FIELD FILTER (THIS FIXES YOUR ISSUE)
    const allowedFields = ['name', 'code', 'type'];

    const accountsArray = Object.values(ACCOUNTS).map(acc => {
      const clean = {};

      for (const key of allowedFields) {
        if (acc[key] !== undefined) {
          clean[key] = acc[key];
        }
      }

      return {
        ...clean,
        isActive: true,
        organizationId: acc.organizationId || 'ORG_1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    await Account.bulkCreate(accountsArray, {
      validate: true,
      ignoreDuplicates: true,
      fields: ['name', 'code', 'type', 'isActive', 'organizationId', 'createdAt', 'updatedAt']
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