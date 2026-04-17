const asyncHandler = require('../utils/asyncHandler');
const { EquipmentRequest } = require('../models');
const NotificationService = require('../services/notificationService');

const createEquipmentRequest = asyncHandler(async (req, res) => {
    const payload = {
        ...req.body,
        facultyId: req.user.id,
        facultyName: req.user.name,
        status: 'Pending'
    };
    const newReq = await EquipmentRequest.create(payload);
    await NotificationService.notifyRole(
        'ADMIN',
        'New Equipment Request',
        `${req.user.name} requested equipment funding for "${newReq.equipmentName}".`,
        'INFO',
        '/admin/equipment-requests'
    );
    res.status(201).json({ success: true, data: newReq || {} });
});

const getEquipmentRequests = asyncHandler(async (req, res) => {
    let options = { order: [['createdAt', 'DESC']] };
    if (req.user.role === 'FACULTY') {
        options.where = { facultyId: req.user.id };
    }
    const reqs = await EquipmentRequest.findAll(options);
    res.status(200).json({ success: true, data: reqs || [] });
});

const updateEquipmentStatus = asyncHandler(async (req, res) => {
    const eq = await EquipmentRequest.findByPk(req.params.id);
    if (!eq) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    const { status, approvedAmount, adminRemarks } = req.body;
    if (status) eq.status = status;
    if (approvedAmount !== undefined) eq.approvedAmount = approvedAmount;
    if (adminRemarks !== undefined) eq.adminRemarks = adminRemarks;
    await eq.save();

    // NOTIFY: Finance about equipment disbursement
    if (status === 'Approved') {
        await NotificationService.notifyRole(
            'FINANCE_OFFICER',
            'Equipment Fund Disbursement',
            `Admin approved equipment funding for "${eq.equipmentName}" (₹${Number(approvedAmount || eq.approvedAmount || 0).toLocaleString()}). Action required in Finance Queue.`,
            'INFO',
            '/finance/equipment-disbursements'
        );

        // NOTIFY: Faculty
        await NotificationService.create(
            eq.facultyId,
            'Equipment Request Approved',
            `Your funding request for "${eq.equipmentName}" has been approved by Admin and moved to Finance.`,
            'SUCCESS',
            '/faculty/equipment/dashboard'
        );
    }
    res.status(200).json({ success: true, data: eq || {} });
});

module.exports = {
    createEquipmentRequest,
    getEquipmentRequests,
    updateEquipmentStatus
};

