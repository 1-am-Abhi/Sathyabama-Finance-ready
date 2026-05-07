'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const safeAddColumn = async (table, column, definition) => {
        const schema = await queryInterface.describeTable(table).catch(() => ({}));
        if (!schema[column]) {
          await queryInterface.addColumn(table, column, definition, { transaction });
          console.log(`✅ Added ${column} to ${table}`);
        } else {
          console.log(`⚠️ ${column} already exists in ${table}, skipping`);
        }
      };

      const safeAddIndex = async (table, fields, options) => {
        try {
          await queryInterface.addIndex(table, fields, { ...options, transaction });
        } catch {
          console.log(`⚠️ Index ${options.name} exists or columns missing, skipping`);
        }
      };

      const disbSchema = await queryInterface.describeTable('Disbursements').catch(() => ({}));
      const ledgerSchema = await queryInterface.describeTable('Ledgers').catch(() => ({}));

      await safeAddColumn('FundRequests', 'requestId', {
        type: Sequelize.STRING,
        allowNull: true
      });

      await safeAddColumn('Disbursements', 'referenceId', {
        type: Sequelize.STRING,
        allowNull: true
      });

      const hasBankReference = !!disbSchema.bankReference;
      const hasTransactionId = !!disbSchema.transactionId;
      const hasChequeNumber = !!disbSchema.chequeNumber;
      const hasId = !!disbSchema.id;
      const hasAmount = !!disbSchema.amount;
      const hasFundRequestId = !!disbSchema.fundRequestId;

      let fillExpr = `NULLIF("referenceId", '')`;

      if (hasBankReference) fillExpr += `, NULLIF("bankReference", '')`;
      if (hasTransactionId) fillExpr += `, NULLIF("transactionId", '')`;
      if (hasChequeNumber) fillExpr += `, NULLIF("chequeNumber", '')`;
      if (hasId) fillExpr += `, "id"::text`;

      await queryInterface.sequelize.query(`
        UPDATE "Disbursements"
        SET "referenceId" = COALESCE(${fillExpr})
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

      if (hasAmount) {
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
      } else {
        console.log('⚠️ amount missing in Disbursements, skipping amount hardening');
      }

      if (hasFundRequestId) {
        await safeAddIndex('Disbursements', ['fundRequestId'], {
          name: 'idx_disbursements_fund_request_id_final'
        });
      } else {
        console.log('⚠️ fundRequestId missing in Disbursements, skipping index');
      }

      await safeAddColumn('Ledgers', 'disbursementId', {
        type: Sequelize.UUID,
        allowNull: true
      });

      if ((await queryInterface.describeTable('Ledgers').catch(() => ({}))).disbursementId) {
        await safeAddIndex('Ledgers', ['disbursementId'], {
          name: 'idx_ledger_disbursement'
        });
      }

      if (ledgerSchema.metadata) {
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
      } else {
        console.log('⚠️ metadata missing in Ledgers, skipping ledger check constraint');
      }

      await transaction.commit();
      console.log('✅ final-disbursement-hardening migration complete');
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