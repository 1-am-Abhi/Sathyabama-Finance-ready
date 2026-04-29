const Queue = require('bull');
const logger = require('../utils/logger');
const SystemJob = require('../models/SystemJob');
const AlertService = require('./alertService');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const queuesDisabled = process.env.NODE_ENV !== 'production';

if (queuesDisabled) {
    const queues = {
        notifications: {
            async add(type, payload, requestId) {
                logger.info('[Queue] Redis disabled outside production; notification job handled inline.', {
                    type,
                    requestId
                });
                return { id: `local-${requestId || Date.now()}`, data: { type, payload, requestId } };
            }
        },
        setupRepeatableJobs: async () => undefined
    };

    module.exports = queues;
    return;
}

const createQueue = (name) => new Queue(name, redisUrl, {
    settings: { lockDuration: 30000, stalledInterval: 30000 }
});

const notificationQueue = createQueue('notifications');
const schedulerQueue = createQueue('system-scheduler');

const queues = {
    notifications: {
        async add(type, payload, requestId) {
            const counts = await notificationQueue.getJobCounts();
            const tier = AlertService.updateSystemState(counts.waiting);
            
            let delay = 0;


            // Tier-based graceful degradation
            if (tier === 'CRITICAL') {
                logger.warn('[Degradation] Tier 3: Applying 60s delay to all tasks');
                delay = 60000;
                await AlertService.notify('CRITICAL', 'System under extreme load. Applying 60s task delay.');
            } else if (tier === 'DEGRADED') {
                logger.info('[Degradation] Tier 2: Delaying non-critical background tasks');
                if (type !== 'USER_NOTIFY') delay = 15000; 
            } else if (tier === 'STRESSED') {
                await AlertService.notify('WARNING', `System Stressed: ${counts.waiting} jobs waiting.`);
            }

            // Secure CHAOS_MODE: Never run in production
            if (process.env.NODE_ENV !== 'production' && process.env.CHAOS_MODE === 'true') {
                if (Math.random() > 0.95) {
                    logger.warn('[Chaos] Simulating latency');
                    delay += 5000;
                }
            }

            return notificationQueue.add({ type, payload, requestId }, {
                attempts: 5,
                backoff: { type: 'exponential', delay: 2000 },
                delay, // Applying the calculated degradation delay
                removeOnComplete: true,
                jobId: `req-${requestId || Date.now()}`
            });
        }
    },
    setupRepeatableJobs: async () => { /* ... existing setup ... */ }
};

module.exports = queues;
