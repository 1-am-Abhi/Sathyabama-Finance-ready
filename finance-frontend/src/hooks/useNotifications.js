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

export const useNotifications = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id || user?._id;

    const { data: notifications = [], isLoading, error } = useQuery({
        queryKey: ['notifications', userId],
        queryFn: async () => {
            const response = await apiClient.get(`/notifications/${userId}`);
            return (response.data?.data || []).map(normalizeNotification);
        },
        enabled: Boolean(userId),
        refetchInterval: 5000,
        staleTime: 0,
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
