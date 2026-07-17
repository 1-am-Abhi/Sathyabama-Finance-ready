const logger = require('../utils/logger');
const { Worker } = require("bullmq");
const { redisConnection, redisDisabled } = require("../config/redis");
const { executeDisbursementPipeline } = require("../services/financePipelineService");
const { FundRequest, User } = require("../models");
const { findUserByRuntimeId } = require("../utils/userIdentity");
const { idMatch } = require("../utils/idMatch");

if (redisDisabled) {
    logger.info('[Worker:disbursement] Redis disabled outside production; BullMQ worker not started.');
    module.exports = { disbursementWorker: null };
    return;
}

// Production consumer for the BullMQ "disbursement" queue.
//
// This is intentionally a THIN wrapper around executeDisbursementPipeline, which
// performs every financial mutation, audit-log write, notification and real-time
// socket emit inside a single DB transaction. It is behaviourally identical to the
// synchronous (non-production) shim in queues/disbursementQueue.js, so disbursements
// behave the same in dev and prod. Do NOT add notifications/emits here — the pipeline
// already owns them, and duplicating them here double-notifies faculty.
const disbursementWorker = new Worker(
  "disbursement",
  async (job) => {
    const { requestId, userId, payload, correlationId } = job.data;
    logger.info(`[Worker:disbursement] Processing job ${job.id} for request ${requestId}`);

    // Match the shim's lookup exactly: requestId is FundRequest._id (from getRecordId).
    const request = await FundRequest.findOne({ where: idMatch(requestId) });
    if (!request) throw new Error(`FundRequest not found: ${requestId}`);

    const user = await findUserByRuntimeId(User, userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const result = await executeDisbursementPipeline(request, payload, user, {
        correlationId: correlationId || `WORKER-${job.id}`
    });

    return { success: true, disbursementId: result?.disbursement?._id || result?.disbursement?.id };
  },
  { connection: redisConnection }
);

disbursementWorker.on('failed', (job, err) => {
    logger.error(`[CRITICAL] Job ${job?.id} failed in disbursementWorker:`, err);
});

disbursementWorker.on('completed', (job) => {
    logger.info(`[Worker:disbursement] Job ${job?.id} completed.`);
});

logger.info('[Worker:disbursement] BullMQ worker started and listening on "disbursement" queue.');

module.exports = { disbursementWorker };
