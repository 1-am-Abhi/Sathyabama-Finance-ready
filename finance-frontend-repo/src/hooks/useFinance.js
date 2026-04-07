import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getFundSourcesOverview,
    updateFundSourceAmount,
    getDepartments,
    getDepartmentFunding,
    updateDepartmentFunding,
    getProjects,
    getProjectDetails,
    updateProjectStatus,
} from '../services/financeService';

/**
 * Hook to fetch fund sources overview
 */
export const useFundSourcesOverview = () => {
    return useQuery({
        queryKey: ['fundSourcesOverview'],
        queryFn: getFundSourcesOverview,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Hook to update fund source amount
 */
export const useUpdateFundSource = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateFundSourceAmount,
        onSuccess: () => {
            // Invalidate and refetch fund sources overview
            queryClient.invalidateQueries({ queryKey: ['fundSourcesOverview'] });
        },
    });
};

/**
 * Hook to fetch all departments
 */
export const useDepartments = () => {
    return useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

/**
 * Hook to fetch department funding details
 */
export const useDepartmentFunding = (departmentId) => {
    return useQuery({
        queryKey: ['departmentFunding', departmentId],
        queryFn: () => getDepartmentFunding(departmentId),
        enabled: !!departmentId, // Only fetch if departmentId is provided
        staleTime: 3 * 60 * 1000, // 3 minutes
    });
};

/**
 * Hook to update department funding
 */
export const useUpdateFunding = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateDepartmentFunding,
        onSuccess: (data, variables) => {
            // Invalidate and refetch relevant queries
            queryClient.invalidateQueries({ queryKey: ['fundSourcesOverview'] });
            queryClient.invalidateQueries({
                queryKey: ['departmentFunding', variables.departmentId]
            });
        },
    });
};

/**
 * Hook to fetch projects with filters
 */
export const useProjects = (filters = {}) => {
    return useQuery({
        queryKey: ['projects', filters],
        queryFn: () => getProjects(filters),
        staleTime: 3 * 60 * 1000, // 3 minutes
    });
};

/**
 * Hook to fetch project details
 */
export const useProjectDetails = (projectId) => {
    return useQuery({
        queryKey: ['projectDetails', projectId],
        queryFn: () => getProjectDetails(projectId),
        enabled: !!projectId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Hook to update project status
 */
export const useUpdateProjectStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ projectId, statusData }) => updateProjectStatus(projectId, statusData),
        onSuccess: () => {
            // Invalidate and refetch projects
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['projectDetails'] });
        },
    });
};
