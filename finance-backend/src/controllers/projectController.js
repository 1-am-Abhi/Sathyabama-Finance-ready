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
        const totalDisbursedResult = await FundRequest.sum('requestedAmount', { where: { status: 'APPROVED' } }) || 0;
        
        const totalFaculty = await User.count({ where: { role: 'FACULTY' } });

        // Centre-wise distribution (mocking the structure but using real-ish logic or just grouping)
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

        const projectData = {
            ...data,
            sanctionedBudget: Number(data.sanctionedBudget),
            userId: req.user.role === 'ADMIN' ? (req.body.facultyId || req.user.id) : req.user.id,
            facultyId: req.user.role === 'ADMIN' ? (req.body.facultyId || req.user.id) : req.user.id,
            pi: req.user.role === 'ADMIN' ? (req.body.pi || 'Admin Created') : req.user.name,
            department: req.body.department || req.user.department || 'RESEARCH',
            centre: req.body.centre || req.user.centre || 'Research Centre'
        };
        
        const project = await Project.create(projectData);
        res.status(201).json({ success: true, data: project });
    } catch (error) {
        console.error('Create Project Error:', error);
        res.status(400).json({ success: false, message: error.errors ? error.errors[0].message : error.message });
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
