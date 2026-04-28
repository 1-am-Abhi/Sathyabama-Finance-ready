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
    getDisbursementQueue,
    executeDisbursement,
    getRevenueVerificationQueue,
    verifyRevenue,
    getFinancialReports,
    getFinanceStats,
    getFundFlow,
    getDisbursalHistory,
    getPFMS,
    getInternships,
    verifyInternshipFee,
    createPFMSTransaction,
    getFunctionRequests,
    releaseFunctionFunds,
    rollbackDisbursement
} from '../services/financeService';

/**
 * Hook to fetch finance dashboard stats
 */
export const useFinanceStats = (fy) => {
    return useQuery({
        queryKey: ['financeStats', fy],
        queryFn: () => getFinanceStats(fy),
        staleTime: 0,
        refetchInterval: 30000,
    });
};

/**
 * Hook to fetch fund flow projects
 */
export const useFundFlowProjects = (fy) => {
    return useQuery({
        queryKey: ['fundFlow', fy],
        queryFn: () => getFundFlow(fy),
        staleTime: 0,
        refetchInterval: 30000,
    });
};

/**
 * Hook to fetch PFMS transactions
 */
export const usePFMSTransactions = (fy) => {
    return useQuery({
        queryKey: ['pfms', fy],
        queryFn: () => getPFMS(fy),
        staleTime: 0,
        refetchInterval: 30000,
    });
};

/**
 * Hook to create PFMS transaction
 */
export const useCreatePFMSTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPFMSTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pfms'] });
            queryClient.invalidateQueries({ queryKey: ['financeStats'] });
        },
    });
};

/**
 * Hook to fetch internship fees
 */
export const useInternshipFees = (fy) => {
    return useQuery({
        queryKey: ['internships', fy],
        queryFn: () => getInternships(fy),
        staleTime: 0,
        refetchInterval: 30000,
    });
};

/**
 * Hook to verify internship fee
 */
export const useVerifyInternshipFee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => verifyInternshipFee(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internships'] });
            queryClient.invalidateQueries({ queryKey: ['financeStats'] });
        },
    });
};

/**
 * Hook to fetch fund sources overview
 */
export const useFundSourcesOverview = (fy) => {
    return useQuery({
        queryKey: ['fundSourcesOverview', fy],
        queryFn: () => getFundSourcesOverview(fy),
        staleTime: 0,
    });
};

/**
 * Hook to update fund source amount
 */
export const useUpdateFundSource = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateFundSourceAmount,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['fundSourcesOverview'] }),
                queryClient.invalidateQueries({ queryKey: ['financeStats'] }),
                queryClient.invalidateQueries({ queryKey: ['financialReports'] }),
                queryClient.invalidateQueries({ queryKey: ['disbursalHistory'] }),
                queryClient.invalidateQueries({ queryKey: ['adminDashboard'] }),
                queryClient.invalidateQueries({ queryKey: ['facultyDashboard'] }),
            ]);
            await queryClient.refetchQueries({ queryKey: ['fundSourcesOverview'] });
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
        staleTime: 0,
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
        staleTime: 0,
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
        staleTime: 0,
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
        staleTime: 0,
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
/**
 * Hook to fetch disbursement queue
 */
export const useDisbursementQueue = () => {
    return useQuery({
        queryKey: ['disbursementQueue'],
        queryFn: getDisbursementQueue,
        staleTime: 0,
    });
};

/**
 * Hook to execute disbursement
 */
export const useExecuteDisbursement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ requestId, data }) => executeDisbursement(requestId, data),
        onSuccess: () => {
            // Invalidate ALL finance-related queries to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['disbursementQueue'] });
            queryClient.invalidateQueries({ queryKey: ['disbursalHistory'] });
            queryClient.invalidateQueries({ queryKey: ['financialReports'] });
            queryClient.invalidateQueries({ queryKey: ['financeStats'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['projectDetails'] });
            queryClient.invalidateQueries({ queryKey: ['fundSourcesOverview'] });
            queryClient.invalidateQueries({ queryKey: ['fundFlow'] });
            queryClient.invalidateQueries({ queryKey: ['pfms'] });
            queryClient.invalidateQueries({ queryKey: ['internships'] });
            queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['facultyDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

/**
 * Hook to fetch revenue verification queue
 */
export const useRevenueVerificationQueue = () => {
    return useQuery({
        queryKey: ['revenueVerificationQueue'],
        queryFn: getRevenueVerificationQueue,
        staleTime: 0,
    });
};

/**
 * Hook to verify revenue
 */
export const useVerifyRevenue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ revenueId, data }) => verifyRevenue(revenueId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['revenueVerificationQueue'] });
        },
    });
};

/**
 * Hook to fetch financial reports
 */
export const useFinancialReports = (params = {}) => {
    return useQuery({
        queryKey: ['financialReports', params],
        queryFn: () => getFinancialReports(params),
        staleTime: 0,
    });
};

/**
 * Hook to fetch disbursal history
 */
export const useDisbursalHistory = (fy) => {
    return useQuery({
        queryKey: ['disbursalHistory', fy],
        queryFn: () => getDisbursalHistory(fy),
        staleTime: 0,
    });
};

export const useFunctionRequests = () => {
    return useQuery({
        queryKey: ['functionRequests'],
        queryFn: getFunctionRequests,
        staleTime: 0,
    });
};

export const useReleaseFunctionFunds = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fundRequestId, data }) => releaseFunctionFunds(fundRequestId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['functionRequests'] });
            queryClient.invalidateQueries({ queryKey: ['disbursalHistory'] });
            queryClient.invalidateQueries({ queryKey: ['financialReports'] });
            queryClient.invalidateQueries({ queryKey: ['financeStats'] });
        },
    });
};

/**
 * Hook to reverse/rollback a disbursement (Bank-Grade)
 */
export const useRollbackDisbursement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => rollbackDisbursement(id),
        onSuccess: () => {
            // Re-sync all financial datasets
            queryClient.invalidateQueries();
        },
    });
};
