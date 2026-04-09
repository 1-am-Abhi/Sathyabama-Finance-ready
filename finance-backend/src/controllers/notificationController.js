const Notification = require('../models/Notification');
const { Op } = require('sequelize');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const role = req.user.role;

        // Fetch notifications specifically for this user OR for their role (broadcasts)
        const notifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { userId: userId },
                    { role: role }
                ]
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

        // Security check: ensure the notification belongs to this user or their role
        if (notification.userId && notification.userId !== (req.user.id || req.user._id)) {
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
        const role = req.user.role;

        await Notification.update(
            { isRead: true },
            {
                where: {
                    [Op.or]: [
                        { userId: userId },
                        { role: role }
                    ],
                    isRead: false
                }
            }
        );

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
