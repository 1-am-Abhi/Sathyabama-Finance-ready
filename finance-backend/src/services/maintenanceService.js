const { Op } = require('sequelize');
const SystemJob = require('../models/SystemJob');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');
const AlertService = require('./alertService');

const MaintenanceService = {
    /**
     * Priority Aging (Starvation Prevention)
     * Finds jobs delayed for too long and increases their priority in the queue.
     * Bull doesn't easily aging existing jobs, so we re-add them with higher priority.
     */
    async preventStarvation() {
        const { notificationQueue } = require('./queueService');
        const jobs = await notificationQueue.getDelayed();
        
        let agingCount = 0;
        for (const job of jobs) {
            const age = Date.now() - job.timestamp;
            // If more than 10 minutes old and still delayed
            if (age > 600000) {
                const { type, payload, requestId } = job.data;
                await job.remove();
                await notificationQueue.add({ type, payload, requestId, aged: true }, {
                    priority: 1, // Max priority
                    jobId: job.opts.jobId
                });
                agingCount++;
            }
        }
        if (agingCount > 0) logger.info(`[HA] Aged ${agingCount} starving jobs to priority level 1.`);
        return agingCount;
    },

    async recoverStaleJobs() { /* ... existing ... */ },
    async archiveOldJobs() { /* ... existing ... */ }
};

module.exports = MaintenanceService;
