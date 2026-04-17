const asyncHandler = require('../utils/asyncHandler');
const { Notification } = require('../models');
const NotificationService = require('../services/notificationService');

const normalizeType = (type = 'INFO') => String(type).trim().toUpperCase();

const getAuthUserId = (req) => String(req.user?.id || req.user?._id || '');

const canAccessUserNotifications = (req, userId) =>
    String(userId || '') === getAuthUserId(req) ||
    String(req.user?.role || '').toUpperCase() === 'ADMIN';

const createNotification = asyncHandler(async (req, res) => {
    const { title, message, type, role, targetUserId, relatedId, actionUrl } = req.body;
    console.log(`[NotificationController] Request to create notification:`, { title, role, targetUserId });

    if (!targetUserId && role) {
        console.log(`[NotificationController] Broadcasting to role: ${role}`);
        const notifications = await NotificationService.notifyRole(
            role,
            title || 'Notification',
            message,
            normalizeType(type),
            relatedId || actionUrl || null
        );

        return res.status(201).json({ success: true, data: notifications || [] });
    }

    const target = targetUserId || req.user?.id || req.user?._id;
    console.log(`[NotificationController] Creating for single user: ${target}`);
    
    const notification = await NotificationService.create(
        target,
        title || 'Notification',
        message,
        normalizeType(type),
        relatedId || actionUrl || null
    );

    res.status(201).json({ success: true, data: notification || {} });
});

const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user.id || req.user._id;

    if (!canAccessUserNotifications(req, userId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const notifications = await Notification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 50
    });

    res.status(200).json({ success: true, data: notifications || [] });
});

const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!canAccessUserNotifications(req, notification.userId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await notification.update({ isRead: true });

    res.status(200).json({ success: true, message: 'Marked as read', data: notification || {} });
});

const markAllAsRead = asyncHandler(async (req, res) => {
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
});

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead
};

