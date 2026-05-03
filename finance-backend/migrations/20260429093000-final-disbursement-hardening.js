'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 🔹 SAFE COLUMN ADD FUNCTION
      const safeAddColumn = async (table, column, definition) => {
        const schema = await queryInterface.describeTable(table);
        if (!schema[column]) {
          await queryInterface.addColumn(table, column, definition, { transaction });
          console.log(`✅ Added ${column} to ${table}`);
        } else {
          console.log(`⚠️ ${column} already exists in ${table}, skipping`);
        }
      };

      // 🔹 SAFE INDEX ADD FUNCTION
      const safeAddIndex = async (table, fields, options) => {
        try {
          await queryInterface.addIndex(table, fields, { ...options, transaction });
        } catch (err) {
          console.log(`⚠️ Index ${options.name} exists, skipping`);
        }
      };

      // =========================
      // 🟢 FUNDREQUESTS HARDENING
      // =========================
      await safeAddColumn('FundRequests', 'requestId', {
        type: Sequelize.STRING,
        allowNull: true
      });

      // =========================
      // 🟢 DISBURSEMENTS HARDENING
      // =========================
      await safeAddColumn('Disbursements', 'referenceId', {
        type: Sequelize.STRING,
        allowNull: true
      });

      await queryInterface.sequelize.query(`
        UPDATE "Disbursements"
        SET "referenceId" = COALESCE(
          NULLIF("referenceId", ''),
          NULLIF("bankReference", ''),
          NULLIF("transactionId", ''),
          NULLIF("chequeNumber", ''),
          "id"::text
        )
        WHERE "referenceId" IS NULL OR "referenceId" = ''
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Disbursements"
        ALTER COLUMN "referenceId" SET NOT NULL
      `, { transaction }).catch(() => {});

      await safeAddIndex('Disbursements', ['referenceId'], {
        name: 'unique_reference_id',
        unique: true
      });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Disbursements"
        ALTER COLUMN "amount" SET NOT NULL
      `, { transaction }).catch(() => {});

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_amount_positive'
          ) THEN
            ALTER TABLE "Disbursements"
            ADD CONSTRAINT "chk_amount_positive"
            CHECK ("amount" > 0);
          END IF;
        END $$;
      `, { transaction });

      await safeAddIndex('Disbursements', ['fundRequestId'], {
        name: 'idx_disbursements_fund_request_id_final'
      });

      // =========================
      // 🟢 LEDGERS HARDENING
      // =========================
      await safeAddColumn('Ledgers', 'disbursementId', {
        type: Sequelize.UUID,
        allowNull: true
      });

      await safeAddIndex('Ledgers', ['disbursementId'], {
        name: 'idx_ledger_disbursement'
      });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_disbursement_ledger_link'
          ) THEN
            ALTER TABLE "Ledgers"
            ADD CONSTRAINT "chk_disbursement_ledger_link"
            CHECK (
              COALESCE("metadata"->>'financialOperation', '') <> 'DISBURSEMENT'
              OR "disbursementId" IS NOT NULL
            );
          END IF;
        END $$;
      `, { transaction });

      await transaction.commit();
      console.log('✅ financial_grade_hardening migration complete');

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeConstraint('Ledgers', 'chk_disbursement_ledger_link', { transaction }).catch(() => {});
      await queryInterface.removeIndex('Ledgers', 'idx_ledger_disbursement', { transaction }).catch(() => {});
      await queryInterface.removeIndex('Disbursements', 'idx_disbursements_fund_request_id_final', { transaction }).catch(() => {});
      await queryInterface.removeConstraint('Disbursements', 'chk_amount_positive', { transaction }).catch(() => {});
      await queryInterface.removeIndex('Disbursements', 'unique_reference_id', { transaction }).catch(() => {});
      await queryInterface.removeColumn('Disbursements', 'referenceId', { transaction }).catch(() => {});

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};