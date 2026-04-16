const { serverError } = require("../utils/controllerError");
const Project = require('../models/Project');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');
const { FundRequest } = require('../models/FundRequest');
const EventRequest = require('../models/EventRequest');
const Revenue = require('../models/Revenue');
const Disbursement = require('../models/Disbursement');
const { Op } = require('sequelize');
const Centre = require('../models/Centre');
const {
    getAdminDashboardData,
    getFacultyDashboardData,
} = require('../services/pipelineMetricsService');
const { normalizeFundSource } = require('../services/fundSourceCatalogService');
const asyncHandler = require('../utils/asyncHandler');

const resolveCentreAssignment = async (centreInput, centreIdInput) => {
    if (centreIdInput) {
        const centre = await Centre.findByPk(centreIdInput);
        if (centre) {
            return { centreId: centre._id || centre.id, centre: centre.name };
        }
    }

    if (centreInput) {
        const centre = await Centre.findOne({ where: { name: centreInput } });
        if (centre) {
            return { centreId: centre._id || centre.id, centre: centre.name };
        }
        return { centreId: null, centre: centreInput };
    }

    return { centreId: null, centre: null };
};


exports.getAdminStats = asyncHandler(async (req, res) => {
    const adminData = await getAdminDashboardData();
    const [totalRevenue, consultancyRevenue, internshipRevenue, eventsRevenue] = await Promise.all([
        Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED' } }) || 0,
        Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Consultancy' } }) || 0,
        Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Internships' } }) || 0,
        Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Events' } }) || 0,
    ]);

    const stats = {
        ...(adminData?.stats || {}),
        revenueStats: {
            total: totalRevenue || 0,
            consultancy: consultancyRevenue || 0,
            internships: internshipRevenue || 0,
            events: eventsRevenue || 0,
        },
    };

    return res.status(200).json({
        success: true,
        data: stats,
        meta: {
            centres: adminData?.centres || [],
        }
    });
});

exports.getFacultyStats = asyncHandler(async (req, res) => {
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

exports.getProjects = asyncHandler(async (req, res) => {
    const includeMembers = {
        include: [
            {
                model: ProjectMember,
                as: 'members',
                include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'centre', 'department'] }]
            },
            { model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }
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

    const projects = await Project.findAll(includeMembers);

    return res.status(200).json({
        success: true,
        data: projects || [],
        meta: {
            count: projects?.length || 0
        }
    });
});


/**
 * GET /projects/:id
 * Returns full project details including:
 *   - Budget summary: totalAmount, disbursedAmount, remainingAmount
 *   - Team members
 *   - All fund requests (installments) sorted by installmentNumber
 */
exports.getProject = asyncHandler(async (req, res) => {
    const project = await Project.findByPk(req.params.id, {
        include: [
            {
                model: ProjectMember,
                as: 'members',
                include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'department', 'centre'] }]
            },
            { model: Centre, as: 'researchCentre', attributes: ['name'] }
        ]
    });

    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { FundRequest: FR } = require('../models/FundRequest');
    const installments = await FR.findAll({
        where: { projectId: project._id || project.id },
        order: [['installmentNumber', 'ASC'], ['createdAt', 'ASC']],
        attributes: ['_id', 'installmentNumber', 'requestedAmount', 'purpose', 'status', 'currentStage', 'createdAt', 'faculty']
    });

    const totalAmount = Number(project.sanctionedBudget || 0);
    const disbursedAmount = Number(project.releasedBudget || 0);
    const remainingAmount = Math.max(0, totalAmount - disbursedAmount);

    return res.status(200).json({
        success: true,
        data: {
            ...project.toJSON(),
            totalAmount,
            disbursedAmount,
            remainingAmount,
            installments: installments || [],
        }
    });
});



