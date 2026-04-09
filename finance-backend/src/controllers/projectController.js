const Project = require('../models/Project');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');
const { FundRequest } = require('../models/FundRequest');
const EventRequest = require('../models/EventRequest');
const Revenue = require('../models/Revenue');
const { Op } = require('sequelize');

exports.getAdminStats = async (req, res) => {
    try {
        const FundSource = require('../models/FundSource');
        const [totalProjects, activeProjects, pendingApprovals, allSources] = await Promise.all([
            Project.count(),
            Project.count({ where: { status: 'ACTIVE' } }),
            Project.count({ where: { status: 'PENDING' } }),
            FundSource.findAll()
        ]);
        
        // ── PFMS Budget ──
        let pfmsBudget = allSources.find(s => s.sourceType === 'pfmsFunds')?.totalAllocated || 0;
        if (pfmsBudget === 0) {
            pfmsBudget = await Project.sum('sanctionedBudget', { where: { fundingSource: 'PFMS' } }) || 0;
        }

        // ── Institutional (College) Budget ──
        let institutionalBudgetTotal = allSources.find(s => s.sourceType === 'collegeFunds')?.totalAllocated || 0;
        if (institutionalBudgetTotal === 0) {
            const approvedEventBudget = await EventRequest.sum('approvedAmount', { 
                where: { status: 'APPROVED', fundingType: 'College Funded' } 
            }) || 0;
            institutionalBudgetTotal = (await Project.sum('sanctionedBudget', {
                where: { fundingSource: 'INSTITUTIONAL' }
            }) || 0) + approvedEventBudget;
        }

        // ── Director Innovation Fund ──
        let directorBudget = allSources.find(s => s.sourceType === 'directorFunds')?.totalAllocated || 0;
        if (directorBudget === 0) {
            directorBudget = await Project.sum('sanctionedBudget', {
                where: { fundingSource: { [Op.in]: ['DIRECTOR', 'DIRECTOR_INNOVATION', 'DIRECTOR_INNOVATION_FUND'] } }
            }) || 0;
        }

        // ── Others Budget ──
        let othersBudget = await Project.sum('sanctionedBudget', {
            where: { fundingSource: 'OTHERS' }
        }) || 0;

        // ── Disbursements ──
        const pfmsDisbursed = await FundRequest.sum('requestedAmount', { 
            where: { source: 'PFMS', currentStage: { [Op.in]: ['AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED', 'DISBURSED'] } }
        }) || 0;
        
        const institutionalDisbursed = await FundRequest.sum('requestedAmount', { 
            where: { 
                source: 'INSTITUTIONAL', 
                currentStage: { [Op.in]: ['AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED', 'DISBURSED'] } 
            } 
        }) || 0;

        const directorDisbursed = await FundRequest.sum('requestedAmount', { 
            where: { 
                source: { [Op.in]: ['DIRECTOR', 'DIRECTOR_INNOVATION', 'DIRECTOR_INNOVATION_FUND'] },
                currentStage: { [Op.in]: ['AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED', 'DISBURSED'] } 
            } 
        }) || 0;

        const othersDisbursed = await FundRequest.sum('requestedAmount', { 
            where: { 
                source: 'OTHERS', 
                currentStage: { [Op.in]: ['AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED', 'DISBURSED'] } 
            } 
        }) || 0;

        const totalFaculty = await User.count({ where: { role: 'FACULTY' } });

        // ── Revenue Generation ──
        const totalRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED' } }) || 0;
        const consultancyRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Consultancy' } }) || 0;
        const internshipRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Internships' } }) || 0;
        const eventsRevenue = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED', revenueSource: 'Events' } }) || 0;

        // ── Centre-wise Distribution Metrics ──
        const centreAggregates = await Project.findAll({
            attributes: [
                'centreId',
                [Project.sequelize.fn('COUNT', Project.sequelize.col('Project._id')), 'totalProjects'],
                [Project.sequelize.literal(`COUNT(CASE WHEN Project.status IN ('ACTIVE', 'APPROVED') THEN 1 END)`), 'activeProjects'],
                [Project.sequelize.fn('SUM', Project.sequelize.col('sanctionedBudget')), 'projectBudget']
            ],
            include: [
                { model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }
            ],
            group: ['centreId', 'researchCentre._id', 'researchCentre.name']
        });

        const disbursementAggregates = await FundRequest.findAll({
            attributes: [
                'centreId',
                [FundRequest.sequelize.fn('SUM', FundRequest.sequelize.col('requestedAmount')), 'disbursed']
            ],
            where: { currentStage: { [Op.in]: ['AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED', 'DISBURSED'] } },
            group: ['centreId']
        });

        const centreStatsList = centreAggregates.map(c => {
            const disb = disbursementAggregates.find(d => d.centreId === c.centreId);
            return {
                name: c.researchCentre?.name || 'Unassigned',
                totalProjects: parseInt(c.get('totalProjects')) || 0,
                activeProjects: parseInt(c.get('activeProjects')) || 0,
                totalBudget: parseFloat(c.get('projectBudget')) || 0,
                disbursed: parseFloat(disb?.get('disbursed')) || 0
            };
        });

        res.status(200).json({
            success: true,
            stats: {
                totalProjects,
                activeProjects,
                pendingApprovals,
                totalBudget: pfmsBudget + institutionalBudgetTotal + directorBudget + othersBudget,
                totalDisbursed: pfmsDisbursed + institutionalDisbursed + directorDisbursed + othersDisbursed,
                totalFaculty,
                pfmsStats: {
                    allotted: pfmsBudget,
                    consumed: pfmsDisbursed,
                    balance: Math.max(0, pfmsBudget - pfmsDisbursed)
                },
                institutionalStats: {
                    allotted: institutionalBudgetTotal,
                    consumed: institutionalDisbursed,
                    balance: Math.max(0, institutionalBudgetTotal - institutionalDisbursed)
                },
                directorStats: {
                    allotted: directorBudget,
                    consumed: directorDisbursed,
                    balance: Math.max(0, directorBudget - directorDisbursed)
                },
                othersStats: {
                    allotted: othersBudget,
                    consumed: othersDisbursed,
                    balance: Math.max(0, othersBudget - othersDisbursed)
                },
                revenueStats: {
                    total: totalRevenue,
                    consultancy: consultancyRevenue,
                    internships: internshipRevenue,
                    events: eventsRevenue
                }
            },
            centres: centreStatsList
        });
    } catch (error) {
        console.error('Get Admin Stats Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const includeMembers = {
            include: [{
                model: ProjectMember,
                as: 'members',
                include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'centre', 'department'] }]
            }],
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
