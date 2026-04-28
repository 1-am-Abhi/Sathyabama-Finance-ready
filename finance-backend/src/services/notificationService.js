const { Op, Sequelize } = require('sequelize');
const Notification = require('../models/Notification');
const User = require('../models/User');

const emitNotification = (notification) => {
    if (!notification?.userId || !global.io) {
        return;
    }

    const payload = notification.toJSON ? notification.toJSON() : notification;
    try {
        global.io.to(String(payload.userId)).emit('notification', payload);
        global.io.to(String(payload.userId)).emit('notifications:update', {
            userId: String(payload.userId),
            notificationId: payload._id || payload.id,
        });
    } catch (err) {
        console.error('[Socket Error]', err);
    }
};

/**
 * Service to handle creation of notifications across the system
 */
class NotificationService {
    /**
     * Create a notification for a specific user
     */
    static async create(userId, title, message, type = 'INFO', relatedId = null) {
        if (!userId) {
            throw new Error('userId is required for notification');
        }
        console.log(`[NotificationService] Creating ${type} for user ${userId}: ${title}`);
        const notification = await Notification.create({
            userId,
            role: null,
            title,
            message,
            type,
            relatedId,
            isRead: false
        });
        emitNotification(notification);
        console.log(`[NotificationService] SUCCESS: Created notification ${notification._id}`);
        return notification;
    }

    /**
     * Notify all users with a specific role (Admin/Finance).
     *
     * ⚠️  PostgreSQL ENUM columns do NOT support ILIKE / ~~ operators.
     *     Using Op.iLike on an ENUM column throws:
     *       "ERROR: operator does not exist: user_role ~~* unknown"
     *     which cascades into HTTP 500 on every endpoint that triggers a
     *     notification (fund-requests, finance/disbursements, etc.).
     *
     * ✅  Fix: cast the column to TEXT via Sequelize.fn('LOWER', ...) and
     *     compare against a lowercased literal — works on both PG and SQLite.
     */
    static async notifyRole(role, title, message, type = 'INFO', relatedId = null) {
        console.log(`[NotificationService] Broadcasting ${type} to role ${role}: ${title}`);

        const roleLower = (role || '').toLowerCase();

        const users = await User.findAll({
            where: Sequelize.where(
                Sequelize.fn('LOWER', Sequelize.col('role')),
                roleLower
            ),
            attributes: ['_id'],
        });

        if (!users.length) {
            console.warn(`[NotificationService] No users found with role "${role}" — skipping notification`);
            return [];
        }

        console.log(`[NotificationService] Creating ${users.length} notifications for role ${role}`);

        const notificationEntries = users.map((user) => ({
            userId: user._id || user.id,
            role,
            title,
            message,
            type,
            relatedId,
            isRead: false,
        }));

        const created = await Notification.bulkCreate(notificationEntries);
        created.forEach((notification) => emitNotification(notification));
        console.log(`[NotificationService] SUCCESS: Bulk created ${created.length} notifications`);
        return created;
    }
    /**
     * Convenience alias: createNotification(userId, title, message)
     * Matches the required helper signature in the spec.
     */
    static async createNotification(userId, title, message) {
        return NotificationService.create(userId, title, message, 'INFO', null);
    }

    /**
     * Notify the faculty member who owns a fund request.
     * Reads userId → facultyId from the request object so callers don't need to
     * duplicate that lookup.
     */
    static async notifyFaculty(fundRequest, title, message, type = 'INFO', relatedId = null) {
        const recipientId = fundRequest.userId || fundRequest.facultyId;
        return NotificationService.create(recipientId, title, message, type, relatedId);
    }
}

module.exports = NotificationService;
