const cron = require('node-cron');
const { Ledger, LedgerSnapshot, sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * Institutional Financial Snapshot Scheduler
 * Automatically creates daily and monthly checkpoints of the ledger hash chain.
 */
const initSnapshotJobs = () => {
    // 1. Daily Snapshot (Midnight)
    cron.schedule('0 0 * * *', async () => {
        logger.info('[Cron] Starting automated daily financial snapshot...');
        try {
            await createAutomatedSnapshot('DAILY_AUTO_CHECKPOINT');
        } catch (err) {
            logger.error('[Cron] Daily snapshot failed:', err.message);
        }
    });

    // 2. Monthly Snapshot (1st of every month at 1 AM)
    cron.schedule('0 1 1 * *', async () => {
        logger.info('[Cron] Starting automated monthly financial snapshot...');
        try {
            await createAutomatedSnapshot('MONTHLY_AUDIT_SNAPSHOT');
        } catch (err) {
            logger.error('[Cron] Monthly snapshot failed:', err.message);
        }
    });
};

const createAutomatedSnapshot = async (name) => {
    const lastEntry = await Ledger.findOne({ order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    if (!lastEntry) return;

    const stats = await Ledger.findOne({
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
            [sequelize.fn('SUM', sequelize.col('debit')), 'totalDebit'],
            [sequelize.fn('SUM', sequelize.col('credit')), 'totalCredit']
        ],
        raw: true
    });

    await LedgerSnapshot.create({
        snapshotName: `${name}_${new Date().toISOString().split('T')[0]}`,
        lastLedgerId: lastEntry.id,
        lastHash: lastEntry.hash,
        totalEntries: parseInt(stats.totalCount),
        totalDebit: parseFloat(stats.totalDebit || 0),
        totalCredit: parseFloat(stats.totalCredit || 0),
        metadata: { automated: true }
    });
    
    logger.info(`[Cron] Automated snapshot '${name}' created successfully.`);
};

module.exports = { initSnapshotJobs };
