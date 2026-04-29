const logger = require('../utils/logger');
const { Disbursement, Project, FundRequest, Centre, ResearchCenter } = require('../models');
const { Op } = require('sequelize');
const { toNumber } = require('./pipelineMetricsService');
const { isResearchCenterFailure } = require('../utils/researchCenterSafety');

const ResearchCenterModel = ResearchCenter || Centre;

/**
 * AI-Ready Analytics Service
 */
const detectAnomalies = async (disbursementData) => {
    const { projectId, amount } = disbursementData;
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const project = await Project.findByPk(projectId);
    if (!project) return { anomaly: false };

    // 1. Rule: Amount > 30% of total sanctioned budget
    const percentOfBudget = (amount / toNumber(project.sanctionedBudget)) * 100;
    if (percentOfBudget > 30) {
        return { 
            anomaly: true, 
            reason: `High-value transaction: ${percentOfBudget.toFixed(1)}% of total project budget.` 
        };
    }

    // 2. Rule: Rate Limit (Multiple disbursements in 1 minute for same project)
    const recentCount = await Disbursement.count({
        where: {
            projectId,
            createdAt: { [Op.gte]: oneMinuteAgo }
        }
    });
    if (recentCount > 0) {
        return { 
            anomaly: true, 
            reason: "High frequency: Multiple disbursements detected within 60 seconds for the same project." 
        };
    }

    return { anomaly: false };
};

const generateForecastDataset = async (days = 90) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const disbursements = await Disbursement.findAll({
        where: {
            disbursedAt: { [Op.gte]: startDate }
        },
        attributes: ['disbursedAt', 'amount', 'projectId'],
        order: [['disbursedAt', 'ASC']]
    });

    return disbursements.map(d => ({
        date: d.disbursedAt,
        amount: toNumber(d.amount),
        projectId: d.projectId
    }));
};

const computeHeuristicInsights = async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // 1. Overall Burn Rate
    const recentSpending = await Disbursement.sum('amount', {
        where: { disbursedAt: { [Op.gte]: thirtyDaysAgo } }
    }) || 0;
    
    const avgDailySpend = toNumber(recentSpending) / 30;

    // 2. Fund Exhaustion Estimates by Centre
    let centres = [];
    try {
        if (ResearchCenterModel) {
            centres = await ResearchCenterModel.findAll();
        }
    } catch (error) {
        if (!isResearchCenterFailure(error)) {
            throw error;
        }
        logger.warn('[AnalyticsService] ResearchCenters unavailable, continuing with empty centre set.');
        centres = [];
    }
    const insights = [];

    for (const centre of centres) {
        // Fetch budget vs usage for this centre (simplified check)
        const projects = await Project.findAll({ where: { centreId: centre._id || centre.id } });
        const centreBudget = projects.reduce((sum, p) => sum + toNumber(p.sanctionedBudget), 0);
        const centreUsed = projects.reduce((sum, p) => sum + toNumber(p.releasedBudget), 0);
        const remaining = Math.max(0, centreBudget - centreUsed);

        if (avgDailySpend > 0 && remaining > 0) {
            const daysRemaining = Math.floor(remaining / (avgDailySpend / (centres.length || 1))); // Distributed avg
            if (daysRemaining < 30) {
                insights.push(`${centre.name} will exhaust its allocated project funds in approximately ${daysRemaining} days at current spending rates.`);
            }
        }
        
        // 3. Underutilization Check
        projects.forEach(p => {
            const usageRatio = toNumber(p.releasedBudget) / toNumber(p.sanctionedBudget);
            if (usageRatio < 0.1 && new Date(p.createdAt) < thirtyDaysAgo) {
                insights.push(`Project "${p.title}" is significantly underutilizing its budget (less than 10% disbursed).`);
            }
        });
    }

    // 4. Trend Analysis
    const prevThirtyDaysStart = new Date(thirtyDaysAgo.getTime() - (30 * 24 * 60 * 60 * 1000));
    const previousSpending = await Disbursement.sum('amount', {
        where: { 
            disbursedAt: { 
                [Op.between]: [prevThirtyDaysStart, thirtyDaysAgo] 
            } 
        }
    }) || 0;

    if (previousSpending > 0) {
        const increase = ((recentSpending - previousSpending) / previousSpending) * 100;
        if (Math.abs(increase) > 10) {
            insights.push(`Spending has ${increase > 0 ? 'increased' : 'decreased'} by ${Math.abs(increase).toFixed(1)}% compared to the previous 30-day period.`);
        }
    }

    if (!centres.length && !insights.length) {
        insights.push('Research center insights are temporarily unavailable; dashboard analytics are running in fallback mode.');
    }

    return {
        avgDailySpend: toNumber(avgDailySpend),
        insights: insights.slice(0, 10), // Return top 10 relevant insights
        period: "Last 30 Days"
    };
};

module.exports = {
    detectAnomalies,
    generateForecastDataset,
    computeHeuristicInsights
};
