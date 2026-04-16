const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Service to handle creation of notifications across the system
 */
class NotificationService {
    /**
     * Create a notification for a specific user
     */
    static async create(userId, title, message, type = 'INFO', relatedId = null) {
        try {
            if (!userId) {
                return null;
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
            console.log(`[NotificationService] SUCCESS: Created notification ${notification._id}`);
            return notification;
        } catch (error) {
            console.error('[NotificationService] Error creating notification:', error);
            // Non-blocking failure
            return null;
        }
    }

    /**
     * Notify all users with a specific role (Admin/Finance).
     * Uses Op.iLike for case-insensitive matching so 'FINANCE_OFFICER',
     * 'finance_officer', 'Finance_Officer' all resolve correctly.
     */
    static async notifyRole(role, title, message, type = 'INFO', relatedId = null) {
        try {
            console.log(`[NotificationService] Broadcasting ${type} to role ${role}: ${title}`);

            const users = await User.findAll({
                where: {
                    role: {
                        [Op.iLike]: role   // case-insensitive match
                    }
                },
                attributes: ['_id'],
            });

            if (!users.length) {
                console.warn(`[NotificationService] No users found with role "${role}" — notification NOT delivered.`);
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
            console.log(`[NotificationService] SUCCESS: Bulk created ${created.length} notifications`);
            return created;
        } catch (error) {
            console.error('[NotificationService] Error notifying role:', error);
            return null;
        }
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
