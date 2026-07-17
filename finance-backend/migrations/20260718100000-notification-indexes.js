'use strict';

// The notifications endpoint loads on every page and queries by userId ordered
// by createdAt. Without an index this is a full scan on a growing table, which on
// a cold/slow DB pushed the request past the request timeout (→ 500). Idempotent.
module.exports = {
  async up(queryInterface, Sequelize) {
    // dedupeKey column for idempotent notification creation.
    try {
      const table = await queryInterface.describeTable('Notifications');
      if (!table.dedupeKey) {
        await queryInterface.addColumn('Notifications', 'dedupeKey', {
          type: Sequelize.STRING,
          allowNull: true,
        });
        console.log('✅ Notifications.dedupeKey added');
      }
    } catch (e) {
      console.log(`ℹ️ dedupeKey add skipped: ${e.message}`);
    }

    const addIndex = async (fields, name) => {
      try {
        await queryInterface.addIndex('Notifications', fields, { name });
        console.log(`✅ index ${name} created`);
      } catch (e) {
        console.log(`ℹ️ index ${name} skipped: ${e.message}`);
      }
    };
    await addIndex(['userId'], 'notifications_user_id_idx');
    await addIndex(['userId', 'createdAt'], 'notifications_user_created_idx');
    await addIndex(['userId', 'dedupeKey'], 'notifications_user_dedupe_idx');
  },

  async down(queryInterface) {
    for (const name of ['notifications_user_id_idx', 'notifications_user_created_idx']) {
      try { await queryInterface.removeIndex('Notifications', name); } catch (e) { /* noop */ }
    }
  },
};
