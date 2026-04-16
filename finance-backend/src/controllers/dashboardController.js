const { Project, FundRequest } = require('../models');
const { serverError } = require('../utils/controllerError');

exports.getGlobalMetrics = async (req, res) => {
    try {
        const projects = await Project.findAll();
        const activeProjects = projects.filter(p => ['COMPLETED', 'CLOSED'].includes(p.status) === false).length;
        
        const totalSanctioned = projects.reduce((sum, p) => sum + Number(p.sanctionedBudget || 0), 0);
        const totalDisbursed = projects.reduce((sum, p) => sum + Number(p.releasedBudget || 0), 0);
        const remainingFunds = Math.max(0, totalSanctioned - totalDisbursed);
        
        return res.status(200).json({
            success: true,
            data: {
                totalSanctioned,
                totalDisbursed,
                remainingFunds,
                activeProjects
            }
        });
    } catch (error) {
        return serverError(res, error);
    }
};
