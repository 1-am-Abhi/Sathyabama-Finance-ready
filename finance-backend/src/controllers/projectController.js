const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { 
    Project, 
    User, 
    ProjectMember, 
    FundRequest, 
    Disbursement,
    ResearchCenter,
    Centre,
    Ledger
} = require('../models');
const { Op } = require('sequelize');
const {
    getAdminDashboardData,
    getFacultyDashboardData,
} = require('../services/pipelineMetricsService');
const { normalizeFundSource } = require('../services/fundSourceCatalogService');
const { safeNumber, parseFY, safeArray } = require('../utils/safeUtils');

const ResearchCenterModel = ResearchCenter || Centre;

const getAdminStats = asyncHandler(async (req, res) => {
    const { financialYear } = req.query;
    const adminData = await getAdminDashboardData(financialYear);
    const rawData = adminData?.data || {};

    return res.status(200).json({
        success: true,
        data: {
            totalProjects: safeNumber(rawData.totalProjects),
            totalAllocated: safeNumber(rawData.totalAllocated),
            used: safeNumber(rawData.used),
            remaining: safeNumber(rawData.remaining),
            utilization: safeNumber(rawData.utilization),
            centres: safeArray(rawData.centres),
            trend: safeArray(rawData.trend)
        }
    });
});

const getFacultyStats = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const data = await getFacultyDashboardData(userId, req.user?.name);

    const safeData = data || {};
    return res.status(200).json({
        success: true,
        data: {
            totalProjects: safeNumber(safeData.totalProjects),
            totalReleased: safeNumber(safeData.totalReleased),
            activeRequests: safeNumber(safeData.activeRequests),
            notifications: safeArray(safeData.notifications)
        }
    });
});

const getAllProjects = asyncHandler(async (req, res) => {
    const orgId = req.user?.organizationId || null;
    const where = {
        ...(orgId && { organizationId: orgId })
    };

    if (req.user?.role === 'FACULTY') {
        where.facultyId = req.user?.id || req.user?._id;
    }

    const projects = safeArray(await Project.findAll({
        where,
        include: [
            { model: User, as: 'facultyOwner', attributes: ['name', 'department'], required: false },
            { model: ResearchCenterModel, as: 'researchCenter', required: false }
        ],
        order: [['createdAt', 'DESC']]
    }));

    return res.status(200).json({ success: true, data: projects });
});

const getProjectDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await Project.findByPk(id, {
        include: [
            { model: User, as: 'facultyOwner', attributes: ['name', 'email', 'department'], required: false },
            { model: ProjectMember, as: 'members', required: false },
            { model: FundRequest, as: 'fundRequests', required: false },
            { model: Disbursement, as: 'Disbursements', required: false }
        ]
    });

    if (!project) return res.status(200).json({ success: false, message: 'Project not found', data: [] });

    return res.status(200).json({ success: true, data: project });
});

const createProject = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const orgId = req.user?.organizationId || null;
    const { title, sanctionedBudget, fundingSource, description, centreId } = req.body;

    if (!title || safeNumber(sanctionedBudget) <= 0) {
        return res.status(200).json({ success: false, message: 'Title and valid budget are required', data: [] });
    }

    const project = await Project.create({
        title,
        pi: req.user?.name || 'Unknown',
        facultyId: userId,
        organizationId: orgId,
        sanctionedBudget: safeNumber(sanctionedBudget),
        releasedBudget: 0,
        utilizedBudget: 0,
        fundingSource: normalizeFundSource(fundingSource || 'INSTITUTIONAL'),
        description,
        centreId,
        status: 'PENDING'
    });

    return res.status(201).json({ success: true, data: project });
});

const updateProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await Project.findByPk(id);
    if (!project) return res.status(200).json({ success: false, message: 'Project not found', data: [] });

    const { status, sanctionedBudget, fundingSource, description } = req.body;
    
    if (status) project.status = status;
    if (sanctionedBudget) project.sanctionedBudget = safeNumber(sanctionedBudget);
    if (fundingSource) project.fundingSource = normalizeFundSource(fundingSource);
    if (description) project.description = description;

    await project.save();
    return res.status(200).json({ success: true, data: project });
});

const deleteProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await Project.findByPk(id);
    if (!project) return res.status(200).json({ success: false, message: 'Project not found', data: [] });

    // Check for disbursements
    const disbursementCount = safeNumber(await Disbursement.count({ where: { projectId: id } }));
    if (disbursementCount > 0) {
        return res.status(200).json({ success: false, message: 'Cannot delete project with existing disbursements', data: [] });
    }

    await project.destroy();
    return res.status(200).json({ success: true, message: 'Project deleted' });
});

const freezeProject = asyncHandler(async (req, res) => {
    req.body.status = 'FROZEN';
    return updateProject(req, res);
});

const unfreezeProject = asyncHandler(async (req, res) => {
    req.body.status = 'ACTIVE';
    return updateProject(req, res);
});

const getProjectMembers = asyncHandler(async (req, res) => {
    const members = safeArray(await ProjectMember.findAll({
        where: { projectId: req.params.id },
        include: [{ model: User, as: 'user', attributes: ['name', 'email', 'department'], required: false }]
    }));
    return res.status(200).json({ success: true, data: members });
});

const updateProjectMembers = asyncHandler(async (req, res) => {
    const members = safeArray(req.body.members || req.body.userIds).map((member) => ({
        projectId: req.params.id,
        userId: typeof member === 'string' ? member : member.userId,
        role: typeof member === 'object' ? (member.role || 'MEMBER') : 'MEMBER'
    })).filter((member) => member.userId);

    await ProjectMember.destroy({ where: { projectId: req.params.id } });
    const created = members.length ? await ProjectMember.bulkCreate(members) : [];
    return res.status(200).json({ success: true, data: created });
});

module.exports = {
    getAdminStats,
    getFacultyStats,
    getAllProjects,
    getProjects: getAllProjects,
    getProjectDetails,
    getProject: getProjectDetails,
    createProject,
    updateProject,
    deleteProject,
    freezeProject,
    unfreezeProject,
    getProjectMembers,
    updateProjectMembers
};
