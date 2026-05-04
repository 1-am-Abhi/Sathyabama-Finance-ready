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

    // ✅ DB ready check
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

    // 🔥 HARD FILTER (NO EXTRA FIELD EVER PASSES)
    const accountsArray = Object.values(ACCOUNTS).map(acc => ({
      name: acc.name || null,
      code: acc.code || null,
      type: acc.type || null,
      isActive: true,
      organizationId: acc.organizationId || 'ORG_1',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // 🔥 FORCE REMOVE ANY UNKNOWN KEYS (EXTRA SAFETY)
    accountsArray.forEach(acc => {
      Object.keys(acc).forEach(key => {
        if (![
          'name',
          'code',
          'type',
          'isActive',
          'organizationId',
          'createdAt',
          'updatedAt'
        ].includes(key)) {
          delete acc[key];
        }
      });
    });

    await Account.bulkCreate(accountsArray, {
      validate: true,
      ignoreDuplicates: true,
      fields: [
        'name',
        'code',
        'type',
        'isActive',
        'organizationId',
        'createdAt',
        'updatedAt'
      ]
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