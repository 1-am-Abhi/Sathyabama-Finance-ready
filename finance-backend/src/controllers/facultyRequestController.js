const asyncHandler = require('../utils/asyncHandler');
const { FacultyRequest, AuditLog, User } = require('../models');
const NotificationService = require('../services/notificationService');

const createRequest = asyncHandler(async (req, res) => {
    const payload = {
        ...req.body,
        createdBy: req.user._id || req.user.id,
        createdByLegacy: req.user.legacyId || null,
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

    res.status(201).json({ success: true, data: request || {} });
});

const getAdminRequests = asyncHandler(async (req, res) => {
    const requests = await FacultyRequest.findAll({
        where: { currentStage: 'ADMIN', status: 'PENDING' },
        include: [{ required: false, model: User, as: 'user', attributes: ['name', 'department'] }],
        order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: requests || [] });
});

const approveAdminRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await FacultyRequest.findByPk(id);
    if (!request) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

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

    res.status(200).json({ success: true, data: request || {} });
});

const rejectAdminRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await FacultyRequest.findByPk(id);
    if (!request) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    await request.update({ status: 'REJECTED' });

    await AuditLog.create({
        userId: req.user.id || req.user._id,
        action: 'REQUEST_REJECTED',
        entityType: 'FacultyRequest',
        entityId: String(request.id)
    });

    res.status(200).json({ success: true, data: request || {} });
});

const getFinanceRequests = asyncHandler(async (req, res) => {
     const requests = await FacultyRequest.findAll({
        where: { currentStage: 'FINANCE', status: 'APPROVED' },
        include: [{ required: false, model: User, as: 'user', attributes: ['name', 'department'] }],
        order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: requests || [] });
});

const disburseFinanceRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await FacultyRequest.findByPk(id);
    if (!request) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

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

    res.status(200).json({ success: true, data: request || {} });
});

module.exports = {
    createRequest,
    getAdminRequests,
    approveAdminRequest,
    rejectAdminRequest,
    getFinanceRequests,
    disburseFinanceRequest
};
