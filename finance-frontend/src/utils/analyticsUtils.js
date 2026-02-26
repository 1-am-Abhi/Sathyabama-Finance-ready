/**
 * Analytics Utilities
 * Transform dashboard data into chart-ready formats
 */

/**
 * Get project status distribution data for donut chart
 * @param {Array} projects - Array of project objects
 * @returns {Array} Chart data with name, value, and color
 */
export const getProjectStatusData = (projects) => {
    const statusCounts = projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
    }, {});

    return [
        {
            name: 'Active Projects',
            value: statusCounts.ACTIVE || 0,
            color: '#10b981',
            percentage: ((statusCounts.ACTIVE || 0) / projects.length * 100).toFixed(1)
        },
        {
            name: 'Completed Projects',
            value: statusCounts.COMPLETED || 0,
            color: '#3b82f6',
            percentage: ((statusCounts.COMPLETED || 0) / projects.length * 100).toFixed(1)
        }
    ];
};

/**
 * Get budget utilization data for horizontal stacked bar chart
 * @param {Array} projects - Array of project objects
 * @returns {Array} Chart data with project name, allocated, and utilized budgets
 */
export const getBudgetUtilizationData = (projects) => {
    return projects.map(project => {
        const budgetLakhs = project.budget / 100000;
        const utilizedLakhs = project.utilized / 100000;
        const remainingLakhs = budgetLakhs - utilizedLakhs;

        return {
            name: project.title.length > 25
                ? project.title.substring(0, 25) + '...'
                : project.title,
            fullName: project.title,
            allocated: parseFloat(budgetLakhs.toFixed(1)),
            utilized: parseFloat(utilizedLakhs.toFixed(1)),
            remaining: parseFloat(remainingLakhs.toFixed(1)),
            utilizationPercent: ((utilizedLakhs / budgetLakhs) * 100).toFixed(0)
        };
    });
};

/**
 * Get funding trend data for line chart
 * @param {Array} projects - Array of project objects
 * @returns {Array} Time-series data with cumulative funding
 */
export const getFundingTrendData = (projects) => {
    // Sort projects by start date
    const sortedProjects = [...projects].sort((a, b) => {
        return new Date(a.startDate) - new Date(b.startDate);
    });

    let cumulative = 0;
    return sortedProjects.map((project, index) => {
        cumulative += project.utilized / 100000;

        // Parse date and format for display
        const date = new Date(project.startDate);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return {
            month: `${monthNames[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`,
            funding: parseFloat(cumulative.toFixed(1)),
            project: project.title,
            utilized: parseFloat((project.utilized / 100000).toFixed(1))
        };
    });
};

/**
 * Get fund request status data for vertical bar chart
 * @param {Array} fundRequests - Array of fund request objects
 * @returns {Array} Chart data with status, amount, and count
 */
export const getFundRequestStatusData = (fundRequests) => {
    const statusData = fundRequests.reduce((acc, request) => {
        const status = request.status;
        if (!acc[status]) {
            acc[status] = {
                count: 0,
                amount: 0
            };
        }
        acc[status].count += 1;
        acc[status].amount += request.amount;
        return acc;
    }, {});

    const statusColors = {
        'APPROVED': '#10b981',
        'PENDING': '#f59e0b',
        'REJECTED': '#ef4444'
    };

    return ['APPROVED', 'PENDING', 'REJECTED'].map(status => ({
        status: status.charAt(0) + status.slice(1).toLowerCase(),
        amount: statusData[status] ? parseFloat((statusData[status].amount / 100000).toFixed(1)) : 0,
        count: statusData[status] ? statusData[status].count : 0,
        color: statusColors[status]
    }));
};

/**
 * Format currency in Indian Rupees (Lakhs)
 * @param {number} value - Value in lakhs
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
    return `₹${value}L`;
};

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
    return `${value}%`;
};
