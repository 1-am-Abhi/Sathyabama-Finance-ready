const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');

const normalizeType = (type = 'INFO') => String(type).trim().toUpperCase();

const getAuthUserId = (req) => String(req.user?.id || req.user?._id || '');

const canAccessUserNotifications = (req, userId) =>
    String(userId || '') === getAuthUserId(req) ||
    String(req.user?.role || '').toUpperCase() === 'ADMIN';

exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, role, targetUserId, relatedId, actionUrl } = req.body;

        if (!targetUserId && role) {
            const notifications = await NotificationService.notifyRole(
                role,
                title || 'Notification',
                message,
                normalizeType(type),
                relatedId || actionUrl || null
            );

            return res.status(201).json({ success: true, data: notifications || [] });
        }

        const notification = await NotificationService.create(
            targetUserId || req.user?.id || req.user?._id,
            title || 'Notification',
            message,
            normalizeType(type),
            relatedId || actionUrl || null
        );

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        console.error('Create Notification Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id || req.user._id;

        if (!canAccessUserNotifications(req, userId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

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

        if (!canAccessUserNotifications(req, notification.userId)) {
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
        const userId = req.params.userId || req.user.id || req.user._id;

        if (!canAccessUserNotifications(req, userId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

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
