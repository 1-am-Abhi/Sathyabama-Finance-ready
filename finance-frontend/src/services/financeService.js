import api from './api';

/**
 * Finance API service functions
 * Real-time production endpoints without mock data fallbacks
 *
 * CONVENTION: All backend responses wrap data as { success: true, data: ... }
 * These functions extract the inner .data property so react-query hooks
 * always receive the actual payload (array, object, etc.) — never the envelope.
 */

// ── Fund Sources ──────────────────────────────────────────────────────────────

// Get fund sources overview — returns array of { name, totalAllocated, totalUsed, remainingBalance }
export const getFundSourcesOverview = async (fy) => {
    const response = await api.get('/finance/fund-sources/overview', { params: { fy } });
    const body = response.data;
    return Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
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

// ── Departments ───────────────────────────────────────────────────────────────

// Get all departments
export const getDepartments = async () => {
    const response = await api.get('/finance/departments');
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// Get department funding details
export const getDepartmentFunding = async (departmentId) => {
    const response = await api.get(`/finance/departments/${departmentId}/funding`);
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// Update department funding
export const updateDepartmentFunding = async (data) => {
    const response = await api.post('/finance/funding/update', data);
    return response.data;
};

// Get funding history for a department
export const getFundingHistory = async (departmentId) => {
    const response = await api.get(`/finance/departments/${departmentId}/funding-history`);
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// ── Projects ──────────────────────────────────────────────────────────────────

// Get all projects with optional filters
export const getProjects = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/finance/projects?${params}`);
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// Get project details
export const getProjectDetails = async (projectId) => {
    const response = await api.get(`/finance/projects/${projectId}`);
    return response.data?.data || response.data;
};

// Update project status
export const updateProjectStatus = async (projectId, statusData) => {
    const response = await api.post(`/finance/projects/${projectId}/status`, statusData);
    return response.data;
};

// Get project status history
export const getProjectStatusHistory = async (projectId) => {
    const response = await api.get(`/finance/projects/${projectId}/history`);
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// ── Disbursements ─────────────────────────────────────────────────────────────

// Get disbursement queue (Approved by Admin)
export const getDisbursementQueue = async () => {
    const response = await api.get('/finance/disbursements');
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// Execute fund disbursement
export const executeDisbursement = async (requestId, data) => {
    const response = await api.put(`/finance/disbursements/${requestId}/execute`, data);
    return response.data;
};

// ── Revenue ───────────────────────────────────────────────────────────────────

// Get revenue verification queue
export const getRevenueVerificationQueue = async () => {
    const response = await api.get('/revenue/verification-queue');
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// Verify consultancy revenue inflow
export const verifyRevenue = async (revenueId, data) => {
    const response = await api.put(`/revenue/${revenueId}/verify`, data);
    return response.data;
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────

// Get financial dashboard stats
export const getFinanceStats = async (fy) => {
    const response = await api.get('/finance/stats', { params: { fy } });
    return response.data?.data || response.data || {};
};

// ── Fund Flow ─────────────────────────────────────────────────────────────────

// Get fund flow projects
// Fund-flow rows for the Finance settlement view. This MUST return an array —
// the endpoint currently returns a summary object ({ totalIn, totalOut }), so
// without this guard the consumer did `object.map(...)` → "map is not a function".
// Per-project rows (if the endpoint ever provides them) live under .projects/.rows.
export const getFundFlow = async (fy) => {
    const response = await api.get('/finance/fund-flow', { params: { fy } });
    const body = response.data?.data ?? response.data;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.projects)) return body.projects;
    if (Array.isArray(body?.rows)) return body.rows;
    return [];
};

// ── PFMS ──────────────────────────────────────────────────────────────────────

// Get PFMS transactions
export const getPFMS = async (fy) => {
    const response = await api.get('/finance/pfms', { params: { fy } });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// Create PFMS transaction
export const createPFMSTransaction = async (data) => {
    const response = await api.post('/finance/pfms', data);
    return response.data;
};

// ── Internship Fees ───────────────────────────────────────────────────────────

// Get internship fees
export const getInternships = async (fy) => {
    const response = await api.get('/finance/internship-fees', { params: { fy } });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// Verify internship fee
export const verifyInternshipFee = async (id, data) => {
    const response = await api.put(`/finance/internship-fees/${id}/verify`, data);
    return response.data;
};

// ── Reports ───────────────────────────────────────────────────────────────────

// Get financial reports data
export const getFinancialReports = async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/finance/reports-data?${queryParams}`);
    return response.data?.data || response.data || {};
};

// ── Disbursal History ─────────────────────────────────────────────────────────

// Get disbursal history
export const getDisbursalHistory = async (fy) => {
    const response = await api.get('/finance/disbursal-history', { params: { fy } });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

// ── Function Requests ─────────────────────────────────────────────────────────

export const getFunctionRequests = async () => {
    const response = await api.get('/finance/function-requests');
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
};

export const releaseFunctionFunds = async (fundRequestId, data) => {
    const response = await api.put(`/finance/disbursements/${fundRequestId}/execute`, data);
    return response.data;
};

// Rollback/Reverse a disbursement
export const rollbackDisbursement = async (id) => {
    const response = await api.post(`/finance/disbursements/${id}/rollback`);
    return response.data;
};
