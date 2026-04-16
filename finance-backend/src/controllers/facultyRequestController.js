const { FacultyRequest, AuditLog, User } = require('../models');
const NotificationService = require('../services/notificationService');
const { serverError } = require('../utils/controllerError');

const createRequest = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            createdBy: req.user.id || req.user._id,
            status: 'PENDING',
            currentStage: 'ADMIN' // Promotes to ADMIN on submit
        };

        // File uploads mapped directly
        if (req.files) {
            if (req.files.bill) payload.billFile = req.files.bill[0].path;
            if (req.files.proposal) payload.proposalFile = req.files.proposal[0].path;
        }

        if (payload.participants && typeof payload.participants === 'string') {
            payload.participants = JSON.parse(payload.participants);
        }

        const request = await FacultyRequest.create(payload);

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'REQUEST_CREATED',
            entityType: 'FacultyRequest',
            entityId: String(request.id)
        });

        await NotificationService.notifyRole(
            'ADMIN',
            'New Faculty Request',
            `A new request (${request.requestType}) has been submitted for review.`,
            'INFO',
            '/admin/faculty-requests'
        );

        res.status(201).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

const getAdminRequests = async (req, res) => {
    try {
        const requests = await FacultyRequest.findAll({
            where: { currentStage: 'ADMIN', status: 'PENDING' },
            include: [{ model: User, as: 'user', attributes: ['name', 'department'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        return serverError(res, error);
    }
};

const approveAdminRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await FacultyRequest.findByPk(id);
        if (!request) return res.status(404).json({ success: false, message: 'Not found' });

        await request.update({ status: 'APPROVED', currentStage: 'FINANCE' });

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'REQUEST_APPROVED',
            entityType: 'FacultyRequest',
            entityId: String(request.id),
            metadata: { approvedAmount: request.approvedAmount }
        });

        await NotificationService.notifyRole(
            'FINANCE_OFFICER',
            'Faculty Request Approved',
            `${request.requestType} request approved by Admin. Pending disbursement!`,
            'INFO',
            '/finance/faculty-requests'
        );

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

const rejectAdminRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await FacultyRequest.findByPk(id);
        if (!request) return res.status(404).json({ success: false, message: 'Not found' });

        await request.update({ status: 'REJECTED' });

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'REQUEST_REJECTED',
            entityType: 'FacultyRequest',
            entityId: String(request.id)
        });

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

const getFinanceRequests = async (req, res) => {
    try {
         const requests = await FacultyRequest.findAll({
            where: { currentStage: 'FINANCE', status: 'APPROVED' },
            include: [{ model: User, as: 'user', attributes: ['name', 'department'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        return serverError(res, error);
    }
};

const disburseFinanceRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await FacultyRequest.findByPk(id);
        if (!request) return res.status(404).json({ success: false, message: 'Not found' });

        await request.update({ status: 'DISBURSED' });

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'REQUEST_DISBURSED',
            entityType: 'FacultyRequest',
            entityId: String(request.id),
            metadata: { disbursedAmount: request.approvedAmount }
        });

        await NotificationService.create(
            request.createdBy,
            'Funds Disbursed',
            `Your ${request.requestType} request has been disbursed!`,
            'SUCCESS',
            '/faculty/dashboard'
        );

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

module.exports = {
    createRequest,
    getAdminRequests,
    approveAdminRequest,
    rejectAdminRequest,
    getFinanceRequests,
    disburseFinanceRequest
};

