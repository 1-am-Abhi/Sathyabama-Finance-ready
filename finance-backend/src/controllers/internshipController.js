const { InternshipFee, User, Revenue } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { serverError } = require('../utils/controllerError');

/**
 * @desc    Get all internship fees (Finance/Admin)
 * @route   GET /api/finance/internship-fees
 * @access  Private (FINANCE_OFFICER, ADMIN)
 */
const getInternshipFees = asyncHandler(async (req, res) => {
    const fees = await InternshipFee.findAll({
        include: [{ model: User, as: 'verifier', attributes: ['name', 'email'] }],
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
        success: true,
        data: fees || []
    });
});

/**
 * @desc    Get all internship records for admin approval
 * @route   GET /api/finance/admin-internships
 * @access  Private (ADMIN)
 */
const getAdminInternships = asyncHandler(async (req, res) => {
    const fees = await InternshipFee.findAll({
        where: { paymentStatus: 'PAID' }, // Typically admin approves paid ones or those pending approval
        include: [{ model: User, as: 'verifier', attributes: ['name', 'email'] }],
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
        success: true,
        data: fees || []
    });
});

/**
 * @desc    Create a new internship fee record
 * @route   POST /api/finance/internship-fees
 * @access  Private (FINANCE_OFFICER, ADMIN)
 */
const createInternshipFee = asyncHandler(async (req, res) => {
    const { studentName, studentId, internshipTitle, feeAmount, paymentMode, receiptNumber, paymentDate } = req.body;

    const fee = await InternshipFee.create({
        studentName,
        studentId,
        internshipTitle,
        feeAmount,
        paymentMode,
        receiptNumber,
        paymentDate,
        paymentStatus: receiptNumber ? 'PAID' : 'PENDING'
    });

    res.status(201).json({
        success: true,
        data: fee
    });
});

/**
 * @desc    Update internship fee record
 * @route   PUT /api/finance/internship-fees/:id
 * @access  Private (FINANCE_OFFICER, ADMIN)
 */
const updateInternshipFee = asyncHandler(async (req, res) => {
    const fee = await InternshipFee.findByPk(req.params.id);

    if (!fee) {
        return res.status(404).json({ success: false, message: 'Record not found' });
    }

    await fee.update(req.body);

    res.status(200).json({
        success: true,
        data: fee
    });
});

/**
 * @desc    Delete internship fee record
 * @route   DELETE /api/finance/internship-fees/:id
 * @access  Private (ADMIN)
 */
const deleteInternshipFee = asyncHandler(async (req, res) => {
    const fee = await InternshipFee.findByPk(req.params.id);

    if (!fee) {
        return res.status(404).json({ success: false, message: 'Record not found' });
    }

    await fee.destroy();

    res.status(200).json({
        success: true,
        message: 'Record deleted successfully'
    });
});

/**
 * @desc    Verify internship fee payment
 * @route   PUT /api/finance/internship-fees/:id/verify
 * @access  Private (FINANCE_OFFICER)
 */
const verifyInternshipFee = asyncHandler(async (req, res) => {
    const { paymentStatus, receiptNumber, paymentDate, paymentMode } = req.body;
    const fee = await InternshipFee.findByPk(req.params.id);

    if (!fee) {
        return res.status(404).json({ success: false, message: 'Record not found' });
    }

    await fee.update({
        paymentStatus: paymentStatus || 'PAID',
        receiptNumber,
        paymentDate,
        paymentMode,
        verifiedBy: req.user.id || req.user._id
    });

    res.status(200).json({
        success: true,
        data: fee
    });
});

/**
 * @desc    Approve/Reject internship (Admin)
 * @route   PUT /api/finance/admin-internships/:id/approve
 * @access  Private (ADMIN)
 */
const approveInternship = asyncHandler(async (req, res) => {
    const { status, adminStatus, remarks, adminRemarks } = req.body;
    const fee = await InternshipFee.findByPk(req.params.id);
 
    if (!fee) {
        return res.status(404).json({ success: false, message: 'Record not found' });
    }
 
    const finalStatus = adminStatus || status || 'APPROVED';
    const finalRemarks = adminRemarks || remarks;
 
    await fee.update({
        adminStatus: finalStatus,
        adminRemarks: finalRemarks
    });
 
    // If approved and paid, we might want to log it as Revenue
    if (finalStatus === 'APPROVED' && fee.paymentStatus === 'PAID') {
        await Revenue.create({
            title: `Internship Fee - ${fee.studentName}`,
            amount: fee.feeAmount,
            verifiedAmount: fee.feeAmount,
            revenueSource: 'Internships',
            status: 'VERIFIED',
            date: fee.paymentDate || new Date(),
            userId: req.user.id || req.user._id,
            description: `Internship Title: ${fee.internshipTitle}, Student ID: ${fee.studentId}`
        });
    }

    res.status(200).json({
        success: true,
        data: fee
    });
});

module.exports = {
    getInternshipFees,
    getAdminInternships,
    createInternshipFee,
    updateInternshipFee,
    deleteInternshipFee,
    verifyInternshipFee,
    approveInternship
};
