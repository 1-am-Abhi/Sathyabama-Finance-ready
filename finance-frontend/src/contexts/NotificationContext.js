import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);
if (!process.env.REACT_APP_API_URL) {
    throw new Error('REACT_APP_API_URL environment variable is missing.');
}
const SOCKET_URL = process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');

const normalizeNotification = (notification) => ({
    ...notification,
    message: typeof notification?.message === 'object' ? (notification.message.text || notification.message.content || String(notification.message)) : String(notification.message || ''),
    title: typeof notification?.title === 'object' ? (notification.title.text || notification.title.content || String(notification.title)) : String(notification.title || ''),
    actionUrl:
        notification?.actionUrl ||
        (typeof notification?.relatedId === 'string' && notification.relatedId.startsWith('/')
            ? notification.relatedId
            : null),
});

const extractNotifications = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
};

const getNotificationId = (notification) =>
    notification?._id ||
    notification?.id ||
    [
        notification?.userId || 'user',
        notification?.type || 'type',
        notification?.relatedId || 'related',
        // Use a 5-second window for composite deduplication
        Math.floor(new Date(notification?.createdAt || Date.now()).getTime() / 5000)
    ].join(':');

const mergeNotifications = (current, incoming, { prepend = false } = {}) => {
    const next = Array.isArray(current) ? [...current] : [];
    const items = (Array.isArray(incoming) ? incoming : [incoming])
        .filter(Boolean)
        .map(normalizeNotification);

    items.forEach((item) => {
        const index = next.findIndex((existing) => getNotificationId(existing) === getNotificationId(item));
        if (index >= 0) {
            next[index] = { ...next[index], ...item };
            return;
        }

        if (prepend) {
            next.unshift(item);
            return;
        }

        next.push(item);
    });

    return next.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
};

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
            setNotifications(mergeNotifications([], extractNotifications(res.data)));
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

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            auth: {
                token: localStorage.getItem('token') || ''
            }
        });

        socket.on('notification', (payload) => {
            const notification = normalizeNotification(payload);
            const nid = getNotificationId(notification);
            
            setNotifications((prev) => {
                const isDuplicate = (prev || []).some(n => getNotificationId(n) === nid);
                if (isDuplicate) return prev;
                
                // Only toast for unique notifications
                toast.success(notification.message || notification.title || 'New notification received');
                return mergeNotifications(prev, notification, { prepend: true });
            });
        });

        socket.on('notifications:update', () => {
            fetchNotifications();
        });

        socket.on('connect_error', (error) => {
            console.warn('Notification socket connection failed:', error?.message || error);
        });

        return () => {
            socket.off('notification');
            socket.off('notifications:update');
            socket.off('connect_error');
            socket.disconnect();
        };
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
        const created = response.data?.data ?? response.data ?? {};
        const createdNotification = Array.isArray(created)
            ? null
            : normalizeNotification(created);

        const targetsCurrentUser =
            createdNotification?.userId === (user?.id || user?._id) ||
            createdNotification?.role === user?.role;

        if (targetsCurrentUser) {
            setNotifications((prev) => mergeNotifications(prev, createdNotification, { prepend: true }));
        } else if (Array.isArray(created)) {
            await fetchNotifications();
        }

        return createdNotification || created;
    };

    const clearAll = async () => {
        await markAllAsRead();
    };

    const getNotificationsByRole = useCallback(() => {
        // Filter is now handled by backend based on user session
        return notifications;
    }, [notifications]);

    const unreadCount = (notifications || []).filter(n => !n.isRead && !n.read).length;

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
