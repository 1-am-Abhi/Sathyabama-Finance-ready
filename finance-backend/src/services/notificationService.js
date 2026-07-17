const logger = require('../utils/logger');
const crypto = require('crypto');
const { Op, Sequelize } = require('sequelize');

// Deterministic fingerprint of a notification. Identical events (double-fired
// handlers, client retries) produce the same key, so we can suppress duplicates.
const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const buildDedupeKey = (userId, type, relatedId, title, message) =>
    crypto.createHash('sha1')
        .update(`${userId}|${type}|${relatedId || ''}|${title || ''}|${message || ''}`)
        .digest('hex');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { findUserByRuntimeId, getUserUuid, isUuid } = require('../utils/userIdentity');
const { getIO } = require('../socketInstance');

const emitNotification = (notification) => {
    const io = getIO();
    if (!notification?.userId || !io) {
        return;
    }

    const payload = notification.toJSON ? notification.toJSON() : notification;
    try {
        io.to(String(payload.userId)).emit('notification', payload);
        io.to(String(payload.userId)).emit('notifications:update', {
            userId: String(payload.userId),
            notificationId: payload._id || payload.id,
        });
    } catch (err) {
        logger.error('[Socket Error]', err);
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
        let recipientId = String(userId);
        if (!isUuid(recipientId)) {
            const user = await findUserByRuntimeId(User, recipientId);
            recipientId = getUserUuid(user);
        }

        if (!recipientId) {
            logger.warn(`[NotificationService] Skipping notification for unresolved user id "${userId}"`);
            return null;
        }

        // Idempotency: suppress an identical notification created within the
        // dedupe window (double-fired event / retry).
        const dedupeKey = buildDedupeKey(recipientId, type, relatedId, title, message);
        try {
            const existing = await Notification.findOne({
                where: {
                    userId: recipientId,
                    dedupeKey,
                    createdAt: { [Op.gte]: new Date(Date.now() - DEDUPE_WINDOW_MS) },
                },
                order: [['createdAt', 'DESC']],
            });
            if (existing) {
                logger.info(`[NotificationService] Duplicate suppressed for user ${recipientId}: ${title}`);
                return existing;
            }
        } catch (e) {
            // If the dedupe check fails (e.g. column not yet migrated), fall through
            // and still create the notification — never lose a notification.
            logger.warn('[NotificationService] dedupe check failed:', e.message);
        }

        logger.info(`[NotificationService] Creating ${type} for user ${recipientId}: ${title}`);
        const notification = await Notification.create({
            userId: recipientId,
            role: null,
            title,
            message,
            type,
            relatedId,
            dedupeKey,
            isRead: false
        });
        emitNotification(notification);
        logger.info(`[NotificationService] SUCCESS: Created notification ${notification._id}`);
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
        logger.info(`[NotificationService] Broadcasting ${type} to role ${role}: ${title}`);

        const roleLower = (role || '').toLowerCase();

        const users = await User.findAll({
            where: Sequelize.where(
                Sequelize.fn('LOWER', Sequelize.col('role')),
                roleLower
            ),
            attributes: ['_id'],
        });

        if (!users.length) {
            logger.warn(`[NotificationService] No users found with role "${role}" — skipping notification`);
            return [];
        }

        logger.info(`[NotificationService] Creating up to ${users.length} notifications for role ${role}`);

        // Idempotency: for each recipient, skip if an identical notification was
        // created within the dedupe window (double-fired broadcast / retry).
        let recentKeys = new Set();
        try {
            const recipientIds = users.map((u) => u._id);
            const keyByUser = new Map(
                users.map((u) => [String(u._id), buildDedupeKey(u._id, type, relatedId, title, message)])
            );
            const recent = await Notification.findAll({
                where: {
                    userId: { [Op.in]: recipientIds },
                    dedupeKey: { [Op.in]: Array.from(keyByUser.values()) },
                    createdAt: { [Op.gte]: new Date(Date.now() - DEDUPE_WINDOW_MS) },
                },
                attributes: ['userId', 'dedupeKey'],
            });
            recentKeys = new Set(recent.map((r) => `${r.userId}:${r.dedupeKey}`));
        } catch (e) {
            logger.warn('[NotificationService] role dedupe check failed:', e.message);
        }

        const notificationEntries = users
            .map((user) => {
                const dedupeKey = buildDedupeKey(user._id, type, relatedId, title, message);
                if (recentKeys.has(`${user._id}:${dedupeKey}`)) return null;
                return { userId: user._id, role, title, message, type, relatedId, dedupeKey, isRead: false };
            })
            .filter(Boolean);

        if (!notificationEntries.length) {
            logger.info(`[NotificationService] All ${users.length} role notifications suppressed as duplicates`);
            return [];
        }

        const created = await Notification.bulkCreate(notificationEntries);
        created.forEach((notification) => emitNotification(notification));
        logger.info(`[NotificationService] SUCCESS: Bulk created ${created.length} notifications`);
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
