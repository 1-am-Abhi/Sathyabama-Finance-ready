const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { Revenue, User } = require('../models');
const { Op } = require('sequelize');
const { syncRevenueLedger } = require('../services/financePipelineService');
const NotificationService = require('../services/notificationService');
const { buildResearchCenterIncludeArray } = require('../utils/researchCenterSafety');
const { getCurrentFY, getFYRange } = require('../utils/fyUtils');
const { safeEmit } = require('../socketInstance');

const createRevenueRecord = asyncHandler(async (req, res) => {
    try {
        const { year, revenueSource, amountGenerated, details } = req.body;
        const userId = req.user.id || req.user._id;

        if (!revenueSource || !amountGenerated) {
            return res.status(400).json({ success: false, message: 'Revenue source and amount generated are required' });
        }

        const record = await Revenue.create({
            userId,
            year: year || new Date().getFullYear().toString(),
            revenueSource,
            amountGenerated: Number(amountGenerated) || 0,
            details,
            status: 'PENDING'
        });

        // NOTIFY: Admin about new revenue submission
        try {
            await NotificationService.notifyRole(
                'ADMIN',
                'New Revenue Submitted',
                `${req.user.name || 'A faculty member'} submitted a new revenue record for ₹${amountGenerated}.`,
                'INFO',
                '/admin/revenue'
            );
        } catch (notifErr) {
            logger.warn('[RevenueController] Notification failed:', notifErr.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Revenue record created successfully',
            data: record
        });
    } catch (err) {
        logger.error('[RevenueController] createRevenueRecord error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getMyRevenueRecords = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const records = await Revenue.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            success: true,
            data: records || []
        });
    } catch (err) {
        logger.error('[RevenueController] getMyRevenueRecords error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getRevenueSummary = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { year: queryYear, fy } = req.query;
        const currentFY = fy || getCurrentFY();
        const { startDate, endDate } = getFYRange(currentFY);

        const whereClause = { 
            userId,
            createdAt: { [Op.between]: [startDate, endDate] }
        };
        if (queryYear) {
            whereClause.year = queryYear;
        }

        const records = await Revenue.findAll({ where: whereClause });

        // Aggregate stats
        const summary = (records || []).reduce((acc, curr) => {
            const amount = parseFloat(curr.amountGenerated) || 0;
            acc.total += amount;
            
            const source = (curr.revenueSource || '').toLowerCase();
            if (source.includes('consultancy')) acc.consultancy += amount;
            else if (source.includes('events')) acc.events += amount;
            else if (source.includes('projects')) acc.projects += amount;
            else if (source.includes('industry')) acc.industry += amount;
            else if (source.includes('analysis')) acc.analysis += amount;
            else acc.other += amount;
            
            if (curr.growthRate) acc.growth = Number(curr.growthRate);
            if (curr.efficiency) acc.efficiency = Number(curr.efficiency);
            
            return acc;
        }, { 
            total: 0, consultancy: 0, events: 0, projects: 0, 
            industry: 0, analysis: 0, other: 0, 
            growth: 0, efficiency: 0 
        });

        return res.status(200).json({
            success: true,
            data: {
                summary: summary || {},
                records: records || []
            }
        });
    } catch (err) {
        logger.error('[RevenueController] getRevenueSummary error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const updateFinanceMetrics = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { growthRate, efficiency } = req.body;

        const record = await Revenue.findByPk(id);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        await record.update({ 
            growthRate: Number(growthRate) || record.growthRate, 
            efficiency: Number(efficiency) || record.efficiency 
        });

        return res.status(200).json({
            success: true,
            message: 'Finance metrics updated successfully',
            data: record
        });
    } catch (err) {
        logger.error('[RevenueController] updateFinanceMetrics error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getAllRevenueForVerification = asyncHandler(async (req, res) => {
    try {
        const fy = req.query.fy || getCurrentFY();
        const { startDate, endDate } = getFYRange(fy);

        const records = await Revenue.findAll({
            where: { 
                status: { [Op.in]: ['ADMIN_APPROVED', 'VERIFIED'] },
                createdAt: { [Op.between]: [startDate, endDate] }
            },
            include: [{ required: false, model: User, 
                as: 'User',
                attributes: ['name', 'department'],
                include: buildResearchCenterIncludeArray({ attributes: ['name'], required: false })
            }].filter(Boolean),
            order: [['createdAt', 'DESC']]
        });
        
        return res.status(200).json({ success: true, data: records || [] });
    } catch (err) {
        logger.error('[RevenueController] getAllRevenueForVerification error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const verifyRevenue = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { verifiedAmount, bankReference, remarks } = req.body;
        
        const record = await Revenue.findByPk(id);
        if (!record) return res.status(404).json({ success: false, message: 'Revenue record not found' });
        
        await record.update({
            status: 'VERIFIED',
            verifiedAmount: Number(verifiedAmount) || record.amountGenerated,
            bankReference: bankReference || record.bankReference,
            financeRemarks: remarks || record.financeRemarks,
            verifiedAt: new Date(),
            verifiedBy: req.user.id || req.user._id
        });

        try {
            await syncRevenueLedger(record, req.user);
        } catch (syncErr) {
            logger.error('[RevenueController] syncRevenueLedger failed:', syncErr.message);
        }

        safeEmit('finance', 'finance:update', {
            type: 'REVENUE_VERIFIED',
            timestamp: Date.now()
        });
        
        return res.status(200).json({ success: true, message: 'Revenue verified successfully', data: record });
    } catch (err) {
        logger.error('[RevenueController] verifyRevenue error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getAdminRevenueApprovals = asyncHandler(async (req, res) => {
    try {
        const fy = req.query.fy || getCurrentFY();
        const { startDate, endDate } = getFYRange(fy);

        const records = await Revenue.findAll({
            where: {
                createdAt: { [Op.between]: [startDate, endDate] }
            },
            include: [{ required: false, model: User, 
                as: 'User',
                attributes: ['name', 'department'],
                include: buildResearchCenterIncludeArray({ attributes: ['name'], required: false })
            }].filter(Boolean),
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({ success: true, data: records || [] });
    } catch (err) {
        logger.error('[RevenueController] getAdminRevenueApprovals error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const adminApproveRevenue = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        
        const record = await Revenue.findByPk(id);
        if (!record) return res.status(404).json({ success: false, message: 'Revenue record not found' });
        
        await record.update({
            status: status || 'ADMIN_APPROVED',
            adminRemarks: remarks || record.adminRemarks
        });

        // NOTIFY: Finance about new revenue to verify
        if ((status || 'ADMIN_APPROVED') === 'ADMIN_APPROVED') {
            try {
                const facultyUser = await User.findByPk(record.userId);
                await NotificationService.notifyRole(
                    'FINANCE_OFFICER',
                    'Revenue Awaiting Verification',
                    `Institutional income from ${facultyUser?.name || 'Faculty'} (₹${record.amountGenerated}) is approved by Admin and ready for finance verification.`,
                    'INFO',
                    '/finance/revenue-verification'
                );
            } catch (notifErr) {
                logger.warn('[RevenueController] Admin notification failed:', notifErr.message);
            }
        }

        safeEmit('finance', 'finance:update', {
            type: 'REVENUE_APPROVED',
            timestamp: Date.now()
        });
        
        return res.status(200).json({ success: true, message: 'Revenue admin status updated successfully', data: record });
    } catch (err) {
        logger.error('[RevenueController] adminApproveRevenue error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = {
    createRevenueRecord,
    getMyRevenueRecords,
    getRevenueSummary,
    updateFinanceMetrics,
    getAllRevenueForVerification,
    verifyRevenue,
    getAdminRevenueApprovals,
    adminApproveRevenue
};
