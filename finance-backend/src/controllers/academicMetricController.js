const { serverError } = require("../utils/controllerError");
const AcademicMetric = require('../models/AcademicMetric');
const User = require('../models/User');

exports.getMetrics = async (req, res) => {
    try {
        const cycle = req.query.cycle || '2024-25';
        const facultyId = req.user.role === 'ADMIN' ? req.query.facultyId : req.user.id;
        
        if (!facultyId && req.user.role !== 'ADMIN') return res.status(400).json({ success: false, message: 'FacultyId required' });

        let metrics = await AcademicMetric.findOne({ where: { facultyId, cycle } });
        if (!metrics && req.user.role === 'FACULTY') {
            metrics = await AcademicMetric.create({ facultyId, cycle, facultyName: req.user.name, status: 'APPROVED' });
        }
        
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.getAllMetrics = async (req, res) => {
    try {
        const cycle = req.query.cycle || '2024-25';
        const metrics = await AcademicMetric.findAll({ where: { cycle } });
        res.status(200).json({ success: true, count: metrics.length, data: metrics });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.getPendingMetrics = async (req, res) => {
    try {
        const metrics = await AcademicMetric.findAll({ where: { status: 'PENDING_APPROVAL' } });
        res.status(200).json({ success: true, count: metrics.length, data: metrics });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.updateMetrics = async (req, res) => {
    try {
        const { cycle } = req.body;
        const facultyId = req.user.id;
        
        let metrics = await AcademicMetric.findOne({ where: { facultyId, cycle: cycle || '2024-25' } });
        
        const updateData = {
            ...req.body,
            facultyId,
            facultyName: req.user.name,
            status: 'PENDING_APPROVAL'
        };

        if (!metrics) {
            metrics = await AcademicMetric.create(updateData);
        } else {
            await metrics.update(updateData);
        }
        
        res.status(200).json({ success: true, data: metrics, message: 'Metrics submitted for admin approval' });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.approveMetrics = async (req, res) => {
    try {
        const metrics = await AcademicMetric.findByPk(req.params.id);
        if (!metrics) return res.status(404).json({ success: false, message: 'Metrics not found' });
        
        await metrics.update({ status: 'APPROVED', remarks: req.body.remarks || 'Approved by Admin' });
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        return serverError(res, error);
    }
};

exports.rejectMetrics = async (req, res) => {
    try {
        const metrics = await AcademicMetric.findByPk(req.params.id);
        if (!metrics) return res.status(404).json({ success: false, message: 'Metrics not found' });
        
        await metrics.update({ status: 'REJECTED', remarks: req.body.remarks });
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        return serverError(res, error);
    }
};
