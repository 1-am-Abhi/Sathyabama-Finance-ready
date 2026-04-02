const Project = require('../models/Project');
const User = require('../models/User');
const { FundRequest } = require('../models/FundRequest');
const { Op } = require('sequelize');

exports.getAdminStats = async (req, res) => {
    try {
        const totalProjects = await Project.count();
        const activeProjects = await Project.count({ where: { status: 'ACTIVE' } });
        const pendingApprovals = await Project.count({ where: { status: 'PENDING' } });
        
        // Sums
        const totalBudgetResult = await Project.sum('sanctionedBudget') || 0;
        // Disbursed = fund requests where cheque has been issued/amount disbursed
        const totalDisbursedResult = await FundRequest.sum('requestedAmount', { 
            where: { chequeStatus: 'Disbursed' } 
        }) || 0;
        
        const totalFaculty = await User.count({ where: { role: 'FACULTY' } });

        // Centre-wise distribution
        const centres = await Project.findAll({
            attributes: ['centre', [Project.sequelize.fn('COUNT', Project.sequelize.col('_id')), 'count']],
            group: ['centre']
        });

        res.status(200).json({
            success: true,
            stats: {
                totalProjects,
                activeProjects,
                pendingApprovals,
                totalBudget: totalBudgetResult,
                totalDisbursed: totalDisbursedResult,
                totalFaculty
            },
            centres: centres.map(c => ({
                name: c.centre,
                count: parseInt(c.get('count'))
            }))
        });
    } catch (error) {
        console.error('Get Admin Stats Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        let options = { order: [['createdAt', 'DESC']] };
        // If faculty, only show their projects
        if (req.user.role === 'FACULTY') {
            options.where = {
                [Op.or]: [
                    { facultyId: req.user.id || req.user._id },
                    { userId: req.user.id || req.user._id },
                    { pi: req.user.name }
                ]
            };
        }
        
        const projects = await Project.findAll(options);
        res.status(200).json({ success: true, count: projects.length, data: projects });
    } catch (error) {
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
            ...data,
            sanctionedBudget: Number(data.sanctionedBudget || 0),
            // Admin-created projects are auto-approved; faculty-created ones go to PENDING
            status: isAdmin ? (data.status || 'ACTIVE') : 'PENDING',
            userId: isAdmin ? (req.body.facultyId || req.user.id) : req.user.id,
            facultyId: isAdmin ? (req.body.facultyId || null) : req.user.id,
            pi: isAdmin ? (req.body.pi || 'Admin Created') : (req.user.name || req.body.pi || 'Faculty Member'),
            department: req.body.department || req.user.department || 'RESEARCH',
            centre: req.body.centre || req.user.centre || 'Research Centre'
        };
        
        const project = await Project.create(projectData);
        res.status(201).json({ success: true, data: project });
    } catch (error) {
        console.error('Create Project Error:', error);
        let errorMessage = 'Failed to create work';
        if (error.issues && error.issues.length > 0) {
            errorMessage = error.issues[0].message;
        } else if (error.errors && error.errors.length > 0) {
            errorMessage = error.errors[0].message;
        } else {
            // Unparse if it's a stringified JSON array from Zod
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
        await project.update(updateData);
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
