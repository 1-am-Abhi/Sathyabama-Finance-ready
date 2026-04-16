const { cache } = require('./redisService');
const logger = require('../utils/logger');

/**
 * Enterprise Feature Flag Service
 * - Backed by Redis
 * - Audit Trail (who/when/why)
 */
const FeatureFlags = {
    async isEnabled(flag) {
        const config = await cache.get(`feature:${flag}`);
        return config?.enabled === true;
    },

    async set(flag, enabled, updatedBy, reason) {
        const config = {
            enabled,
            updatedBy,
            updatedAt: new Date().toISOString(),
            reason
        };
        
        await cache.set(`feature:${flag}`, config, 0); // No expiry for flags
        
        logger.audit(`[FeatureFlag] ${flag} set to ${enabled}`, {
            flag,
            enabled,
            actor: updatedBy,
            rational: reason
        });
        
        return config;
    },

    async getAudit(flag) {
        return await cache.get(`feature:${flag}`);
    }
};

module.exports = FeatureFlags;
