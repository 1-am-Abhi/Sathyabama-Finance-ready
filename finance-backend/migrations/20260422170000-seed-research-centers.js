'use strict';

module.exports = {
  up: async (queryInterface) => {
    const { randomUUID } = require('crypto');
    const centres = [
      { _id: randomUUID(), name: 'CMNS', code: 'CMNS' },
      { _id: randomUUID(), name: 'AI Lab', code: 'AI' },
      { _id: randomUUID(), name: 'Biotech', code: 'BIO' },
    ];

    await queryInterface.sequelize.query(`
      INSERT INTO "ResearchCenters" ("_id", "name", "code", "createdAt", "updatedAt")
      VALUES
        ('${centres[0]._id}', '${centres[0].name}', '${centres[0].code}', NOW(), NOW()),
        ('${centres[1]._id}', '${centres[1].name}', '${centres[1].code}', NOW(), NOW()),
        ('${centres[2]._id}', '${centres[2].name}', '${centres[2].code}', NOW(), NOW())
      ON CONFLICT ("name") DO NOTHING;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM "ResearchCenters"
      WHERE "name" IN ('CMNS', 'AI Lab', 'Biotech');
    `);
  }
};
