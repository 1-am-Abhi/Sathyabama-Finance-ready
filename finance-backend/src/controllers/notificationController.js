const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { Notification, User } = require('../models');
const NotificationService = require('../services/notificationService');
const { findUserByRuntimeId, getUserUuid, isUuid } = require('../utils/userIdentity');

const normalizeType = (type = 'INFO') => String(type).trim().toUpperCase();

const getAuthUserId = (req) => String(req.user?._id || req.user?.id || '');

const resolveNotificationUserId = async (value, req) => {
    const candidate = value || req.user?._id || req.user?.id || req.user?.userId;
    if (isUuid(String(candidate || ''))) return String(candidate);

    const user = await findUserByRuntimeId(User, candidate);
    return getUserUuid(user);
};

const canAccessUserNotifications = (req, userId) =>
    String(userId || '') === getAuthUserId(req) ||
    String(req.user?.role || '').toUpperCase() === 'ADMIN';

const createNotification = asyncHandler(async (req, res) => {
    const { title, message, type, role, targetUserId, relatedId, actionUrl } = req.body;
    logger.info(`[NotificationController] Request to create notification:`, { title, role, targetUserId });

    if (!targetUserId && role) {
        logger.info(`[NotificationController] Broadcasting to role: ${role}`);
        let notifications;
        try {
            notifications = await NotificationService.notifyRole(
                role,
                title || 'Notification',
                message,
                normalizeType(type),
                relatedId || actionUrl || null
            );
        } catch (error) {
            if (error.message.includes('No users found')) {
                return res.status(404).json({ success: false, message: 'No users found for role' });
            }
            throw error;
        }

        if (!notifications || notifications.length === 0) {
            return res.status(404).json({ success: false, message: 'No users found for role' });
        }

        return res.status(201).json({ success: true, data: notifications });
    }

    const target = await resolveNotificationUserId(targetUserId, req);
    if (!target) {
        return res.status(400).json({ success: false, message: 'A valid UUID user target is required' });
    }
    logger.info(`[NotificationController] Creating for single user: ${target}`);
    
    const notification = await NotificationService.create(
        target,
        title || 'Notification',
        message,
        normalizeType(type),
        relatedId || actionUrl || null
    );

    res.status(201).json({ success: true, data: notification || {} });
});

// Normalize a notification row into a stable, safe shape. Exposes BOTH id and
// _id (the model PK is _id, but the frontend reads id), coerces enum/boolean
// fields, and never throws — a malformed row returns null and is filtered out.
const normalizeNotification = (row) => {
    try {
        const n = row && row.toJSON ? row.toJSON() : row;
        if (!n) return null;
        const id = n._id || n.id || null;
        return {
            ...n,
            id,
            _id: id,
            type: normalizeType(n.type),
            title: n.title || '',
            message: n.message || '',
            isRead: !!n.isRead,
            createdAt: n.createdAt || null,
        };
    } catch (e) {
        return null;
    }
};

// Notifications load on EVERY page. This endpoint must NEVER return 500 — a
// failure here breaks the whole app and triggers a retry storm. On any error it
// returns an empty list (logged) so the UI degrades gracefully.
const getNotifications = asyncHandler(async (req, res) => {
    try {
        const userId = await resolveNotificationUserId(req.params.userId, req);
        // No resolvable user (e.g. not yet authenticated on the client): return an
        // empty list rather than a 4xx so the notification bell never errors.
        if (!userId) {
            return res.status(200).json({ success: true, data: [] });
        }

        if (!canAccessUserNotifications(req, userId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized', data: [] });
        }

        const whereClause = { userId };
        if (req.query.isRead !== undefined) {
            whereClause.isRead = req.query.isRead === 'true';
        }

        // Single indexed query (no includes → no N+1), bounded by limit.
        const rows = await Notification.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: Number(req.query.limit) || 50,
        });

        const data = (rows || []).map(normalizeNotification).filter(Boolean);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        logger.error('[getNotifications] failed — returning empty list', {
            message: err.message,
            code: err.parent?.code,
            userIdParam: req.params.userId,
            authUser: req.user?.id || req.user?._id,
        });
        return res.status(200).json({ success: true, data: [] });
    }
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
    const userId = await resolveNotificationUserId(req.params.userId, req);
    if (!userId) {
        return res.status(400).json({ success: false, message: 'A valid user id is required' });
    }

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
