const { serverError } = require("../utils/controllerError");
const Revenue = require('../models/Revenue');
const User = require('../models/User');
const { Op } = require('sequelize');
const { syncRevenueLedger } = require('../services/financePipelineService');
const NotificationService = require('../services/notificationService');

exports.createRevenueRecord = async (req, res) => {
    try {
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
            data: record
        });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.getMyRevenueRecords = async (req, res) => {
    try {
        const userId = req.user.id;
        const records = await Revenue.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: records
        });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.getRevenueSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { year } = req.query;

        const whereClause = { userId };
        if (year) {
            whereClause.year = year;
        }

        const records = await Revenue.findAll({ where: whereClause });

        // Aggregate stats
        const summary = records.reduce((acc, curr) => {
            const amount = parseFloat(curr.amountGenerated);
            acc.total += amount;
            
            const source = curr.revenueSource.toLowerCase();
            if (source.includes('consultancy')) acc.consultancy += amount;
            else if (source.includes('events')) acc.events += amount;
            else if (source.includes('projects')) acc.projects += amount;
            else if (source.includes('industry')) acc.industry += amount;
            else if (source.includes('analysis')) acc.analysis += amount;
            else acc.other += amount;
            
            // Capture latest growth/efficiency from Finance fields (if any)
            if (curr.growthRate) acc.growth = curr.growthRate;
            if (curr.efficiency) acc.efficiency = curr.efficiency;
            
            return acc;
        }, { 
            total: 0, consultancy: 0, events: 0, projects: 0, 
            industry: 0, analysis: 0, other: 0, 
            growth: 0, efficiency: 0 // Removed mock fallbacks
        });

        res.status(200).json({
            success: true,
            data: {
                summary,
                records
            }
        });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.updateFinanceMetrics = async (req, res) => {
    try {
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
            data: record
        });
    } catch (error) {
        return serverError(res, error);
    }
};

// Revenue Verification: Finance gets all consultancy income for verification (ONLY Admin Approved ones)
exports.getAllRevenueForVerification = async (req, res) => {
    try {
        const records = await Revenue.findAll({
            where: { status: { [Op.in]: ['ADMIN_APPROVED', 'VERIFIED'] } },
            include: [{ 
                model: User, 
                as: 'User',
                attributes: ['name', 'department'],
                include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }]
            }],
            order: [['createdAt', 'DESC']]
        });
        
        res.status(200).json({ success: true, data: records });
    } catch (error) {
        return serverError(res, error);
    }
};

// Verify Revenue: Finance marks the inflow as verified
exports.verifyRevenue = async (req, res) => {
    try {
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
        
        res.status(200).json({ success: true, message: 'Revenue verified successfully', data: record });
    } catch (error) {
        return serverError(res, error);
    }
};

// Admin approves revenue to release to Finance
exports.getAdminRevenueApprovals = async (req, res) => {
    try {
        const records = await Revenue.findAll({
            include: [{ 
                model: User, 
                as: 'User',
                attributes: ['name', 'department'],
                include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }]
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: records });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.adminApproveRevenue = async (req, res) => {
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
        
        res.status(200).json({ success: true, message: 'Revenue admin status updated successfully', data: record });
    } catch (error) {
        return serverError(res, error);
    }
};
