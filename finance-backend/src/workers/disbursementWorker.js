const logger = require('../utils/logger');
const { Worker } = require("bullmq");
const { redisConnection, redisDisabled } = require("../config/redis");
const { executeDisbursementPipeline } = require("../services/financePipelineService");
const { FundRequest } = require("../models/FundRequest");
const User = require("../models/User");
const NotificationService = require("../services/notificationService");
const Project = require("../models/Project");
const Disbursement = require("../models/Disbursement");

if (redisDisabled) {
    logger.info('[Worker:disbursement] Redis disabled outside production; BullMQ worker not started.');
    module.exports = { disbursementWorker: null };
    return;
}

const disbursementWorker = new Worker(
  "disbursement",
  async (job) => {
    const { requestId, userId, payload, correlationId } = job.data;
    logger.info(`[Worker:disbursement] Processing job ${job.id} for request ${requestId}`);

    const request = await FundRequest.findByPk(requestId);
    if (!request) throw new Error(`FundRequest not found: ${requestId}`);

    const user = await User.findByPk(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const { request: updatedRequest, disbursement } = await executeDisbursementPipeline(
        request,
        payload,
        user,
        { correlationId }
    );

    // Notifications
    const notifyFacultyMsg = `Installment #${disbursement?.installmentNumber || 1} (₹${Number(payload.amount || updatedRequest.requestedAmount).toLocaleString()}) for '${updatedRequest.projectTitle}' has been disbursed.`;
    try {
        await NotificationService.notifyFaculty(
            updatedRequest,
            'Funds Disbursed',
            notifyFacultyMsg,
            'SUCCESS',
            '/faculty/request-funds'
        );
    } catch (notifyErr) {
        logger.error(`[Worker:disbursement] Faculty notification failed:`, notifyErr.message);
    }

    try {
        await NotificationService.notifyRole(
            'ADMIN',
            'Disbursement Completed',
            `Finance disbursed installment #${disbursement?.installmentNumber || 1} for '${updatedRequest.projectTitle}'.`,
            'INFO',
            '/admin/fund-requests'
        );
    } catch (adminNotifyErr) {
        logger.error(`[Worker:disbursement] Admin notification failed:`, adminNotifyErr.message);
    }

    // Force websocket update
    if (global.io) {
        global.io.emit('finance:update', {
            type: 'DISBURSEMENT_COMPLETED',
            projectTitle: updatedRequest.projectTitle,
            amount: payload.amount || updatedRequest.requestedAmount
        });
    }

    return { success: true, disbursementId: disbursement?._id || disbursement?.id };
  },
  { connection: redisConnection }
);

disbursementWorker.on('failed', (job, err) => {
    logger.error(`[CRITICAL] Job ${job?.id} failed in disbursementWorker:`, err);
});

module.exports = { disbursementWorker };
