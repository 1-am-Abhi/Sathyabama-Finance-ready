'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    // 🔹 SAFE COLUMN ADD (FIXED)
    const safeAddColumn = async (table, column, definition) => {
      const tables = await queryInterface.showAllTables();

      const exists =
        tables.includes(table) ||
        tables.includes(table.toLowerCase());

      if (!exists) {
        console.log(`⚠️ Table ${table} does not exist, skipping`);
        return;
      }

      const schema = await queryInterface.describeTable(table);

      if (!schema[column]) {
        await queryInterface.addColumn(table, column, definition);
        console.log(`✅ Added ${column} to ${table}`);
      } else {
        console.log(`⚠️ ${column} already exists in ${table}, skipping`);
      }
    };

    // 🔹 SAFE TABLE CREATE
    const safeCreateTable = async (tableName, schema) => {
      const tables = await queryInterface.showAllTables();
      if (!tables.includes(tableName)) {
        await queryInterface.createTable(tableName, schema);
        console.log(`✅ Created table ${tableName}`);
      } else {
        console.log(`⚠️ Table ${tableName} exists, skipping`);
      }
    };

    // =========================
    // 🟢 SYSTEM JOBS
    // =========================
    await safeCreateTable('SystemJobs', {
      jobId: { type: Sequelize.STRING, primaryKey: true },
      requestId: { type: Sequelize.UUID, allowNull: false },
      status: { type: Sequelize.STRING, defaultValue: 'PENDING' },
      processedAt: { type: Sequelize.DATE },
      error: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // =========================
    // 🟢 FEATURE FLAGS
    // =========================
    await safeCreateTable('FeatureFlags', {
      key: { type: Sequelize.STRING, primaryKey: true },
      enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      updatedBy: { type: Sequelize.STRING },
      reason: { type: Sequelize.TEXT },
      lastAuditAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // =========================
    // 🟢 SAFE REQUEST ID ADD
    // =========================
    const tablesToHarden = ['FundRequests', 'Disbursements', 'Notifications'];

    for (const table of tablesToHarden) {
      await safeAddColumn(table, 'requestId', {
        type: Sequelize.UUID,
        allowNull: true
      });
    }

    // =========================
    // 🟢 IDEMPOTENCY KEY
    // =========================
    await safeAddColumn('FundRequests', 'idempotencyKey', {
      type: Sequelize.STRING,
      allowNull: true
    });

    try {
      await queryInterface.addIndex('FundRequests', ['idempotencyKey'], {
        unique: true,
        where: { idempotencyKey: { [Sequelize.Op.ne]: null } }
      });
    } catch (err) {
      console.log('⚠️ idempotency index exists, skipping');
    }
  },

  async down(queryInterface) {
    try { await queryInterface.dropTable('SystemJobs'); } catch {}
    try { await queryInterface.dropTable('FeatureFlags'); } catch {}
    try { await queryInterface.removeColumn('FundRequests', 'requestId'); } catch {}
    try { await queryInterface.removeColumn('Disbursements', 'requestId'); } catch {}
    try { await queryInterface.removeColumn('Notifications', 'requestId'); } catch {}
    try { await queryInterface.removeColumn('FundRequests', 'idempotencyKey'); } catch {}
  }
};