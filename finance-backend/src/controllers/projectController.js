const asyncHandler = require('../utils/asyncHandler');
const { 
    Project, 
    User, 
    ProjectMember, 
    FundRequest: FR, 
    Disbursement,
    ResearchCenter,
    Centre
} = require('../models');
const { Op } = require('sequelize');
const {
    getAdminDashboardData,
    getFacultyDashboardData,
} = require('../services/pipelineMetricsService');
const { normalizeFundSource } = require('../services/fundSourceCatalogService');
const { cache } = require('../services/redisService');
const {
    buildResearchCenterIncludeArray,
    getEmptyAdminStatsData,
    isResearchCenterFailure,
    normalizeResearchCenterResponse,
    normalizeResearchCenterResponseList,
} = require('../utils/researchCenterSafety');

const ResearchCenterModel = ResearchCenter || Centre;

const resolveCentreAssignment = async (centreInput, centreIdInput) => {
    if (!ResearchCenterModel) {
        return { centreId: centreIdInput || null, centre: centreInput || null };
    }

    try {
        if (centreIdInput) {
            const centre = await ResearchCenterModel.findByPk(centreIdInput);
            if (centre) {
                return { 
                    centreId: centre._id || centre.id, 
                    researchCenterId: centre._id || centre.id,
                    centre: centre.name 
                };
            }
        }

        if (centreInput) {
            const centre = await ResearchCenterModel.findOne({ where: { name: centreInput } });
            if (centre) {
                return { 
                    centreId: centre._id || centre.id, 
                    researchCenterId: centre._id || centre.id,
                    centre: centre.name 
                };
            }
            return { centreId: null, centre: centreInput };
        }
    } catch (error) {
        console.warn('[ProjectController] ResearchCenter lookup failed:', error.message);
    }

    return { centreId: centreIdInput || null, centre: centreInput || null };
};

const getAdminStats = asyncHandler(async (req, res) => {
    try {
        const { financialYear } = req.query;
        const adminData = await getAdminDashboardData(financialYear);
        const safeData = adminData?.data || getEmptyAdminStatsData();

        return res.status(200).json({
            success: true,
            data: {
                ...safeData,
                totalAllocated: Number(safeData.totalAllocated || 0),
                used: Number(safeData.used || 0),
                remaining: Number(safeData.remaining || 0)
            }
        });
    } catch (error) {
        console.error('[ProjectController] getAdminStats failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve admin stats',
            error: error.message
        });
    }
});

const getFacultyStats = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const data = await getFacultyDashboardData(userId, req.user?.name);

    return res.status(200).json({
        success: true,
        data: data || {},
        meta: {
            facultyName: req.user?.name || 'N/A'
        }
    });
});

const getProjects = asyncHandler(async (req, res) => {
    const membersInclude = {
        model: ProjectMember,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'centre', 'department'] }]
    };
    const includeMembers = {
        include: [
            membersInclude,
            ...buildResearchCenterIncludeArray({ attributes: ['name'], required: false }),
        ],
        order: [['createdAt', 'DESC']]
    };

    if (req.user?.role === 'FACULTY') {
        const userId = req.user?.id || req.user?._id;
        const memberRows = await ProjectMember.findAll({ where: { userId }, attributes: ['projectId'] });
        const memberProjectIds = memberRows.map(m => m.projectId || m._id);

        includeMembers.where = {
            [Op.or]: [
                { facultyId: userId },
                { userId: userId },
                { pi: req.user?.name },
                ...(memberProjectIds.length > 0 ? [{ _id: { [Op.in]: memberProjectIds } }] : [])
            ]
        };
    }

    let projects = [];
    try {
        projects = await Project.findAll(includeMembers);
    } catch (error) {
        console.warn('[ProjectController] getProjects include failed:', error.message);

        try {
            projects = await Project.findAll({
                ...includeMembers,
                include: [membersInclude],
            });
        } catch (fallbackError) {
            console.error('[ProjectController] getProjects fallback failed:', fallbackError.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve projects',
                error: fallbackError.message
            });
        }
    }

    const safeProjects = normalizeResearchCenterResponseList(projects);

    return res.status(200).json({
        success: true,
        data: safeProjects,
        meta: {
            count: safeProjects.length
        }
    });
});

const getProject = asyncHandler(async (req, res) => {
    const membersInclude = {
        model: ProjectMember,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'department', 'centre'] }]
    };

    let project;
    try {
        project = await Project.findByPk(req.params.id, {
            include: [
                membersInclude,
                ...buildResearchCenterIncludeArray({ attributes: ['name'], required: false }),
            ]
        });
    } catch (error) {
        console.warn('[ProjectController] getProject include failed:', error.message);
        project = await Project.findByPk(req.params.id, {
            include: [membersInclude]
        });
    }

    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const installments = await FR.findAll({
        where: { projectId: project._id || project.id },
        order: [['installmentNumber', 'ASC'], ['createdAt', 'ASC']],
        attributes: ['_id', 'installmentNumber', 'requestedAmount', 'purpose', 'status', 'currentStage', 'createdAt', 'faculty']
    });

    const totalAmount = Number(project.sanctionedBudget || 0);
    const disbursedAmount = Number(await Disbursement.sum('amount', {
        where: { projectId: project._id || project.id }
    }) || 0);
    const remainingAmount = Math.max(0, totalAmount - disbursedAmount);

    return res.status(200).json({
        success: true,
        data: {
            ...normalizeResearchCenterResponse(project),
            totalAmount,
            disbursedAmount,
            remainingAmount,
            installments: installments || [],
        }
    });
});

