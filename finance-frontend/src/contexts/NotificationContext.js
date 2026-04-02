import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            return;
        }
        try {
            const res = await apiClient.get('/notifications');
            setNotifications(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch real-time notifications', error);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Ping database every 5 seconds for ultra-real-time synchronization between clients
        const interval = setInterval(fetchNotifications, 5000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const addNotification = React.useCallback(async (notif) => {
        try {
            // Push to backend
            await apiClient.post('/notifications', notif);
            // Force an immediate fetch so it shows up instantly without waiting for the 5s interval
            const res = await apiClient.get('/notifications');
            setNotifications(res.data.data || []);
        } catch (error) {
            console.error('Failed to create notification', error);
        }
    }, []);

    const markAsRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await apiClient.put(`/notifications/${id}/read`);
        } catch (error) {
            console.error('Failed to mark real-time read', error);
        }
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const getNotificationsByRole = React.useCallback((role) => {
        // The backend `findAll` already firmly maps `{ where: { role: req.user.role } }`
        // so we don't need to filter on frontend anymore.
        return notifications;
    }, [notifications]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            addNotification,
            markAsRead,
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
