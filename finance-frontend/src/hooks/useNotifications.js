import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

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

    const { data: notifications = [], isLoading, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiClient.get('/notifications');
            return (response.data?.data || []).map(normalizeNotification);
        },
        refetchInterval: 15000, // Poll every 15 seconds
        staleTime: 5000,
    });

    const markAsRead = useMutation({
        mutationFn: async (id) => {
            const response = await apiClient.patch(`/notifications/read/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            const response = await apiClient.patch('/notifications/mark-all-read');
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
