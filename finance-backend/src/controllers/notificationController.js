const Notification = require('../models/Notification');
const { Op } = require('sequelize');

const normalizeType = (type = 'INFO') => String(type).trim().toUpperCase();

exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, role, targetUserId, relatedId, actionUrl } = req.body;

        const notification = await Notification.create({
            title: title || 'Notification',
            message,
            type: normalizeType(type),
            role: role || null,
            userId: targetUserId || null,
            relatedId: relatedId || actionUrl || null,
            createdBy: req.user?.name || 'System',
            isRead: false,
        });

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        console.error('Create Notification Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id || req.user._id;

        const notifications = await Notification.findAll({
            where: {
                userId,
            },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        if (notification.userId !== (req.user.id || req.user._id)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await notification.update({ isRead: true });

        res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        await Notification.update(
            { isRead: true },
            {
                where: {
                    userId,
                    isRead: false
                }
            }
        );

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
