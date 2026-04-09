import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient'; // Using the standardized apiClient
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

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
            const res = await apiClient.get('/notifications');
            setNotifications(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll every 15 seconds for real-time feel
            const interval = setInterval(fetchNotifications, 15000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
        }
    }, [user, fetchNotifications]);

    const markAsRead = async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: true, read: true } : n));
        try {
            await apiClient.patch(`/notifications/read/${id}`);
        } catch (error) {
            console.error('Failed to mark as read:', error);
            // Revert on failure if critical, but for notifications we usually just log it
        }
    };

    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
        try {
            await apiClient.patch('/notifications/read-all');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            fetchNotifications(); // Sync back
        }
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
