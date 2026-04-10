import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const normalizeNotification = (notification) => ({
    ...notification,
    actionUrl:
        notification?.actionUrl ||
        (typeof notification?.relatedId === 'string' && notification.relatedId.startsWith('/')
            ? notification.relatedId
            : null),
});

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            return;
        }
        try {
            setIsLoading(true);
            const userId = user?.id || user?._id;
            const res = await apiClient.get(`/notifications/${userId}`);
            setNotifications((res.data.data || []).map(normalizeNotification));
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 5000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
        }
    }, [user, fetchNotifications]);

    const markAsRead = async (id) => {
        // Optimistic update
        setNotifications(prev => (prev || []).map(n => (n._id === id || n.id === id) ? { ...n, isRead: true, read: true } : n));
        try {
            await apiClient.patch(`/notifications/read/${id}`);
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
            await fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => (prev || []).map(n => ({ ...n, isRead: true, read: true })));
        try {
            const userId = user?.id || user?._id;
            await apiClient.patch(`/notifications/mark-all-read/${userId}`);
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            fetchNotifications(); // Sync back
        }
    };

    const addNotification = async (notification) => {
        if (!notification?.message) {
            throw new Error('Notification message is required');
        }

        const payload = {
            title: notification.title || 'Notification',
            message: notification.message,
            type: notification.type || 'INFO',
            role: notification.role || null,
            targetUserId: notification.targetUserId || null,
            relatedId: notification.relatedId || null,
            actionUrl: notification.actionUrl || null,
        };

        const response = await apiClient.post('/notifications', payload);
        const created = response.data?.data || {};
        const createdNotification = Array.isArray(created)
            ? null
            : normalizeNotification(created);

        const targetsCurrentUser =
            createdNotification?.userId === (user?.id || user?._id) ||
            createdNotification?.role === user?.role;

        if (targetsCurrentUser) {
            setNotifications((prev) => [createdNotification, ...prev]);
        } else if (Array.isArray(created)) {
            await fetchNotifications();
        }

        return createdNotification || created;
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const getNotificationsByRole = useCallback(() => {
        // Filter is now handled by backend based on user session
        return notifications;
    }, [notifications]);

    const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            isLoading,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearAll,
            getNotificationsByRole,
            refreshNotifications: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
