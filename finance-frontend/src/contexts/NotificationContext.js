import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem('research_notifications');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('research_notifications', JSON.stringify(notifications));
    }, [notifications]);

    const addNotification = React.useCallback((notif) => {
        const newNotif = {
            id: Date.now(),
            time: new Date().toISOString(),
            read: false,
            ...notif
        };
        setNotifications(prev => [newNotif, ...prev]);
    }, []);

    const markAsRead = React.useCallback((id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const clearAll = React.useCallback((role) => {
        setNotifications(prev => prev.filter(n => n.role !== role));
    }, []);

    const getNotificationsByRole = React.useCallback((role) => {
        return notifications.filter(n => n.role === role || n.role === 'all');
    }, [notifications]);

    const value = React.useMemo(() => ({
        notifications,
        addNotification,
        markAsRead,
        clearAll,
        getNotificationsByRole
    }), [notifications, addNotification, markAsRead, clearAll, getNotificationsByRole]);

    return (
        <NotificationContext.Provider value={value}>
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
