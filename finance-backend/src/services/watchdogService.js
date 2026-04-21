const { Disbursement, Project, Centre } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

const RECON_LOG_PATH = path.join(__dirname, '../../logs/reconciliation.error.log');

/**
 * Reconciliation Watchdog
 * Ensures Global Used === SUM(Centres Used)
 */
const verifyFinancialParity = async (context = 'AUTO_WATCHDOG') => {
    try {
        const { getAdminDashboardData } = require('./pipelineMetricsService');
        
        // 1. Fetch current dashboard state (Filtered by current FY)
        const dashboard = await getAdminDashboardData();
        const { used: globalUsed, centres } = dashboard.data;

        // 2. Sum up centre disbursements
        const sumCentresUsed = (centres || []).reduce((sum, c) => sum + Number(c.disbursed || 0), 0);

        const discrepancy = Math.abs(globalUsed - sumCentresUsed);

        if (discrepancy > 0.01) {
            const errorMsg = `[CRITICAL PARITY ERROR] ${new Date().toISOString()} | Context: ${context} | Global Used: ${globalUsed} | Centres Sum: ${sumCentresUsed} | Discrepancy: ${discrepancy}\n`;
            
            console.error(errorMsg);
            
            // Log to dedicated reconciliation error file
            fs.appendFileSync(RECON_LOG_PATH, errorMsg, 'utf8');

            return {
                parity: false,
                globalUsed,
                sumCentresUsed,
                discrepancy
            };
        }

        console.log(`[Watchdog] Financial parity verified perfectly for ${context}. Delta: ${discrepancy}`);
        return { parity: true, discrepancy };
    } catch (error) {
        console.error('[Watchdog] Reciliation check failed:', error.message);
        return { parity: false, error: error.message };
    }
};

module.exports = {
    verifyFinancialParity
};
