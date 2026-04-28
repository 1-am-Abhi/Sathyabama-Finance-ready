const asyncHandler = require('../utils/asyncHandler');
const { Revenue, User } = require('../models');
const { Op } = require('sequelize');
const { syncRevenueLedger } = require('../services/financePipelineService');
const NotificationService = require('../services/notificationService');
const { buildResearchCenterIncludeArray } = require('../utils/researchCenterSafety');
const { getCurrentFY, getFYRange } = require('../utils/fyUtils');
const { safeEmit } = require('../socketInstance');

const createRevenueRecord = asyncHandler(async (req, res) => {
    const { year, revenueSource, amountGenerated, details } = req.body;
    const userId = req.user.id;

    const record = await Revenue.create({
        userId,
        year,
        revenueSource,
        amountGenerated,
        details
    });

    // NOTIFY: Admin about new revenue submission
    await NotificationService.notifyRole(
        'ADMIN',
        'New Revenue Submitted',
        `${req.user.name} submitted a new revenue record for ₹${amountGenerated}.`,
        'INFO',
        '/admin/revenue'
    );

    res.status(201).json({
        success: true,
        message: 'Revenue record created successfully',
        data: record || {}
    });
});

const getMyRevenueRecords = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const records = await Revenue.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
        success: true,
        data: records || []
    });
});

const getRevenueSummary = asyncHandler(async (req, res) => {
    const userId = req.user.id;
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
        
        if (curr.growthRate) acc.growth = curr.growthRate;
        if (curr.efficiency) acc.efficiency = curr.efficiency;
        
        return acc;
    }, { 
        total: 0, consultancy: 0, events: 0, projects: 0, 
        industry: 0, analysis: 0, other: 0, 
        growth: 0, efficiency: 0 
    });

    res.status(200).json({
        success: true,
        data: {
            summary: summary || {},
            records: records || []
        }
    });
});

const updateFinanceMetrics = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { growthRate, efficiency } = req.body;

    const record = await Revenue.findByPk(id);
    if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found' });
    }

    await record.update({ growthRate, efficiency });

    res.status(200).json({
        success: true,
        message: 'Finance metrics updated successfully',
        data: record || {}
    });
});

const getAllRevenueForVerification = asyncHandler(async (req, res) => {
    const fy = req.query.fy || getCurrentFY();
    const { startDate, endDate } = getFYRange(fy);

    const records = await Revenue.findAll({
        where: { 
            status: { [Op.in]: ['ADMIN_APPROVED', 'VERIFIED'] },
            createdAt: { [Op.between]: [startDate, endDate] }
        },
        include: [{ 
            model: User, 
            as: 'User',
            attributes: ['name', 'department'],
            include: buildResearchCenterIncludeArray({ attributes: ['name'], required: false })
        }],
        order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({ success: true, data: records || [] });
});

const verifyRevenue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { verifiedAmount, bankReference, remarks } = req.body;
    
    const record = await Revenue.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: 'Revenue record not found' });
    
    await record.update({
        status: 'VERIFIED',
        verifiedAmount: verifiedAmount || record.amountGenerated,
        bankReference: bankReference || record.bankReference,
        financeRemarks: remarks || record.financeRemarks,
        verifiedAt: new Date(),
        verifiedBy: req.user.id
    });

    await syncRevenueLedger(record, req.user);

    safeEmit('finance', 'finance:update', {
        type: 'PFMS_UPDATE',
        timestamp: Date.now()
    });
    
    res.status(200).json({ success: true, message: 'Revenue verified successfully', data: record || {} });
});

const getAdminRevenueApprovals = asyncHandler(async (req, res) => {
    const fy = req.query.fy || getCurrentFY();
    const { startDate, endDate } = getFYRange(fy);

    const records = await Revenue.findAll({
        where: {
            createdAt: { [Op.between]: [startDate, endDate] }
        },
        include: [{ 
            model: User, 
            as: 'User',
            attributes: ['name', 'department'],
            include: buildResearchCenterIncludeArray({ attributes: ['name'], required: false })
        }],
        order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: records || [] });
});

const adminApproveRevenue = asyncHandler(async (req, res) => {
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
        const User = require('../models/User');
        const facultyUser = await User.findByPk(record.userId);
        await NotificationService.notifyRole(
            'FINANCE_OFFICER',
            'Revenue Awaiting Verification',
            `Institutional income from ${facultyUser?.name || 'Faculty'} (₹${record.amountGenerated}) is approved by Admin and ready for finance verification.`,
            'INFO',
            '/finance/revenue-verification'
        );
    }

    safeEmit('finance', 'finance:update', {
        type: 'PFMS_UPDATE',
        timestamp: Date.now()
    });
    
    res.status(200).json({ success: true, message: 'Revenue admin status updated successfully', data: record || {} });
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