const createProject = asyncHandler(async (req, res) => {
    const { projectSchema } = require('../utils/validation');
    const validated = projectSchema.parse({ body: req.body });
    const data = validated.body;

    const isAdmin = (req.user.role || '').toUpperCase() === 'ADMIN';
    const centreAssignment = await resolveCentreAssignment(
        req.body.centre || req.user.centre || 'Research Centre',
        req.body.centreId || req.user.centreId || null
    );
    const projectData = {
        title: data.title,
        description: data.description,
        sanctionedBudget: Number(data.sanctionedBudget || 0),
        fundingSource: data.fundingSource,
        projectType: (data.projectType || 'PROJECT').toUpperCase(),
        publisher: data.publisher || null,
        publicationYear: data.publicationYear || null,
        status: isAdmin ? (req.body.status || 'ACTIVE').toUpperCase() : 'PENDING',
        userId: isAdmin ? (req.body.facultyId || req.user.id) : req.user.id,
        facultyId: isAdmin ? (req.body.facultyId || null) : req.user.id,
        pi: isAdmin ? (req.body.pi || 'Admin Created') : (req.user.name || req.body.pi || 'Faculty Member'),
        department: req.body.department || req.user.department || 'RESEARCH',
        centre: centreAssignment.centre,
        centreId: centreAssignment.centreId,
        verificationScreenshot: req.body.verificationScreenshot || null
    };
    
    const project = await Project.create(projectData);

    const piUserId = projectData.facultyId || projectData.userId;
    if (piUserId) {
        await ProjectMember.create({
            projectId: project._id || project.id,
            userId: piUserId,
            role: 'PI'
        });
    }

    res.status(201).json({ success: true, data: project || {} });
});

const updateProject = asyncHandler(async (req, res) => {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const updateData = { ...req.body };
    if (req.body.sanctionedBudget !== undefined) {
        updateData.sanctionedBudget = Number(req.body.sanctionedBudget);
    }

    if (req.body.centre || req.body.centreId) {
        const centreAssignment = await resolveCentreAssignment(
            req.body.centre || project.centre,
            req.body.centreId || project.centreId
        );
        updateData.centre = centreAssignment.centre;
        updateData.centreId = centreAssignment.centreId;
        updateData.researchCenterId = centreAssignment.researchCenterId;
    }
    
    if (req.body.proofStatus === 'REJECTED') {
        updateData.proofUploaded = false;
    }
    if (req.body.status) {
        const newStatus = req.body.status.toUpperCase();
        const isActuallyApproved = ['ACTIVE', 'APPROVED'].includes(newStatus);
        const wasNotApproved = !['ACTIVE', 'APPROVED'].includes(project.status);

        if (isActuallyApproved && wasNotApproved) {
            await FR.findOrCreate({
                where: {
                    projectId: project._id || project.id,
                    purpose: `Initial advance for approved project: ${project.title}`,
                },
                defaults: {
                    projectTitle: project.title,
                    projectId: project._id || project.id,
                    faculty: project.pi || 'Faculty Member',
                    facultyId: project.facultyId || project.userId,
                    userId: project.userId,
                    requestedAmount: project.sanctionedBudget || 1,
                    purpose: `Initial advance for approved project: ${project.title}`,
                    status: 'APPROVED',
                    currentStage: 'FUND_APPROVED',
                    department: project.department || 'Research',
                    centre: project.centre || 'Research Centre',
                    centreId: project.centreId || null,
                    researchCenterId: project.researchCenterId || null,
                    source: normalizeFundSource(project.fundingSource || 'INSTITUTIONAL'),
                },
            });
        }
        updateData.status = newStatus;
    }
    await project.update(updateData);

    if (req.body.facultyId) {
        const projectId = project._id || project.id;
        await ProjectMember.destroy({ where: { projectId, role: 'PI' } });
        await ProjectMember.create({
            projectId,
            userId: req.body.facultyId,
            role: 'PI'
        });
    }

    res.status(200).json({ success: true, data: project || {} });
});

const deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const projectTitle = project.title;
    await project.destroy();
    
    console.log(`[PROJECT DELETED] ${projectTitle} (ID: ${req.params.id}) by Admin ${req.user.email}`);
    
    res.status(200).json({ 
        success: true, 
        message: 'Project deleted successfully',
        data: {} 
    });
});

const getProjectMembers = asyncHandler(async (req, res) => {
    const members = await ProjectMember.findAll({
        where: { projectId: req.params.id },
        include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'centre', 'department'] }]
    });
    res.status(200).json({ success: true, data: members || [] });
});

const updateProjectMembers = asyncHandler(async (req, res) => {
    const { piId, memberIds } = req.body;
    const projectId = req.params.id;

    const project = await Project.findByPk(projectId);
    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await ProjectMember.destroy({ where: { projectId } });

    const newMembers = [];

    if (piId) {
        newMembers.push({ projectId, userId: piId, role: 'PI' });
        const piUser = await User.findByPk(piId);
        await project.update({ facultyId: piId, pi: piUser ? piUser.name : 'PI' });
    }

    if (memberIds && Array.isArray(memberIds)) {
        for (const memberId of memberIds) {
            if (memberId !== piId) {
                newMembers.push({ projectId, userId: memberId, role: 'MEMBER' });
            }
        }
    }

    await ProjectMember.bulkCreate(newMembers);

    const updatedMembers = await ProjectMember.findAll({
        where: { projectId },
        include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'centre', 'department'] }]
    });

    res.status(200).json({ success: true, data: updatedMembers || [] });
});

module.exports = {
    getAdminStats,
    getFacultyStats,
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectMembers,
    updateProjectMembers
};
