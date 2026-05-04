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
      {
        name: 'Faculty User',
        email: 'faculty@sathyabama.ac.in',
        password: 'Faculty@123',
        role: 'FACULTY',
        organizationId: 'ORG_1',
        department: 'Computer Science',
        designation: 'Professor',
        designationCategory: 'FACULTY',
        status: 'Active'
      },
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