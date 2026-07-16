const cron = require('node-cron');
const { Op } = require('sequelize');
const { FundRequest, Disbursement } = require('../models');
const logger = require('../utils/logger');
const NotificationService = require('../services/notificationService');
const { NON_REVERSED_DISBURSEMENT_WHERE } = require('../constants/financeConstants');
const {
    getProofDeadlineDays,
    normalizeDocs,
    evaluateProofs,
} = require('../utils/installmentProof');

const OVERDUE_FLAG = 'PROOF_OVERDUE_FLAG';

/**
 * Scan disbursed installments whose utilization proofs are still incomplete past
 * the proof deadline and alert the faculty + finance (deadline / auto-hold).
 *
 * "Hold" here is enforced structurally: an unverified installment already blocks
 * the next installment request (see createFundRequest gating). This job surfaces
 * the overdue state so it isn't silent — it notifies once per request (idempotent
 * via a PROOF_OVERDUE_FLAG marker in FundRequest.documents) and logs a summary.
 */
const runProofDeadlineScan = async () => {
    const days = getProofDeadlineDays();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Installments that have been disbursed (non-reversed) on/before the cutoff.
    const dueDisbursements = await Disbursement.findAll({
        where: {
            disbursedAt: { [Op.lte]: cutoff },
            fundRequestId: { [Op.ne]: null },
            ...NON_REVERSED_DISBURSEMENT_WHERE,
        },
        attributes: ['fundRequestId'],
        group: ['fundRequestId'],
        raw: true,
    });

    const requestIds = [...new Set(dueDisbursements.map((d) => d.fundRequestId).filter(Boolean))];
    if (!requestIds.length) return { scanned: 0, flagged: 0 };

    const requests = await FundRequest.findAll({
        where: {
            _id: { [Op.in]: requestIds },
            status: { [Op.notIn]: ['REJECTED', 'CANCELLED'] },
        },
    });

    let flagged = 0;
    for (const request of requests) {
        const docs = normalizeDocs(request.documents);
        const alreadyFlagged = docs.some((d) => d && d.type === OVERDUE_FLAG);
        const proofs = evaluateProofs(docs);

        // Skip if proofs already complete or we've already alerted for this one.
        if (proofs.ok || alreadyFlagged) continue;

        request.documents = [...docs, { type: OVERDUE_FLAG, flaggedAt: new Date(), missing: proofs.missing }];
        await request.save();
        flagged += 1;

        try {
            await NotificationService.create(
                request.userId || request.facultyId,
                'Utilization Proofs Overdue',
                `Installment #${request.installmentNumber} of '${request.projectTitle}' was disbursed over ${days} days ago and its proofs are still incomplete (${proofs.missing.join(', ')}). The next installment is on hold until Finance verifies your utilization.`,
                'ALERT',
                '/faculty/request-funds'
            );
            await NotificationService.notifyRole(
                'FINANCE_OFFICER',
                'Overdue Utilization Proofs',
                `Installment #${request.installmentNumber} of '${request.projectTitle}' is past the ${days}-day proof deadline.`,
                'ALERT',
                '/finance/disbursements'
            );
        } catch (e) {
            logger.warn('[proofDeadlineJob] notification failed:', e.message);
        }
    }

    return { scanned: requests.length, flagged };
};

const initProofDeadlineJob = () => {
    // Daily at 02:00.
    cron.schedule('0 2 * * *', async () => {
        logger.info('[Cron] Starting proof-deadline scan...');
        try {
            const result = await runProofDeadlineScan();
            logger.info(`[Cron] Proof-deadline scan complete: scanned=${result.scanned} flagged=${result.flagged}`);
        } catch (err) {
            logger.error('[Cron] Proof-deadline scan failed:', err.message);
        }
    });
};

module.exports = { initProofDeadlineJob, runProofDeadlineScan };
