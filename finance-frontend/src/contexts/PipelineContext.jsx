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
    const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            try {
                const prefix = user?.role === 'FACULTY' ? '/faculty' : '';
                const response = await apiClient.get(`${prefix}/projects`);
                return response.data.data || [];
            } catch (err) {
                console.warn('[PipelineContext] projects fetch failed:', err.message);
                return [];
            }
        },
        enabled: !!user,
        retry: false,
    });

    // Fetch fund requests
    const { data: fundRequests, isLoading: requestsLoading, error: requestsError } = useQuery({
        queryKey: ['fund-requests'],
        queryFn: async () => {
            try {
                const prefix = user?.role === 'FACULTY' ? '/faculty' : '';
                const response = await apiClient.get(`${prefix}/fund-requests`);
                return response.data.data;
            } catch (err) {
                console.error("🔥 FULL AXIOS ERROR:", err);

                if (err.response) {
                    console.error("🔥 BACKEND RESPONSE DATA:", err.response.data);
                    console.error("🔥 STATUS:", err.response.status);
                } else {
                    console.error("🔥 NO RESPONSE (network error):", err.message);
                }

                throw err;
            }
        },
        enabled: !!user,
        retry: false
    });

    // Create fund request mutation
    const createRequestMutation = useMutation({
        mutationFn: async (requestData) => {
            try {
                const prefix = user?.role === 'FACULTY' ? '/faculty' : '';
                const response = await apiClient.post(`${prefix}/fund-requests`, requestData);
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
            const prefix = user?.role === 'FACULTY' ? '/faculty' : '';
            const response = await apiClient.put(`${prefix}/projects/${projectId}`, updates);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
        }
    });

    const updateFundRequestMutation = useMutation({
        mutationFn: async ({ requestId, updates }) => {
            const prefix = user?.role === 'FACULTY' ? '/faculty' : '';
            const response = await apiClient.put(`${prefix}/fund-requests/${requestId}`, updates);
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

    if (requestsError) {
        return (
            <div style={{ padding: '20px', backgroundColor: '#ffebee', color: '#c62828', fontFamily: 'monospace', zIndex: 9999, position: 'relative' }}>
                <h2>🔥 Backend API Error (`/api/fund-requests`)</h2>
                <pre>{JSON.stringify(requestsError.response?.data || requestsError.message, null, 2)}</pre>
            </div>
        );
    }

    return (
        <PipelineContext.Provider value={value}>
            {children}
        </PipelineContext.Provider>
    );
};
