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
     * Notify all users with a specific role (Admin/Finance)
     */
    static async notifyRole(role, title, message, type = 'INFO', relatedId = null) {
        try {
            console.log(`[NotificationService] Broadcasting ${type} to role ${role}: ${title}`);

            const users = await User.findAll({
                where: { role },
                attributes: ['_id'],
            });

            if (!users.length) {
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
}

module.exports = NotificationService;
