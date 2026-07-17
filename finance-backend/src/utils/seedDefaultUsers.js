const logger = require('../utils/logger');
const User = require('../models/User');

const seedDefaultUsers = async () => {
  logger.info('[UserSeed] Checking default users...');

  try {
    const defaultUsers = [
      {
        name: 'System Admin',
        email: 'admin@sathyabama.ac.in',
        password: 'Admin@123',
        role: 'ADMIN',
        organizationId: 'ORG_1',
        department: 'Administration',
        designation: 'Administrator',
        status: 'Active'
      },
      // NOTE: no demo faculty is seeded. Faculty master data is owned exclusively
      // by the IRC Excel import (src/seeders/seedIrcFaculty.js). Seeding a demo
      // faculty here would re-introduce an "old/demo" record on every boot.
      {
        name: 'Finance Officer',
        email: 'finance@sathyabama.ac.in',
        password: 'Finance@123',
        role: 'FINANCE_OFFICER',
        organizationId: 'ORG_1',
        department: 'Finance',
        designation: 'Finance Officer',
        status: 'Active'
      }
    ];

    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ where: { email: userData.email } });

      if (existingUser) {
        logger.info(`[UserSeed] User already exists: ${userData.email}`);
        continue;
      }

      await User.create(userData);
      logger.info(`[UserSeed] Created default user: ${userData.email}`);
    }

    logger.info('[UserSeed] Default user sync complete');
  } catch (err) {
    logger.error('[UserSeed] Critical failure:', {
      message: err.message,
      stack: err.stack
    });
  }
};

module.exports = seedDefaultUsers;