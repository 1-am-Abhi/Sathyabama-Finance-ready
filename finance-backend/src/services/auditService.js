const fs = require('fs');
const path = require('path');
const { AuditLog } = require('../models');
const crypto = require('crypto');

const LOG_FILE_PATH = path.join(__dirname, '../../logs/disbursements.audit.log');

/**
 * Logs a structured financial audit entry.
 * Dual targets: Database (AuditLog) and Filesystem (disbursements.audit.log).
 */
const logDisbursementAudit = async (data) => {
    try {
        const {
            projectId,
            amount,
            previousTotalUsed,
            newTotalUsed,
            remainingBudget,
            isInstallment,
            userId,
            action = 'DISBURSEMENT_EXECUTED',
            entityType = 'FundRequest',
            entityId,
            metadata = {}
        } = data;

        const timestamp = new Date().toISOString();

        const auditEntry = {
            projectId,
            amount,
            previousTotalUsed,
            newTotalUsed,
            remainingBudget,
            isInstallment,
            userId,
            entityId,
            action,
            timestamp,
            ...metadata
        };

        // Compute SHA256 hash for immutability
        const auditHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(auditEntry))
            .digest('hex');

        // 1. Write to Database
        await AuditLog.create({
            userId: userId || 0,
            action,
            entityType,
            entityId: String(entityId),
            meta: {
                amount,
                transactionId: metadata.transactionId || metadata.bankReference
            },
            metadata: auditEntry,
            hash: auditHash
        });

        // 2. Write to Filesystem (Immutable Trail)
        const logLine = JSON.stringify(auditEntry) + '\n';
        fs.appendFileSync(LOG_FILE_PATH, logLine, 'utf8');

        console.log(`[AuditService] Disbursement log successfully recorded for Entity: ${entityId}`);
        return true;
    } catch (error) {
        console.error('[AuditService] Failed to record audit log:', error.message);
        // We do not throw to avoid breaking the core transaction if logging fails, 
        // but in high-integrity systems, we might want to block.
        return false;
    }
};

module.exports = {
    logDisbursementAudit
};
