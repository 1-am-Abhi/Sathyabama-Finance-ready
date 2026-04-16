const logger = require('../utils/logger');
const { redis } = require('./redisService');

let currentSystemTier = 'HEALTHY';

/**
 * Enterprise Reliability Service 
 * Includes Hysteresis and Escalation logic.
 */
const AlertService = {
    async notify(severity, message, context = {}) {
        const suppressionKey = `alert_suppress:${severity}:${message.replace(/\s+/g, '_')}`;
        const countKey = `${suppressionKey}:count`;

        const isSuppressed = await redis.get(suppressionKey);
        
        if (isSuppressed) {
            const count = await redis.incr(countKey);
            // ESCALATION: If suppressed 10 times, break silence with an escalation alert
            if (count % 10 === 0) {
                logger.error(`[ESCALATION] Repeated Error (${count}x): ${message}`, context);
                // Here you would dispatch to a high-priority Slack channel or PagerDuty
            }
            return;
        }

        await redis.set(suppressionKey, '1', 'EX', 300);
        await redis.set(countKey, '1', 'EX', 300);
        
        logger.warn(`[ALERT] ${message}`, context);
    },

    /**
     * Hysteresis-Aware System Tiers
     * Prevents "flapping" between states by using a buffer window.
     */
    updateSystemState(waitingCount) {
        const thresholds = {
            STRESSED: { enter: 150, exit: 80 },
            DEGRADED: { enter: 550, exit: 450 },
            CRITICAL: { enter: 1100, exit: 900 }
        };

        let nextTier = 'HEALTHY';

        if (currentSystemTier === 'HEALTHY' && waitingCount >= thresholds.STRESSED.enter) nextTier = 'STRESSED';
        else if (currentSystemTier === 'STRESSED') {
            if (waitingCount >= thresholds.DEGRADED.enter) nextTier = 'DEGRADED';
            else if (waitingCount <= thresholds.STRESSED.exit) nextTier = 'HEALTHY';
            else nextTier = 'STRESSED';
        } else if (currentSystemTier === 'DEGRADED') {
            if (waitingCount >= thresholds.CRITICAL.enter) nextTier = 'CRITICAL';
            else if (waitingCount <= thresholds.DEGRADED.exit) nextTier = 'STRESSED';
            else nextTier = 'DEGRADED';
        } else if (currentSystemTier === 'CRITICAL') {
            if (waitingCount <= thresholds.CRITICAL.exit) nextTier = 'DEGRADED';
            else nextTier = 'CRITICAL';
        }

        currentSystemTier = nextTier;
        return currentSystemTier;
    },

    getSystemStatus() {
        return {
            status: currentSystemTier === 'CRITICAL' ? 'DEGRADED' : 'HEALTHY',
            loadTier: currentSystemTier,
            operational: currentSystemTier !== 'CRITICAL',
            message: currentSystemTier === 'HEALTHY' ? 'All systems operational' : 'System under high load. Processing may be slightly delayed.'
        };
    }

};

module.exports = AlertService;
