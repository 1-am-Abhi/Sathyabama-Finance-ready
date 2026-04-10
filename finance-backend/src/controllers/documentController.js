const Document = require('../models/Document');
const NotificationService = require('../services/notificationService');

exports.createDocument = async (req, res) => {
    try {
        const doc = await Document.create({
            facultyId: req.user.id || req.user._id,
            facultyName: req.user.name,
            fileName: req.body.fileName,
            fileType: req.body.fileType,
            documentType: req.body.documentType || 'GENERAL',
            projectName: req.body.projectName || null,
            description: req.body.description || null,
            fileData: req.body.fileData || null,
            status: 'PENDING'
        });
        await NotificationService.notifyRole(
            'ADMIN',
            'Document Uploaded',
            `${req.user.name} uploaded "${doc.fileName}" for verification.`,
            'INFO',
            '/admin/documents'
        );
        res.status(201).json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'FACULTY') {
            where = { facultyId: req.user.id || req.user._id };
        }
        const docs = await Document.findAll({ where, order: [['createdAt', 'DESC']] });
        res.status(200).json({ success: true, data: docs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDocumentStatus = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        doc.status = req.body.status;
        doc.adminRemarks = req.body.adminRemarks || null;
        if (req.body.status === 'VERIFIED') doc.verifiedAt = new Date();
        await doc.save();
        res.status(200).json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDocument = async (req, res) => {
    try {
        const doc = await Document.findOne({ 
            where: { _id: req.params.id, facultyId: req.user.id || req.user._id } 
        });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found or access denied' });
        
        // Reset status to PENDING on re-upload/edit
        doc.status = 'PENDING';
        doc.adminRemarks = null;
        
        if (req.body.fileName) doc.fileName = req.body.fileName;
        if (req.body.fileType) doc.fileType = req.body.fileType;
        if (req.body.documentType) doc.documentType = req.body.documentType;
        if (req.body.projectName) doc.projectName = req.body.projectName;
        if (req.body.description) doc.description = req.body.description;
        if (req.body.fileData) doc.fileData = req.body.fileData;
        
        await doc.save();
        res.status(200).json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
