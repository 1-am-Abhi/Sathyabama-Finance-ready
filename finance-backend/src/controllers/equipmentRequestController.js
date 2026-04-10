const EquipmentRequest = require('../models/EquipmentRequest');
const NotificationService = require('../services/notificationService');

exports.createEquipmentRequest = async (req, res) => {
    try {
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
        res.status(201).json({ success: true, data: newReq });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEquipmentRequests = async (req, res) => {
    try {
        let options = { order: [['createdAt', 'DESC']] };
        if (req.user.role === 'FACULTY') {
            options.where = { facultyId: req.user.id };
        }
        const reqs = await EquipmentRequest.findAll(options);
        res.status(200).json({ success: true, data: reqs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateEquipmentStatus = async (req, res) => {
    try {
        const eq = await EquipmentRequest.findByPk(req.params.id);
        if (!eq) return res.status(404).json({ success: false, message: 'Not found' });
        const { status, approvedAmount, adminRemarks } = req.body;
        if (status) eq.status = status;
        if (approvedAmount !== undefined) eq.approvedAmount = approvedAmount;
        if (adminRemarks !== undefined) eq.adminRemarks = adminRemarks;
        await eq.save();
        res.status(200).json({ success: true, data: eq });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
