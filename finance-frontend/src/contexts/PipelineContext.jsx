import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const PipelineContext = createContext();

export const usePipeline = () => {
    const context = useContext(PipelineContext);
    if (!context) {
        throw new Error('usePipeline must be used within a PipelineProvider');
    }
    return context;
};

export const PipelineProvider = ({ children }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch projects
    const { data: projects, isLoading: projectsLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await apiClient.get('/projects');
            return response.data.data;
        },
        enabled: !!user
    });

    // Fetch fund requests
    const { data: fundRequests, isLoading: requestsLoading } = useQuery({
        queryKey: ['fund-requests'],
        queryFn: async () => {
            const response = await apiClient.get('/fund-requests');
            return response.data.data;
        },
        enabled: !!user
    });

    // Create fund request mutation
    const createRequestMutation = useMutation({
        mutationFn: async (requestData) => {
            try {
                const response = await apiClient.post('/fund-requests', requestData);
                return response.data.data;
            } catch (error) {
                console.error('PipelineContext - createRequest error:', error.response?.data || error.message);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fund-requests']);
            queryClient.invalidateQueries(['projects']);
        }
    });

    const approveRequestMutation = useMutation({
        mutationFn: async ({ requestId, remarks }) => {
            const response = await apiClient.put(`/fund-requests/${requestId}/approve`, { remarks });
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fund-requests']);
            queryClient.invalidateQueries(['projects']);
        }
    });
    
    const rejectRequestMutation = useMutation({
        mutationFn: async ({ requestId, remarks }) => {
            const response = await apiClient.put(`/fund-requests/${requestId}/reject`, { remarks });
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fund-requests']);
        }
    });

    const updateProjectMutation = useMutation({
        mutationFn: async ({ projectId, updates }) => {
            const response = await apiClient.put(`/projects/${projectId}`, updates);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
        }
    });

    const updateFundRequestMutation = useMutation({
        mutationFn: async ({ requestId, updates }) => {
            const response = await apiClient.put(`/fund-requests/${requestId}`, updates);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fund-requests']);
        }
    });

    // Advance fund stage mutation (Finance/PI)
    const advanceStageMutation = useMutation({
        mutationFn: async ({ requestId, nextStage, remarks }) => {
            const response = await apiClient.post(`/fund-requests/${requestId}/advance`, { nextStage, remarks });
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fund-requests']);
            queryClient.invalidateQueries(['projects']);
        }
    });

    const value = {
        projects,
        fundRequests,
        isLoading: projectsLoading || requestsLoading,
        createRequest: createRequestMutation.mutateAsync,
        approveRequest: approveRequestMutation.mutateAsync,
        rejectRequest: rejectRequestMutation.mutateAsync,
        advanceStage: advanceStageMutation.mutateAsync,
        updateProject: updateProjectMutation.mutateAsync,
        updateFundRequest: updateFundRequestMutation.mutateAsync,
        isCreating: createRequestMutation.isPending,
        isApproving: approveRequestMutation.isPending,
        isRejecting: rejectRequestMutation.isPending,
        isAdvancing: advanceStageMutation.isPending,
        isUpdatingProject: updateProjectMutation.isPending,
        isUpdatingFundRequest: updateFundRequestMutation.isPending
    };

    return (
        <PipelineContext.Provider value={value}>
            {children}
        </PipelineContext.Provider>
    );
};
