const Notification = require('../models/Notification');
const { Op } = require('sequelize');

exports.createNotification = async (req, res) => {
    try {
        const payload = {
            role: req.body.role,
            type: req.body.type || 'info',
            message: req.body.message,
            actionUrl: req.body.actionUrl || null,
            // Only store targetUserId for FACULTY-targeted notifications
            targetUserId: req.body.role === 'FACULTY' ? (req.body.targetUserId || null) : null
        };
        const newNotif = await Notification.create(payload);
        res.status(201).json({ success: true, data: newNotif });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.id;

        let whereClause = { role: role };

        if (role === 'FACULTY') {
            // Show only notifications targeted at THIS specific faculty user
            // OR notifications with no targetUserId (legacy global ones - handled gracefully)
            whereClause = {
                role: 'FACULTY',
                [Op.or]: [
                    { targetUserId: userId },
                    // Don't show old notifications that had no target - they belong to someone else
                    // (We skip null targetUserId for FACULTY to prevent leakage)
                ]
            };
        }
        // For ADMIN, all admin notifications are global (no user scoping needed)

        const options = { 
            order: [['createdAt', 'DESC']],
            where: whereClause,
            limit: 50
        };
        const notifications = await Notification.findAll(options);
        
        const mapped = notifications.map(n => ({
            id: n._id,
            time: n.createdAt,
            read: n.readRaw,
            role: n.role,
            type: n.type,
            message: n.message,
            actionUrl: n.actionUrl
        }));

        res.status(200).json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const notif = await Notification.findByPk(req.params.id);
        if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
        notif.readRaw = true;
        await notif.save();
        res.status(200).json({ success: true, data: notif });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
