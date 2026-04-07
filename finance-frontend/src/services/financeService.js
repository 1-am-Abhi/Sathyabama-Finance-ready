import api from './api';
import { mockFundSourcesOverview, mockDepartments, mockDepartmentFunding } from './mockData';

/**
 * Finance API service functions
 * Using mock data for development - replace with real API when backend is ready
 */

// Get fund sources overview (College + PFMS)
export const getFundSourcesOverview = async () => {
    try {
        const response = await api.get('/finance/fund-sources/overview');
        return response.data;
    } catch (error) {
        // Return mock data for development
        console.log('Using mock data for fund sources overview');
        return new Promise((resolve) => {
            setTimeout(() => resolve(mockFundSourcesOverview), 500);
        });
    }
};

// Update fund source total amount
export const updateFundSourceAmount = async (data) => {
    try {
        const response = await api.post('/finance/fund-sources/update', data);
        return response.data;
    } catch (error) {
        // Simulate successful update for development
        console.log('Mock update fund source:', data);
        return new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, message: 'Fund source updated (mock)' }), 500);
        });
    }
};

// Get all departments
export const getDepartments = async () => {
    try {
        const response = await api.get('/finance/departments');
        return response.data;
    } catch (error) {
        // Return mock data for development
        console.log('Using mock data for departments');
        return new Promise((resolve) => {
            setTimeout(() => resolve(mockDepartments), 500);
        });
    }
};

// Get department funding details
export const getDepartmentFunding = async (departmentId) => {
    try {
        const response = await api.get(`/finance/departments/${departmentId}/funding`);
        return response.data;
    } catch (error) {
        // Return mock data for development
        console.log('Using mock data for department funding:', departmentId);
        return new Promise((resolve) => {
            setTimeout(() => resolve(mockDepartmentFunding[departmentId] || []), 500);
        });
    }
};

// Update department funding
export const updateDepartmentFunding = async (data) => {
    try {
        const response = await api.post('/finance/funding/update', data);
        return response.data;
    } catch (error) {
        // Simulate successful update for development
        console.log('Mock update department funding:', data);
        return new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, message: 'Funding updated (mock)' }), 500);
        });
    }
};

// Get funding history for a department
export const getFundingHistory = async (departmentId) => {
    try {
        const response = await api.get(`/finance/departments/${departmentId}/funding-history`);
        return response.data;
    } catch (error) {
        // Return empty array for development
        console.log('Using mock data for funding history');
        return new Promise((resolve) => {
            setTimeout(() => resolve([]), 500);
        });
    }
};

// Get all projects with optional filters
export const getProjects = async (filters = {}) => {
    try {
        const params = new URLSearchParams(filters);
        const response = await api.get(`/finance/projects?${params}`);
        return response.data;
    } catch (error) {
        // Return mock data for development
        console.log('Using mock data for projects');
        const { mockProjects } = await import('./mockData');

        return new Promise((resolve) => {
            setTimeout(() => {
                let filteredProjects = [...mockProjects];

                // Filter by department
                if (filters.departmentId) {
                    filteredProjects = filteredProjects.filter(
                        p => p.departmentId === filters.departmentId
                    );
                }

                // Filter by status
                if (filters.status) {
                    filteredProjects = filteredProjects.filter(
                        p => p.currentStatus === filters.status
                    );
                }

                // Search by title or PI
                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    filteredProjects = filteredProjects.filter(
                        p => p.projectTitle.toLowerCase().includes(searchLower) ||
                            p.principalInvestigator.toLowerCase().includes(searchLower)
                    );
                }

                resolve(filteredProjects);
            }, 500);
        });
    }
};

// Get project details
export const getProjectDetails = async (projectId) => {
    try {
        const response = await api.get(`/finance/projects/${projectId}`);
        return response.data;
    } catch (error) {
        console.log('Using mock data for project details');
        const { mockProjects } = await import('./mockData');

        return new Promise((resolve) => {
            setTimeout(() => {
                const project = mockProjects.find(p => p.id === parseInt(projectId));
                resolve(project || null);
            }, 300);
        });
    }
};

// Update project status
export const updateProjectStatus = async (projectId, statusData) => {
    try {
        const response = await api.post(`/finance/projects/${projectId}/status`, statusData);
        return response.data;
    } catch (error) {
        console.log('Mock update project status:', projectId, statusData);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: 'Project status updated (mock)',
                    data: statusData
                });
            }, 500);
        });
    }
};

// Get project status history
export const getProjectStatusHistory = async (projectId) => {
    try {
        const response = await api.get(`/finance/projects/${projectId}/history`);
        return response.data;
    } catch (error) {
        console.log('Using mock data for project history');
        return new Promise((resolve) => {
            setTimeout(() => resolve([]), 300);
        });
    }
};
