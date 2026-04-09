import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

export const useNotifications = () => {
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiClient.get('/notifications');
            return response.data;
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
            queryClient.invalidateQueries(['notifications']);
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            const response = await apiClient.patch('/notifications/read-all');
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
        notifications,
        isLoading,
        error,
        unreadCount,
        markAsRead,
        markAllAsRead
    };
};
