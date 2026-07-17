const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { ODRequest, AcademicMetric } = require('../models');
const { getCurrentCycle } = require('../utils/fyUtils');
const { Op } = require('sequelize');

const createODRequest = asyncHandler(async (req, res) => {
    logger.info('Creating OD Request. User:', req.user?.name, 'Dept:', req.user?.department);
    logger.info('Payload:', req.body);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (req.body.startDate < tomorrowStr) {
        return res.status(400).json({ 
            success: false, 
            message: 'On-Duty requests must be submitted at least one day in advance. Same-day applications are not permitted.' 
        });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicate = await ODRequest.findOne({
        where: {
            facultyId: req.user.id || req.user._id,
            odType: req.body.type,
            startDate: req.body.startDate,
            createdAt: { [Op.gte]: fiveMinutesAgo }
        }
    });

    if (duplicate) {
        return res.status(400).json({ 
            success: false, 
            message: 'A duplicate OD request was already submitted in the last 5 minutes. Please wait.' 
        });
    }

    const payload = {
        facultyId: req.user.id || req.user._id,
        facultyName: req.user.name || 'Faculty Member',
        department: req.user.department || 'RESEARCH',
        odType: req.body.type,
        purpose: req.body.purpose,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        days: req.body.days,
        isFullDay: req.body.isFullDay !== undefined ? req.body.isFullDay : true,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        status: 'PENDING'
    };
    const newRequest = await ODRequest.create(payload);
    res.status(201).json({ success: true, data: newRequest || {} });
});

const getODRequests = asyncHandler(async (req, res) => {
    let options = { order: [['createdAt', 'DESC']] };
    if (req.user.role === 'FACULTY') {
        options.where = { facultyId: req.user.id };
    }
    const requests = await ODRequest.findAll(options);
    res.status(200).json({ success: true, data: requests || [] });
});

const updateODRequestStatus = asyncHandler(async (req, res) => {
    const od = await ODRequest.findByPk(req.params.id);
    if (!od) {
        return res.status(404).json({ success: false, message: 'OD Request not found' });
    }
    const userRole = (req.user.role || '').toUpperCase();
    const actorIds = [req.user._id, req.user.id, req.user.userId].filter(Boolean).map(String);

    if (userRole === 'FACULTY') {
        // Ownership guard (IDOR): a faculty may only modify their own OD request,
        // and only the proof fields — never the approval status.
        if (!actorIds.includes(String(od.facultyId))) {
            return res.status(403).json({ success: false, message: 'You can only update your own OD requests' });
        }
        if (req.body.proofUploaded !== undefined) od.proofUploaded = req.body.proofUploaded;
        if (req.body.proofData !== undefined) od.proofData = req.body.proofData;
    } else {
        if (req.body.status) od.status = req.body.status;
        if (req.body.proofUploaded !== undefined) od.proofUploaded = req.body.proofUploaded;
        if (req.body.proofData !== undefined) od.proofData = req.body.proofData;
        if (req.body.remarks !== undefined) od.remarks = req.body.remarks;
        if (req.body.proofStatus !== undefined) {
            od.proofStatus = req.body.proofStatus;
            if (req.body.proofStatus === 'REJECTED') {
                od.proofUploaded = false; 
            }
        }
        if (req.body.proofRemarks !== undefined) od.proofRemarks = req.body.proofRemarks;
    }
    
    await od.save();

    if (od.status === 'APPROVED') {
        const cycle = getCurrentCycle(); 
        let metrics = await AcademicMetric.findOne({ where: { facultyId: od.facultyId, cycle } });
        if (!metrics) {
            metrics = await AcademicMetric.create({ facultyId: od.facultyId, cycle });
        }

        const type = od.odType?.toUpperCase();
        if (type === 'EXAM DUTY') {
            await metrics.increment('examDuty');
        } else if (type === 'INTERNATIONAL VISIT' || od.purpose?.toLowerCase().includes('international')) {
            const currentVal = metrics.internationalVisit || '';
            const newVal = currentVal ? `${currentVal}, Approved ${od.odType}` : `Approved ${od.odType}`;
            await metrics.update({ internationalVisit: newVal });
        }
    }

    res.status(200).json({ success: true, data: od || {} });
});

module.exports = {
    createODRequest,
    getODRequests,
    updateODRequestStatus
};

