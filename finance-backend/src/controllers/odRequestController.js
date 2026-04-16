const { serverError } = require("../utils/controllerError");
const ODRequest = require('../models/ODRequest');
const AcademicMetric = require('../models/AcademicMetric');
const { Op } = require('sequelize');

const createODRequest = async (req, res) => {
    try {
        console.log('Creating OD Request. User:', req.user?.name, 'Dept:', req.user?.department);
        console.log('Payload:', req.body);
        
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
        res.status(201).json({ success: true, data: newRequest });
    } catch (error) {
        console.error('OD Submission Error:', error);
        return serverError(res, error);
    }
};

const getODRequests = async (req, res) => {
    try {
        let options = { order: [['createdAt', 'DESC']] };
        if (req.user.role === 'FACULTY') {
            options.where = { facultyId: req.user.id };
        }
        const requests = await ODRequest.findAll(options);
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        return serverError(res, error);
    }
};

const updateODRequestStatus = async (req, res) => {
    try {
        const od = await ODRequest.findByPk(req.params.id);
        if (!od) {
            return res.status(404).json({ success: false, message: 'OD Request not found' });
        }
        const userRole = (req.user.role || '').toUpperCase();
        
        if (userRole === 'FACULTY') {
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
            const cycle = '2023-24'; 
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

        res.status(200).json({ success: true, data: od });
    } catch (error) {
        return serverError(res, error);
    }
};

module.exports = {
    createODRequest,
    getODRequests,
    updateODRequestStatus
};

