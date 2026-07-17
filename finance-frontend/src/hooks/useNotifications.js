import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const normalizeNotification = (notification) => ({
    ...notification,
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

export const useNotifications = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id || user?._id;

    const { data: notifications = [], isLoading, error } = useQuery({
        queryKey: ['notifications', userId],
        queryFn: async () => {
            const response = await apiClient.get(`/notifications/${userId}`);
            return extractNotifications(response.data).map(normalizeNotification);
        },
        enabled: Boolean(userId),
        // Poll every 30s instead of 5s. The 5s cadence hammered the notifications
        // endpoint (loaded on every page) and, on a cold DB, produced overlapping
        // slow requests / timeouts and a retry storm.
        refetchInterval: 30000,
        staleTime: 10000,
        retry: 1,
    });

    const markAsRead = useMutation({
        mutationFn: async (id) => {
            const response = await apiClient.patch(`/notifications/read/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            const response = await apiClient.patch(`/notifications/mark-all-read/${userId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
    });

    const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

    return {
        notifications,
        isLoading,
        error,
        unreadCount,
        markAsRead,
        markAllAsRead
    };
};