exports.createProject = async (req, res) => {
    try {
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
            // Status is ALWAYS set server-side — never trust client
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

        // SYNC: Add the PI/Owner as a ProjectMember so project counts work
        const piUserId = projectData.facultyId || projectData.userId;
        if (piUserId) {
            await ProjectMember.create({
                projectId: project._id || project.id,
                userId: piUserId,
                role: 'PI'
            });
        }

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        console.error('Create Project Error:', error);
        let errorMessage = 'Failed to create work';
        if (error.issues && error.issues.length > 0) {
            errorMessage = error.issues[0].message;
        } else if (error.errors && error.errors.length > 0) {
            errorMessage = error.errors[0].message;
        } else {
            try {
                const parsed = JSON.parse(error.message);
                if (Array.isArray(parsed) && parsed[0].message) {
                    errorMessage = parsed[0].message;
                } else {
                    errorMessage = error.message;
                }
            } catch (e) {
                errorMessage = error.message;
            }
        }
        res.status(400).json({ success: false, message: errorMessage });
    }
};

exports.updateProject = async (req, res) => {
    try {
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
        }
        
        if (req.body.proofStatus === 'REJECTED') {
            updateData.proofUploaded = false;
        }
        if (req.body.status) {
            const newStatus = req.body.status.toUpperCase();
            // Automation: If project is being approved (ACTIVE or APPROVED), create an initial fund request
            const isActuallyApproved = ['ACTIVE', 'APPROVED'].includes(newStatus);
            const wasNotApproved = !['ACTIVE', 'APPROVED'].includes(project.status);

            if (isActuallyApproved && wasNotApproved) {
                const { FundRequest } = require('../models/FundRequest');
                await FundRequest.findOrCreate({
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
                        status: 'PENDING_DISBURSAL',
                        currentStage: 'FUND_APPROVED',
                        department: project.department || 'Research',
                        centre: project.centre || 'Research Centre',
                        centreId: project.centreId || null,
                        source: normalizeFundSource(project.fundingSource || 'INSTITUTIONAL'),
                    },
                });
            }
            updateData.status = newStatus;
        }
        await project.update(updateData);

        // SYNC: If facultyId changed, update the PI in ProjectMembers
        if (req.body.facultyId) {
            const projectId = project._id || project.id;
            await ProjectMember.destroy({ where: { projectId, role: 'PI' } });
            await ProjectMember.create({
                projectId,
                userId: req.body.facultyId,
                role: 'PI'
            });
        }

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        await project.destroy();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        return serverError(res, error);
    }
};

// Get members for a specific project
exports.getProjectMembers = async (req, res) => {
    try {
        const members = await ProjectMember.findAll({
            where: { projectId: req.params.id },
            include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'centre', 'department'] }]
        });
        res.status(200).json({ success: true, data: members });
    } catch (error) {
        return serverError(res, error);
    }
};

// Update team: receives { piId, memberIds[] }
exports.updateProjectMembers = async (req, res) => {
    try {
        const { piId, memberIds } = req.body;
        const projectId = req.params.id;

        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Remove all existing members for this project
        await ProjectMember.destroy({ where: { projectId } });

        const newMembers = [];

        // Add PI
        if (piId) {
            newMembers.push({ projectId, userId: piId, role: 'PI' });
            // Also update the legacy fields on Project for backward compat
            const piUser = await User.findByPk(piId);
            await project.update({ facultyId: piId, pi: piUser ? piUser.name : 'PI' });
        }

        // Add other members (exclude PI to avoid duplicate)
        if (memberIds && memberIds.length > 0) {
            for (const memberId of memberIds) {
                if (memberId !== piId) {
                    newMembers.push({ projectId, userId: memberId, role: 'MEMBER' });
                }
            }
        }

        await ProjectMember.bulkCreate(newMembers);

        // Fetch the updated members with user details
        const updatedMembers = await ProjectMember.findAll({
            where: { projectId },
            include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'centre', 'department'] }]
        });

        res.status(200).json({ success: true, data: updatedMembers });
    } catch (error) {
        console.error('Update Project Members Error:', error);
        return serverError(res, error);
    }
};
