import api from './api';

/**
 * Finance API service functions
 * Real-time production endpoints without mock data fallbacks
 */

// Get fund sources overview (College + PFMS)
export const getFundSourcesOverview = async () => {
    const response = await api.get('/finance/fund-sources/overview');
    return response.data;
};

// Update fund source total amount
export const updateFundSourceAmount = async (data) => {
    const response = await api.put('/finance/funds/update', {
        type: data.fundSource || data.type,
        amount: data.amount,
        remarks: data.remarks,
        financialYear: data.financialYear,
    });
    return response.data;
};

// Get all departments
export const getDepartments = async () => {
    const response = await api.get('/finance/departments');
    return response.data;
};

// Get department funding details
export const getDepartmentFunding = async (departmentId) => {
    const response = await api.get(`/finance/departments/${departmentId}/funding`);
    return response.data;
};

// Update department funding
export const updateDepartmentFunding = async (data) => {
    const response = await api.post('/finance/funding/update', data);
    return response.data;
};

// Get funding history for a department
export const getFundingHistory = async (departmentId) => {
    const response = await api.get(`/finance/departments/${departmentId}/funding-history`);
    return response.data;
};

// Get all projects with optional filters
export const getProjects = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/finance/projects?${params}`);
    return response.data;
};

// Get project details
export const getProjectDetails = async (projectId) => {
    const response = await api.get(`/finance/projects/${projectId}`);
    return response.data;
};

// Update project status
export const updateProjectStatus = async (projectId, statusData) => {
    const response = await api.post(`/finance/projects/${projectId}/status`, statusData);
    return response.data;
};

// Get project status history
export const getProjectStatusHistory = async (projectId) => {
    const response = await api.get(`/finance/projects/${projectId}/history`);
    return response.data;
};

// Get disbursement queue (Approved by Admin)
export const getDisbursementQueue = async () => {
    const response = await api.get('/finance/disbursements');
    return response.data.data;
};

// Execute fund disbursement
export const executeDisbursement = async (requestId, data) => {
    const response = await api.put(`/finance/disbursements/${requestId}/execute`, data);
    return response.data;
};

// Get revenue verification queue
export const getRevenueVerificationQueue = async () => {
    const response = await api.get('/revenue/verification-queue');
    return response.data.data;
};

// Verify consultancy revenue inflow
export const verifyRevenue = async (revenueId, data) => {
    const response = await api.put(`/revenue/${revenueId}/verify`, data);
    return response.data;
};

// Get financial dashboard stats
export const getFinanceStats = async () => {
    const response = await api.get('/finance/stats');
    return response.data.data;
};

// Get fund flow projects
export const getFundFlowProjects = async () => {
    const response = await api.get('/finance/fund-flow');
    return response.data.data;
};

// Get PFMS transactions
export const getPFMSTransactions = async () => {
    const response = await api.get('/finance/pfms');
    return response.data.data;
};

// Create PFMS transaction
export const createPFMSTransaction = async (data) => {
    const response = await api.post('/finance/pfms', data);
    return response.data;
};

// Get internship fees
export const getInternshipFees = async () => {
    const response = await api.get('/finance/internship-fees');
    return response.data.data;
};

// Verify internship fee
export const verifyInternshipFee = async (id, data) => {
    const response = await api.put(`/finance/internship-fees/${id}/verify`, data);
    return response.data;
};

// Get financial reports data
export const getFinancialReports = async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/finance/reports-data?${queryParams}`);
    return response.data;
};

// Get disbursal history
export const getDisbursalHistory = async () => {
    const response = await api.get('/finance/disbursal-history');
    return response.data.data;
};

export const getFunctionRequests = async () => {
    const response = await api.get('/finance/function-requests');
    return response.data?.data || response.data;
};

export const releaseFunctionFunds = async (fundRequestId, data) => {
    const response = await api.put(`/finance/disbursements/${fundRequestId}/execute`, data);
    return response.data;
};
