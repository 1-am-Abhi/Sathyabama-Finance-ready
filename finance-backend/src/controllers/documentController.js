const asyncHandler = require('../utils/asyncHandler');
const { Document } = require('../models');
const NotificationService = require('../services/notificationService');

const createDocument = asyncHandler(async (req, res) => {
    if (!req.body.fileName) {
        return res.status(400).json({ success: false, message: 'fileName is required', data: null });
    }

    const doc = await Document.create({
        facultyId: req.user._id || req.user.id,
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
    res.status(201).json({ success: true, data: doc || {} });
});

const getDocuments = asyncHandler(async (req, res) => {
  const where = {
    organizationId: req.user.organizationId
  };

  if (req.user.role === 'FACULTY') {
    where.facultyId = req.user.id || req.user._id;
  }

  const docs = await Document.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    success: true,
    data: docs || []
  });
});

const updateDocumentStatus = asyncHandler(async (req, res) => {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
    }
    doc.status = req.body.status;
    doc.adminRemarks = req.body.adminRemarks || null;
    if (req.body.status === 'VERIFIED') {
        doc.verifiedAt = new Date();
    }
    await doc.save();
    res.status(200).json({ success: true, data: doc || {} });
});

const updateDocument = asyncHandler(async (req, res) => {
    const doc = await Document.findOne({ 
        where: { _id: req.params.id, facultyId: req.user._id || req.user.id } 
    });
    if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found or access denied' });
    }
    
    doc.status = 'PENDING';
    doc.adminRemarks = null;
    
    if (req.body.fileName) doc.fileName = req.body.fileName;
    if (req.body.fileType) doc.fileType = req.body.fileType;
    if (req.body.documentType) doc.documentType = req.body.documentType;
    if (req.body.projectName) doc.projectName = req.body.projectName;
    if (req.body.description) doc.description = req.body.description;
    if (req.body.fileData) doc.fileData = req.body.fileData;
    
    await doc.save();
    res.status(200).json({ success: true, data: doc || {} });
});

module.exports = {
    createDocument,
    getDocuments,
    updateDocumentStatus,
    updateDocument
};
