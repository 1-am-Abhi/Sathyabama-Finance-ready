'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // TASK 3 — DB-level constraint: amount must be positive and sane
        try {
            await queryInterface.sequelize.query(`
                ALTER TABLE "Disbursements"
                ADD CONSTRAINT chk_disbursement_positive_amount
                CHECK ("amount" > 0 AND "amount" < 1000000000);
            `);
            console.log('[Migration] Added positive amount constraint on Disbursements');
        } catch (e) {
            console.log('[Migration] Constraint chk_disbursement_positive_amount may already exist:', e.message);
        }

        // TASK 3 — Alter amount column to NUMERIC(15,2) if still FLOAT
        try {
            await queryInterface.sequelize.query(`
                ALTER TABLE "Disbursements"
                ALTER COLUMN "amount" TYPE NUMERIC(15,2) USING "amount"::NUMERIC(15,2);
            `);
            console.log('[Migration] Altered Disbursements.amount to NUMERIC(15,2)');
        } catch (e) {
            console.log('[Migration] Amount column type already correct:', e.message);
        }

        // TASK 4 — Index: disbursements.fundRequestId (fast SUM lookups)
        try {
            await queryInterface.addIndex('Disbursements', ['fundRequestId'], {
                name: 'idx_disbursements_fund_request_id',
                concurrently: false,
            });
        } catch (e) {
            console.log('[Migration] Index idx_disbursements_fund_request_id may exist:', e.message);
        }

        // TASK 4 — Index: disbursements.projectId (fast project-level SUM)
        try {
            await queryInterface.addIndex('Disbursements', ['projectId'], {
                name: 'idx_disbursements_project_id',
                concurrently: false,
            });
        } catch (e) {
            console.log('[Migration] Index idx_disbursements_project_id may exist:', e.message);
        }

        // TASK 4 — Index: disbursements.disbursedAt (fast history queries)
        try {
            await queryInterface.addIndex('Disbursements', ['disbursedAt'], {
                name: 'idx_disbursements_disbursed_at',
                concurrently: false,
            });
        } catch (e) {
            console.log('[Migration] Index idx_disbursements_disbursed_at may exist:', e.message);
        }

        // TASK 4 — Index: FundRequests.projectId
        try {
            await queryInterface.addIndex('FundRequests', ['projectId'], {
                name: 'idx_fund_requests_project_id',
                concurrently: false,
            });
        } catch (e) {
            console.log('[Migration] Index idx_fund_requests_project_id may exist:', e.message);
        }

        // TASK 4 — Index: FundRequests.status (queue filter)
        try {
            await queryInterface.addIndex('FundRequests', ['status'], {
                name: 'idx_fund_requests_status',
                concurrently: false,
            });
        } catch (e) {
            console.log('[Migration] Index idx_fund_requests_status may exist:', e.message);
        }

        // TASK 4 — Composite index: AuditLogs(entityId, action) for approval lookups
        try {
            await queryInterface.addIndex('AuditLogs', ['entityId', 'action'], {
                name: 'idx_audit_logs_entity_action',
                concurrently: false,
            });
        } catch (e) {
            console.log('[Migration] Index idx_audit_logs_entity_action may exist:', e.message);
        }
    },

    down: async (queryInterface) => {
        const dropIndex = async (table, name) => {
            try { await queryInterface.removeIndex(table, name); } catch (e) { /* ignore */ }
        };
        const dropConstraint = async (table, name) => {
            try {
                await queryInterface.sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}";`);
            } catch (e) { /* ignore */ }
        };

        await dropConstraint('Disbursements', 'chk_disbursement_positive_amount');
        await dropIndex('Disbursements', 'idx_disbursements_fund_request_id');
        await dropIndex('Disbursements', 'idx_disbursements_project_id');
        await dropIndex('Disbursements', 'idx_disbursements_disbursed_at');
        await dropIndex('FundRequests', 'idx_fund_requests_project_id');
        await dropIndex('FundRequests', 'idx_fund_requests_status');
        await dropIndex('AuditLogs', 'idx_audit_logs_entity_action');
    }
};
