const Project = require('../models/Project');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');
const { FundRequest } = require('../models/FundRequest');
const EventRequest = require('../models/EventRequest');
const Revenue = require('../models/Revenue');
const Disbursement = require('../models/Disbursement');
const { Op } = require('sequelize');

exports.getAdminStats = async (req, res) => {
    try {
        const ALLOCATED_STATUSES = ['APPROVED', 'PENDING_DISBURSAL', 'DISBURSED'];

        // ── CORE AGGREGATES ──
        const [totalProjects, activeProjects, pendingApprovals, totalFaculty, totalAllocated, totalDisbursed] = await Promise.all([
            Project.count(),
            Project.count({ where: { status: 'ACTIVE' } }),
            Project.count({ where: { status: 'PENDING' } }),
            User.count({ where: { role: 'FACULTY' } }),
            FundRequest.sum('requestedAmount', { where: { status: { [Op.in]: ALLOCATED_STATUSES } } }),
            Disbursement.sum('amount')
        ]);

        // ── SOURCE-WISE BREAKDOWN (PFMS, Institutional, etc.) ──
        const getSourceStats = async (source) => {
            const sources = Array.isArray(source) ? source : [source];
            const allocated = await FundRequest.sum('requestedAmount', {
                where: { 
                    source: { [Op.in]: sources },
                    status: { [Op.in]: ALLOCATED_STATUSES }
                }
            }) || 0;
            const consumed = await Disbursement.sum('amount', {
                include: [{
                    model: FundRequest,
                    where: { source: { [Op.in]: sources } }
                }]
            }) || 0;
            return { allotted: allocated, consumed, balance: Math.max(0, allocated - consumed) };
        };

        const [pfmsStats, institutionalStats, directorStats, othersStats] = await Promise.all([
            getSourceStats('PFMS'),
            getSourceStats('INSTITUTIONAL'),
            getSourceStats(['DIRECTOR', 'DIRECTOR_INNOVATION', 'DIRECTOR_INNOVATION_FUND']),
            getSourceStats('OTHERS')
        ]);

        // ── REVENUE GENERATION ──
        const totalRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED' } }) || 0;
        const consultancyRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Consultancy' } }) || 0;
        const internshipRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Internships' } }) || 0;
        const eventsRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Events' } }) || 0;

        // ── CENTRE-WISE DISTRIBUTION (FIXED) ──
        // 1. Project counts per centre
        const centresData = await Project.findAll({
            attributes: [
                'centreId',
                [Project.sequelize.fn('COUNT', Project.sequelize.col('Project._id')), 'totalProjects'],
                [Project.sequelize.literal(`COUNT(CASE WHEN Project.status IN ('ACTIVE', 'APPROVED') THEN 1 END)`), 'activeProjects']
            ],
            include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }],
            group: ['centreId', 'researchCentre._id', 'researchCentre.name'],
            raw: true
        });

        // 2. Allocated budget per centre
        const allocationData = await FundRequest.findAll({
            attributes: [
                'centreId',
                [Project.sequelize.fn('SUM', Project.sequelize.col('requestedAmount')), 'totalBudget']
            ],
            where: { status: { [Op.in]: ALLOCATED_STATUSES } },
            group: ['centreId'],
            raw: true
        });

        // 3. Disbursed amount per centre
        const disbursedData = await Disbursement.findAll({
            attributes: [
                [Project.sequelize.col('FundRequest.centreId'), 'centreId'],
                [Project.sequelize.fn('SUM', Project.sequelize.col('Disbursement.amount')), 'disbursed']
            ],
            include: [{ model: FundRequest, attributes: [] }],
            group: [Project.sequelize.col('FundRequest.centreId')],
            raw: true
        });

        // 4. Merge everything
        const centresMap = {};
        centresData.forEach(c => {
            centresMap[c.centreId] = {
                name: c['researchCentre.name'] || 'Unassigned',
                totalProjects: parseInt(c.totalProjects) || 0,
                activeProjects: parseInt(c.activeProjects) || 0,
                totalBudget: 0,
                disbursed: 0
            };
        });

        allocationData.forEach(a => {
            if (centresMap[a.centreId]) centresMap[a.centreId].totalBudget = parseFloat(a.totalBudget) || 0;
        });

        disbursedData.forEach(d => {
            if (centresMap[d.centreId]) centresMap[d.centreId].disbursed = parseFloat(d.disbursed) || 0;
        });

        const data = {
            totalProjects,
            activeProjects,
            pendingApprovals,
            totalAllocated: totalAllocated || 0,
            totalDisbursed: totalDisbursed || 0,
            totalFaculty,
            pfmsStats,
            institutionalStats,
            directorStats,
            othersStats,
            revenueStats: {
                total: totalRevenue,
                consultancy: consultancyRevenue,
                internships: internshipRevenue,
                events: eventsRevenue
            }
        };

        console.log("[PIPELINE] Admin Data Truth:", data);
        res.status(200).json({
            success: true,
            stats: data,
            centres: Object.values(centresMap)
        });
    } catch (error) {
        console.error('getAdminStats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFacultyStats = async (req, res) => {
    try {
        const facultyId = req.user.id || req.user._id;
        const ALLOCATED_STATUSES = ['APPROVED', 'PENDING_DISBURSAL', 'DISBURSED'];

        const [totalProjects, activeProjects, totalAllocated, totalDisbursed] = await Promise.all([
            Project.count({ where: { [Op.or]: [{ facultyId }, { userId: facultyId }] } }),
            Project.count({ where: { [Op.or]: [{ facultyId }, { userId: facultyId }], status: 'ACTIVE' } }),
            FundRequest.sum('requestedAmount', {
                where: { 
                    [Op.or]: [{ facultyId }, { userId: facultyId }],
                    status: { [Op.in]: ALLOCATED_STATUSES }
                }
            }) || 0,
            Disbursement.sum('amount', {
                include: [{
                    model: FundRequest,
                    where: { [Op.or]: [{ facultyId }, { userId: facultyId }] }
                }]
            }) || 0
        ]);

        const data = {
            totalProjects,
            activeProjects,
            totalAllocated,
            totalDisbursed,
            balance: Math.max(0, totalAllocated - totalDisbursed)
        };

        console.log(`[PIPELINE] Faculty Data Truth (${req.user.name}):`, data);
        res.status(200).json({ success: true, stats: data });
    } catch (error) {
        console.error('getFacultyStats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
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

        if (req.user.role === 'FACULTY') {
            const userId = req.user.id || req.user._id;
            // Find project IDs where this user is a member
            const memberRows = await ProjectMember.findAll({ where: { userId }, attributes: ['projectId'] });
            const memberProjectIds = memberRows.map(m => m.projectId);

            includeMembers.where = {
                [Op.or]: [
                    { facultyId: userId },
                    { userId: userId },
                    { pi: req.user.name },
                    ...(memberProjectIds.length > 0 ? [{ _id: { [Op.in]: memberProjectIds } }] : [])
                ]
            };
        }

        const projects = await Project.findAll(includeMembers);
        res.status(200).json({ success: true, count: projects.length, data: projects });
    } catch (error) {
        console.error('Get Projects Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProject = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.status(200).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProject = async (req, res) => {
    try {
        const { projectSchema } = require('../utils/validation');
        const validated = projectSchema.parse({ body: req.body });
        const data = validated.body;

        const isAdmin = (req.user.role || '').toUpperCase() === 'ADMIN';
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
            centre: req.body.centre || req.user.centre || 'Research Centre',
            verificationScreenshot: req.body.verificationScreenshot || null
        };
        
        const project = await Project.create(projectData);

        // SYNC: Add the PI/Owner as a ProjectMember so project counts work
        await ProjectMember.create({
            projectId: project._id || project.id,
            userId: projectData.facultyId || projectData.userId,
            role: 'PI'
        });

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
                await FundRequest.create({
                    projectTitle: project.title,
                    projectId: project._id || project.id,
                    faculty: project.pi || 'Faculty Member',
                    facultyId: project.facultyId || project.userId,
                    userId: project.userId,
                    requestedAmount: project.sanctionedBudget || 1, // Default 1 if not set
                    purpose: `Initial advance for approved project: ${project.title}`,
                    status: 'APPROVED',
                    currentStage: 'FUND_APPROVED',
                    department: project.department || 'Research',
                    centre: project.centre || 'Research Centre',
                    source: (project.fundingSource || 'INSTITUTIONAL').toUpperCase()
                });
            }
            updateData.status = newStatus;
        }
        await project.update(updateData);

        // SYNC: If facultyId changed, update the PI in ProjectMembers
        if (req.body.facultyId) {
            await ProjectMember.destroy({ where: { projectId: project.id, role: 'PI' } });
            await ProjectMember.create({
                projectId: project.id,
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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
    }
};
