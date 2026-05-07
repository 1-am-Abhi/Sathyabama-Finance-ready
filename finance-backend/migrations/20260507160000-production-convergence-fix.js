'use strict';

async function tableExists(queryInterface, tableName, transaction) {
  const rows = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = :tableName
    LIMIT 1
    `,
    {
      replacements: { tableName },
      type: queryInterface.sequelize.QueryTypes.SELECT,
      transaction
    }
  );
  return rows.length > 0;
}

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const rows = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = :tableName
      AND column_name = :columnName
    LIMIT 1
    `,
    {
      replacements: { tableName, columnName },
      type: queryInterface.sequelize.QueryTypes.SELECT,
      transaction
    }
  );
  return rows.length > 0;
}

async function indexExists(queryInterface, tableName, indexName, transaction) {
  const rows = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = :tableName
      AND indexname = :indexName
    LIMIT 1
    `,
    {
      replacements: { tableName, indexName },
      type: queryInterface.sequelize.QueryTypes.SELECT,
      transaction
    }
  );
  return rows.length > 0;
}

async function addColumnIfMissing(queryInterface, tableName, columnName, definition, transaction) {
  const exists = await columnExists(queryInterface, tableName, columnName, transaction);
  if (!exists) {
    await queryInterface.addColumn(tableName, columnName, definition, { transaction });
  }
}

async function addIndexIfMissing(queryInterface, tableName, fields, options, transaction) {
  const exists = await indexExists(queryInterface, tableName, options.name, transaction);
  if (!exists) {
    await queryInterface.addIndex(tableName, fields, { ...options, transaction });
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
        { transaction }
      );

      const hasDocuments = await tableExists(queryInterface, 'Documents', transaction);
      if (!hasDocuments) {
        await queryInterface.createTable(
          'Documents',
          {
            id: {
              type: Sequelize.UUID,
              primaryKey: true,
              allowNull: false,
              defaultValue: Sequelize.literal('gen_random_uuid()')
            },
            facultyId: {
              type: Sequelize.UUID,
              allowNull: true
            },
            facultyName: {
              type: Sequelize.STRING,
              allowNull: true
            },
            fileName: {
              type: Sequelize.STRING,
              allowNull: false
            },
            fileType: {
              type: Sequelize.STRING,
              allowNull: true
            },
            documentType: {
              type: Sequelize.STRING,
              allowNull: false,
              defaultValue: 'GENERAL'
            },
            projectName: {
              type: Sequelize.STRING,
              allowNull: true
            },
            description: {
              type: Sequelize.TEXT,
              allowNull: true
            },
            fileData: {
              type: Sequelize.TEXT,
              allowNull: true
            },
            status: {
              type: Sequelize.STRING,
              allowNull: false,
              defaultValue: 'PENDING'
            },
            adminRemarks: {
              type: Sequelize.STRING,
              allowNull: true
            },
            verifiedAt: {
              type: Sequelize.DATE,
              allowNull: true
            },
            organizationId: {
              type: Sequelize.STRING,
              allowNull: false,
              defaultValue: 'ORG_1'
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('NOW()')
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('NOW()')
            }
          },
          { transaction }
        );
      }

      if (await columnExists(queryInterface, 'Documents', 'facultyId', transaction)) {
        await addIndexIfMissing(
          queryInterface,
          'Documents',
          ['facultyId'],
          { name: 'idx_documents_faculty_id' },
          transaction
        );
      }

      if (await columnExists(queryInterface, 'Documents', 'organizationId', transaction)) {
        await addIndexIfMissing(
          queryInterface,
          'Documents',
          ['organizationId'],
          { name: 'idx_documents_org' },
          transaction
        );
      }

      const hasPFMS = await tableExists(queryInterface, 'PFMSTransactions', transaction);
      if (!hasPFMS) {
        await queryInterface.createTable(
          'PFMSTransactions',
          {
            id: {
              type: Sequelize.UUID,
              primaryKey: true,
              allowNull: false,
              defaultValue: Sequelize.literal('gen_random_uuid()')
            },
            projectId: {
              type: Sequelize.UUID,
              allowNull: false
            },
            pfmsProjectId: {
              type: Sequelize.STRING,
              allowNull: false
            },
            govtOrganization: {
              type: Sequelize.STRING,
              allowNull: false
            },
            sanctionOrderNo: {
              type: Sequelize.STRING,
              allowNull: false
            },
            sanctionOrderDate: {
              type: Sequelize.DATEONLY,
              allowNull: true
            },
            installmentNumber: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 1
            },
            amountReleased: {
              type: Sequelize.DECIMAL(15, 2),
              allowNull: false,
              defaultValue: 0
            },
            creditDate: {
              type: Sequelize.DATEONLY,
              allowNull: true
            },
            utrNumber: {
              type: Sequelize.STRING,
              allowNull: true
            },
            ucStatus: {
              type: Sequelize.STRING,
              allowNull: false,
              defaultValue: 'PENDING'
            },
            organizationId: {
              type: Sequelize.STRING,
              allowNull: false,
              defaultValue: 'ORG_1'
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('NOW()')
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('NOW()')
            }
          },
          { transaction }
        );
      }

      if (await columnExists(queryInterface, 'PFMSTransactions', 'projectId', transaction)) {
        await addIndexIfMissing(
          queryInterface,
          'PFMSTransactions',
          ['projectId'],
          { name: 'idx_pfms_project_id' },
          transaction
        );
      }

      if (await columnExists(queryInterface, 'PFMSTransactions', 'organizationId', transaction)) {
        await addIndexIfMissing(
          queryInterface,
          'PFMSTransactions',
          ['organizationId'],
          { name: 'idx_pfms_org' },
          transaction
        );
      }

      if (await tableExists(queryInterface, 'Disbursements', transaction)) {
        await addColumnIfMissing(queryInterface, 'Disbursements', 'fundRequestId', {
          type: Sequelize.UUID,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'disbursedAt', {
          type: Sequelize.DATE,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'installmentNumber', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 1
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'disbursedBy', {
          type: Sequelize.UUID,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'disbursedByName', {
          type: Sequelize.STRING,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'bankReference', {
          type: Sequelize.STRING,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'transactionId', {
          type: Sequelize.STRING,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'chequeNumber', {
          type: Sequelize.STRING,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'bankName', {
          type: Sequelize.STRING,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'remarks', {
          type: Sequelize.TEXT,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'paymentMode', {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'CHEQUE'
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'referenceId', {
          type: Sequelize.STRING,
          allowNull: true
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'organizationId', {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'ORG_1'
        }, transaction);

        await addColumnIfMissing(queryInterface, 'Disbursements', 'proofUrl', {
          type: Sequelize.STRING,
          allowNull: true
        }, transaction);

        if (await columnExists(queryInterface, 'Disbursements', 'disbursedAt', transaction)) {
          await queryInterface.sequelize.query(
            `UPDATE "Disbursements" SET "disbursedAt" = "createdAt" WHERE "disbursedAt" IS NULL AND "createdAt" IS NOT NULL;`,
            { transaction }
          );
        }

        if (await columnExists(queryInterface, 'Disbursements', 'organizationId', transaction)) {
          await queryInterface.sequelize.query(
            `UPDATE "Disbursements" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;`,
            { transaction }
          );
        }

        if (await columnExists(queryInterface, 'Disbursements', 'fundRequestId', transaction)) {
          await addIndexIfMissing(
            queryInterface,
            'Disbursements',
            ['fundRequestId'],
            { name: 'idx_disbursements_fund_request_id_prod_fix' },
            transaction
          );
        }

        if (await columnExists(queryInterface, 'Disbursements', 'projectId', transaction)) {
          await addIndexIfMissing(
            queryInterface,
            'Disbursements',
            ['projectId'],
            { name: 'idx_disbursements_project_id_prod_fix' },
            transaction
          );
        }

        if (await columnExists(queryInterface, 'Disbursements', 'disbursedAt', transaction)) {
          await addIndexIfMissing(
            queryInterface,
            'Disbursements',
            ['disbursedAt'],
            { name: 'idx_disbursements_disbursed_at_prod_fix' },
            transaction
          );
        }

        if (await columnExists(queryInterface, 'Disbursements', 'organizationId', transaction)) {
          await addIndexIfMissing(
            queryInterface,
            'Disbursements',
            ['organizationId'],
            { name: 'idx_disbursements_org_prod_fix' },
            transaction
          );
        }
      }

      if (await tableExists(queryInterface, 'FundRequests', transaction)) {
        await addColumnIfMissing(queryInterface, 'FundRequests', 'organizationId', {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'ORG_1'
        }, transaction);

        if (await columnExists(queryInterface, 'FundRequests', 'organizationId', transaction)) {
          await queryInterface.sequelize.query(
            `UPDATE "FundRequests" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;`,
            { transaction }
          );
        }
      }
    });
  },

  async down() {
    // Intentionally non-destructive for production safety.
  }
};