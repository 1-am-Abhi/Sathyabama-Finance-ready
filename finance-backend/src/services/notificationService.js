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
            console.log(`[NotificationService] Creating ${type} for user ${userId}: ${title}`);
            return await Notification.create({
                userId,
                title,
                message,
                type,
                relatedId,
                isRead: false
            });
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
            
            // For role-based, we can either:
            // 1. Create one record with role set (frontend filters by role)
            // 2. Create individual records for all users with that role
            
            // Approach 1 is more efficient for the DB, but Approach 2 allows per-user read tracking.
            // We will use Approach 1 for "Global" role notifications but our UI will support both.
            
            return await Notification.create({
                role,
                title,
                message,
                type,
                relatedId,
                isRead: false
            });
        } catch (error) {
            console.error('[NotificationService] Error notifying role:', error);
            return null;
        }
    }
}

module.exports = NotificationService;
