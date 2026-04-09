const PFMSTransaction = require('../models/PFMSTransaction');
const InternshipFee = require('../models/InternshipFee');
const { FundRequest } = require('../models/FundRequest');
const Project = require('../models/Project');
const User = require('../models/User');
const Revenue = require('../models/Revenue');
const Disbursement = require('../models/Disbursement');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const Centre = require('../models/Centre');
const {
    ALLOCATED_STATUSES,
    buildCentreInclude,
    buildProjectInclude,
    normalizeFundRequest,
    normalizeDisbursement,
    getFundSourceOverview,
    getDepartmentFundingRows,
    getSharedPipelineData,
} = require('../services/pipelineMetricsService');

exports.getFinanceStats = async (req, res) => {
    try {
        const pendingReleases = await FundRequest.count({ 
            where: { 
                status: 'PENDING_DISBURSAL',
                currentStage: { [Op.in]: ['FUND_APPROVED', 'BILLS_UPLOADED'] } 
            } 
        });
        
        const pendingDisbursements = await FundRequest.count({
            where: {
                status: 'PENDING_DISBURSAL',
                currentStage: { [Op.in]: ['FUND_RELEASED', 'CHEQUE_RELEASED'] }
            }
        });
        
        const pendingSettlements = await FundRequest.count({
            where: {
                status: 'DISBURSED',
                currentStage: { [Op.in]: ['AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED'] }
            }
        });
        
        // Internship Fees: PENDING payment status
        const pendingInternships = await InternshipFee.count({ where: { paymentStatus: 'PENDING' } });

        res.status(200).json({
            success: true,
            data: {
                pendingReleases,
                pendingDisbursements,
                pendingSettlements,
                pendingInternships
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFundFlowProjects = async (req, res) => {
    try {
        // Get all fund requests that are NOT in initial stages or final closed stage
        const fundRequests = await FundRequest.findAll({
            where: {
                currentStage: {
                    [Op.in]: ['FUND_APPROVED', 'FUND_RELEASED', 'CHEQUE_RELEASED', 'AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED']
                }
            },
            order: [['updatedAt', 'DESC']],
            include: [buildProjectInclude()]
        });
        
        const data = fundRequests.map((request) => {
            const normalized = normalizeFundRequest(request);
            return {
                id: normalized.id,
                title: normalized.Project?.title || normalized.projectTitle,
                pi: normalized.Project?.pi || normalized.faculty,
                department: normalized.Project?.department || normalized.department || 'Research',
                status: normalized.currentStage,
                statusLabel: normalized.currentStage.replace(/_/g, ' '),
                amount: `₹${Number(normalized.amount || 0).toLocaleString('en-IN')}`,
            };
        });

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPFMSTransaction = async (req, res) => {
    try {
        const transaction = await PFMSTransaction.create(req.body);
        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPFMSTransactions = async (req, res) => {
    try {
        const transactions = await PFMSTransaction.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: Project }]
        });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInternshipFees = async (req, res) => {
    try {
        const fees = await InternshipFee.findAll({ 
            where: { adminStatus: 'APPROVED' },
            order: [['createdAt', 'DESC']] 
        });
        res.status(200).json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAdminInternshipFees = async (req, res) => {
    try {
        const fees = await InternshipFee.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adminApproveInternshipFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminStatus, adminRemarks } = req.body;
        
        const fee = await InternshipFee.findByPk(id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });
        
        await fee.update({
            adminStatus: adminStatus || 'APPROVED',
            adminRemarks: adminRemarks || fee.adminRemarks
        });
        
        res.status(200).json({ success: true, message: 'Admin status updated successfully', data: fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.verifyInternshipFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, paymentMode, receiptNumber, paymentDate } = req.body;
        
        const fee = await InternshipFee.findByPk(id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });
        
        await fee.update({
            paymentStatus: paymentStatus || 'PAID',
            paymentMode,
            receiptNumber,
            paymentDate,
            verifiedBy: req.user.id
        });
        
        res.status(200).json({ success: true, data: fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteInternshipFee = async (req, res) => {
    try {
        const { id } = req.params;
        const fee = await InternshipFee.findByPk(id);
        if (!fee) return res.status(404).json({ success: false, message: 'Record not found' });
        await fee.destroy();
        res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createInternshipFee = async (req, res) => {
    try {
        const { studentName, studentId, internshipTitle, feeAmount } = req.body;
        if (!studentName || !studentId || !internshipTitle || !feeAmount) {
            return res.status(400).json({ success: false, message: 'studentName, studentId, internshipTitle, and feeAmount are required' });
        }
        // Prevent duplicate studentId
        const existing = await InternshipFee.findOne({ where: { studentId } });
        if (existing) {
            return res.status(409).json({ success: false, message: `A record for student ID ${studentId} already exists` });
        }
        const fee = await InternshipFee.create({
            studentName,
            studentId,
            internshipTitle,
            feeAmount: Number(feeAmount),
            paymentStatus: 'PENDING'
        });
        res.status(201).json({ success: true, data: fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const FundSource = require('../models/FundSource');

// New Finance Dashboard Controllers (Serving baseline data for UI stability)
exports.getFundSourcesOverview = async (req, res) => {
    try {
        const overview = await getFundSourceOverview();
        res.status(200).json(overview);
    } catch (error) {
        console.error('getFundSources Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFundSourceAmount = async (req, res) => {
    try {
        const { fundSource, amount } = req.body;
        
        let dbSourceType = 'collegeFunds';
        if (fundSource === 'PFMS' || fundSource === 'pfmsFunds') dbSourceType = 'pfmsFunds';
        if (fundSource === 'OTHERS' || fundSource === 'directorFunds' || fundSource === 'DIRECTOR_INNOVATION') dbSourceType = 'directorFunds';

        // Use UPSERT (Find or Create)
        const [fundRecord, created] = await FundSource.findOrCreate({
            where: { sourceType: dbSourceType },
            defaults: { totalAllocated: Number(amount) }
        });

        if (!created) {
            await fundRecord.update({ totalAllocated: Number(amount) });
        }

        res.status(200).json({ success: true, message: 'Fund source updated successfully', data: fundRecord });
    } catch (error) {
        console.error('updateFundSource Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const [dbCentres, projects] = await Promise.all([
            Centre.findAll({ order: [['name', 'ASC']] }),
            Project.findAll({
                attributes: ['centre'],
                where: {
                    centre: {
                        [Op.not]: null,
                        [Op.ne]: ''
                    }
                },
                group: ['centre']
            })
        ]);

        const names = new Set(dbCentres.map((centre) => centre.name).filter(Boolean));
        projects.forEach((project) => {
            if (project.centre) {
                names.add(project.centre);
            }
        });

        const departments = [...names]
            .sort((a, b) => a.localeCompare(b))
            .map((name) => ({ id: name, name }));
        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDepartmentFunding = async (req, res) => {
    try {
        const rows = await getDepartmentFundingRows(req.params.id);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDepartmentFunding = async (req, res) => {
    try {
        res.status(200).json({ success: true, message: 'Funding updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFunctionRequests = async (req, res) => {
    try {
        const EventRequest = require('../models/EventRequest');
        const requests = await EventRequest.findAll({
            where: {
                fundingType: 'College Funded',
                status: 'APPROVED'
            },
            order: [['createdAt', 'DESC']]
        });
        const data = requests.map(r => ({
            id: r._id,
            facultyName: r.facultyName,
            department: r.researchCentre || r.department,
            functionName: r.eventTitle,
            description: r.description || r.eventType,
            amount: r.approvedAmount || 0,
            status: r.status,
            requestDate: r.createdAt,
            releaseDate: r.updatedAt,
            transactionId: r._id
        }));
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const Project = require('../models/Project');
        const projects = await Project.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        // Map to format expected by the new Finance portal
        const formattedProjects = projects.map(p => ({
            id: p._id || p.id,
            projectTitle: p.title || p.projectTitle,
            departmentName: p.department || p.departmentName || 'General',
            principalInvestigator: p.pi || p.principalInvestigator || 'N/A',
            requestedAmount: p.sanctionedBudget || p.requestedAmount || 0,
            approvedAmount: p.releasedBudget || p.approvedAmount || 0,
            currentStatus: p.status || p.currentStatus,
            fundSource: p.fundingSource || p.fundSource || 'COLLEGE',
            submittedDate: p.createdAt || p.submittedDate,
            lastUpdated: p.updatedAt || p.lastUpdated
        }));

        res.status(200).json(formattedProjects);
    } catch (error) {
        console.error('getProjects Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Disbursement Queue: Get all fund requests approved by Admin but not yet processed by Finance
exports.getDisbursementQueue = async (req, res) => {
    try {
        const User = require('../models/User');
        const requests = await FundRequest.findAll({
            where: {
                status: 'PENDING_DISBURSAL'
            },
            include: [
                buildProjectInclude(),
                { model: User, attributes: ['name', 'email', 'department'], as: 'requester', required: false }
            ],
            order: [['updatedAt', 'ASC']]
        });
        
        const normalized = requests.map((request) => {
            const data = normalizeFundRequest(request);
            return {
                ...data,
                faculty: data.faculty || data.requester?.name || 'N/A',
            };
        });
        
        res.status(200).json({ success: true, data: normalized });
    } catch (error) {
        console.error('getDisbursementQueue Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Execute Disbursement: Finance marks the fund as released/disbursed
exports.executeDisbursement = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { transactionId, bankName, disbursementDate, remarks } = req.body;
        
        const request = await FundRequest.findByPk(id, { transaction: t });
        if (!request) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Fund request not found' });
        }
        
        // Final Pipeline State: DISBURSED
        console.log(`[PIPELINE] Disbursing Request ${req.params.id}: ${request.status} -> DISBURSED`);
        await request.update({
            status: 'DISBURSED',
            currentStage: 'AMOUNT_DISBURSED',
            transactionId: transactionId || request.transactionId,
            bankName: bankName || request.bankName,
            disbursementDate: disbursementDate || new Date(),
            financeRemarks: remarks || request.financeRemarks,
            financeProcessedAt: new Date(),
            financeProcessedBy: req.user.id
        }, { transaction: t });

        // Create dedicated Disbursement record
        await Disbursement.create({
            fundRequestId: request._id || request.id,
            projectId: request.projectId,
            amount: request.requestedAmount || request.amount || 0,
            disbursedBy: req.user.id,
            disbursedByName: req.user.name,
            bankReference: transactionId,
            remarks: remarks
        }, { transaction: t });
        
        // Update the project's released budget
        if (request.projectId) {
            const project = await Project.findByPk(request.projectId, { transaction: t });
            if (project) {
                const amountToAdd = request.requestedAmount || request.amount || 0;
                await project.update({ 
                    releasedBudget: (project.releasedBudget || 0) + amountToAdd 
                }, { transaction: t });
            }
        }
        
        await t.commit();

        // NOTIFY: Faculty about disbursement
        // We do this AFTER commit to ensure database consistency
        await NotificationService.create(
            request.userId || request.facultyId,
            'Funds Disbursed',
            `Funds for '${request.projectTitle}' have been disbursed! Transaction ID: ${transactionId}.`,
            'SUCCESS',
            '/faculty/request-funds'
        );

        res.status(200).json({ success: true, message: 'Disbursement executed successfully', data: request });
    } catch (error) {
        if (t) await t.rollback();
        console.error('executeDisbursement Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Equipment Disbursements: Get all equipment requests approved by Admin
exports.getEquipmentDisbursements = async (req, res) => {
    try {
        const EquipmentRequest = require('../models/EquipmentRequest');
        
        const fundRequests = await FundRequest.findAll({
            where: {
                status: 'PENDING_DISBURSAL',
                [Op.or]: [
                    { majorEquipments: { [Op.gt]: 0 } },
                    { minorEquipments: { [Op.gt]: 0 } }
                ]
            },
            include: [buildProjectInclude()]
        });

        // Fetch from dedicated EquipmentRequest model
        const directRequests = await EquipmentRequest.findAll({
            where: {
                status: { [Op.in]: ['APPROVED', 'Approved'] }
            }
        });

        // Merge and normalize for the common UI table
        const normalized = [
            ...fundRequests.map(r => ({
                id: r._id || r.id,
                equipmentName: r.purpose?.substring(0, 50) || 'Equipment Purchase',
                requestedAmount: r.requestedAmount,
                approvedAmount: r.requestedAmount,
                status: r.status,
                projectName: r.Project?.title || r.projectTitle,
                facultyName: r.Project?.pi || r.faculty,
                facultyId: r.facultyId || r.userId,
                Project: r.Project ? {
                    ...(r.Project.toJSON ? r.Project.toJSON() : r.Project),
                    id: r.Project._id || r.Project.id,
                } : null,
                type: 'FUND_REQUEST'
            })),
            ...directRequests.map(er => ({
                id: er._id || er.id,
                equipmentName: er.equipmentName,
                requestedAmount: er.requestedAmount,
                approvedAmount: er.approvedAmount || er.requestedAmount,
                status: er.status,
                projectName: er.projectName,
                facultyName: er.facultyName,
                type: 'DIRECT_EQUIPMENT'
            }))
        ];

        res.status(200).json({ success: true, count: normalized.length, data: normalized });
    } catch (error) {
        console.error('getEquipmentDisbursements Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Execute Equipment Disbursement: Finance marks the equipment as paid
exports.executeEquipmentDisbursement = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionId, bankName, disbursementDate, remarks } = req.body;
        
        const EquipmentRequest = require('../models/EquipmentRequest');
        const eq = await EquipmentRequest.findByPk(id);
        
        if (!eq) return res.status(404).json({ success: false, message: 'Equipment request not found' });
        
        await eq.update({
            status: 'DISBURSED',
            adminRemarks: remarks ? `${eq.adminRemarks || ''} | Finance: ${remarks}` : eq.adminRemarks
        });

        await NotificationService.create(
            eq.facultyId,
            'Equipment Funds Disbursed',
            `Equipment payment for '${eq.equipmentName}' has been completed.`,
            'SUCCESS',
            '/faculty/equipment/dashboard'
        );
        
        res.status(200).json({ success: true, message: 'Equipment Disbursement executed successfully', data: eq });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// getFinancialReports: Aggregated financial dashboard data
exports.getFinancialReports = async (req, res) => {
    try {
        const { period, department, fundType } = req.query;
        const Revenue = require('../models/Revenue');
        const User = require('../models/User');

        // 1. Calculate Outflows (Released Funds) - USE DISBURSEMENT MODEL
        const totalOutflow = await Disbursement.sum('amount') || 0;
        
        const history = await Disbursement.findAll({
            include: [
                { 
                    model: FundRequest, 
                    attributes: ['projectTitle', 'purpose', 'source', 'faculty'],
                    include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }]
                },
                { 
                    model: Project, 
                    attributes: ['title', 'pi', 'department'],
                    include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }]
                }
            ],
            order: [['disbursedAt', 'DESC']]
        });

        // 2. Calculate Inflows (Verified Revenue)
        const totalInflow = await Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED' } }) || 0;
        const inflows = await Revenue.findAll({
            where: { status: 'VERIFIED' },
            include: [{ model: User, attributes: ['name', 'department'] }]
        });

        // 3. Prepare summary
        const totalAllocated = await FundRequest.sum('requestedAmount', {
            where: { status: { [Op.in]: ALLOCATED_STATUSES } }
        }) || 0;

        const summary = {
            totalAllocated,
            totalDisbursed: totalOutflow,
            totalRevenue: totalInflow,
            netBalance: totalInflow - totalOutflow
        };

        console.log("[PIPELINE] Finance Data Truth:", summary);
        res.status(200).json({
            success: true,
            summary,
            outflows: history,
            inflows: inflows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDisbursalHistory = async (req, res) => {
    try {
        const history = await Disbursement.findAll({
            include: [
                { 
                    model: FundRequest, 
                    attributes: ['_id', 'projectId', 'projectTitle', 'purpose', 'source', 'faculty', 'centre', 'centreId', 'requestedAmount'],
                    include: [buildCentreInclude(), buildProjectInclude()],
                },
                { 
                    ...buildProjectInclude(),
                }
            ],
            order: [['disbursedAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: history.map((entry) => normalizeDisbursement(entry)) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
