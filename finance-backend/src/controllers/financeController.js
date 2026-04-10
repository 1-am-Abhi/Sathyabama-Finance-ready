const PFMSTransaction = require('../models/PFMSTransaction');
const InternshipFee = require('../models/InternshipFee');
const { FundRequest } = require('../models/FundRequest');
const Project = require('../models/Project');
const User = require('../models/User');
const Revenue = require('../models/Revenue');
const Disbursement = require('../models/Disbursement');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const Centre = require('../models/Centre');
const EventRequest = require('../models/EventRequest');
const {
    buildCentreInclude,
    buildProjectInclude,
    normalizeFundRequest,
    normalizeDisbursement,
    getFundSourceOverview,
    getDepartmentFundingRows,
    getSharedPipelineData,
    getFundingTotals,
} = require('../services/pipelineMetricsService');
const {
    executeDisbursementPipeline,
    getEventMarker,
    mapToFundSourceKey,
} = require('../services/financePipelineService');

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
        const fundingTotals = await getFundingTotals();

        res.status(200).json({
            success: true,
            data: {
                pendingReleases,
                pendingDisbursements,
                pendingSettlements,
                pendingInternships,
                totalAllocated: fundingTotals.totalAllocated,
                totalUsed: fundingTotals.totalUsed,
                totalDisbursed: fundingTotals.totalDisbursed,
                remaining: fundingTotals.remaining,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFinanceDashboard = async (req, res) => {
    try {
        const [shared, fundingTotals, fundSources] = await Promise.all([
            getSharedPipelineData(),
            getFundingTotals(),
            getFundSourceOverview(),
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalAllocated: fundingTotals.totalAllocated,
                totalUsed: fundingTotals.totalUsed,
                totalDisbursed: fundingTotals.totalDisbursed,
                remaining: fundingTotals.remaining,
                totalProjects: shared.projects.length,
                activeProjects: shared.projects.filter((project) => ['ACTIVE', 'APPROVED'].includes(project.status)).length,
                pendingDisbursements: shared.fundRequests.filter((request) => request.status === 'PENDING_DISBURSAL').length,
                fundSources,
            },
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
            include: [{ model: Project, as: 'Project' }]
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
        const { fundSource, type, amount } = req.body;
        const normalizedType = fundSource || type;
        const dbSourceType = mapToFundSourceKey(normalizedType);

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
        const requests = await EventRequest.findAll({
            where: {
                fundingType: 'College Funded',
                status: { [Op.in]: ['APPROVED', 'REVOKED'] }
            },
            order: [['createdAt', 'DESC']]
        });

        const markers = requests.map((request) => getEventMarker(request._id || request.id));
        const relatedFundRequests = markers.length
            ? await FundRequest.findAll({
                where: {
                    [Op.or]: markers.map((marker) => ({ purpose: { [Op.like]: `%${marker}%` } })),
                },
                include: [buildProjectInclude()],
            })
            : [];

        const fundRequestByMarker = new Map();
        relatedFundRequests.forEach((request) => {
            const raw = request.toJSON ? request.toJSON() : request;
            markers.forEach((marker) => {
                if ((raw.purpose || '').includes(marker)) {
                    fundRequestByMarker.set(marker, raw);
                }
            });
        });

        const disbursements = await Disbursement.findAll({
            where: {
                fundRequestId: {
                    [Op.in]: relatedFundRequests.map((request) => request._id || request.id),
                },
            },
        });

        const disbursementByFundRequestId = new Map(
            disbursements.map((entry) => [entry.fundRequestId, entry.toJSON ? entry.toJSON() : entry])
        );

        const data = requests.map((request) => {
            const raw = request.toJSON ? request.toJSON() : request;
            const marker = getEventMarker(raw._id || raw.id);
            const fundRequest = fundRequestByMarker.get(marker);
            const disbursement = fundRequest ? disbursementByFundRequestId.get(fundRequest._id || fundRequest.id) : null;
            const isReleased = fundRequest?.status === 'DISBURSED' || Boolean(disbursement);

            return {
                id: raw._id || raw.id,
                fundRequestId: fundRequest?._id || fundRequest?.id || null,
                facultyName: raw.facultyName,
                department: raw.researchCentre || raw.department,
                functionName: raw.eventTitle,
                description: raw.description || raw.eventType,
                amount: Number(raw.approvedAmount || fundRequest?.requestedAmount || 0),
                status: isReleased ? 'FUNDS_RELEASED' : 'APPROVED_BY_DEAN',
                requestDate: raw.createdAt,
                releaseDate: disbursement?.disbursedAt || null,
                transactionId: disbursement?.bankReference || null,
            };
        });
        res.status(200).json({ success: true, data });
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
    try {
        const { id } = req.params;
        const request = await FundRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Fund request not found' });
        }
        console.log(`[PIPELINE] Disbursing Request ${req.params.id}: ${request.status} -> DISBURSED`);
        const result = await executeDisbursementPipeline(request, req.body, req.user);

        await NotificationService.create(
            request.userId || request.facultyId,
            'Funds Disbursed',
            `Funds for '${request.projectTitle}' have been disbursed! Transaction ID: ${req.body.transactionId}.`,
            'SUCCESS',
            '/faculty/request-funds'
        );

        res.status(200).json({
            success: true,
            message: 'Disbursement executed successfully',
            data: {
                request: result.request,
                disbursement: result.disbursement,
            },
        });
    } catch (error) {
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
        const { period, department, fundType, centre } = req.query;
        const history = await Disbursement.findAll({
            include: [
                { 
                    model: FundRequest, 
                    as: 'FundRequest',
                    attributes: ['projectTitle', 'purpose', 'source', 'faculty'],
                    include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }, buildProjectInclude()]
                },
                { 
                    model: Project, 
                    as: 'Project',
                    attributes: ['title', 'pi', 'department'],
                    include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }]
                }
            ],
            order: [['disbursedAt', 'DESC']]
        });

        const inflows = await Revenue.findAll({
            where: { status: 'VERIFIED' },
            include: [{ model: User, as: 'User', attributes: ['name', 'department'] }],
            order: [['verifiedAt', 'DESC']],
        });

        const fundingTotals = await getFundingTotals();
        const normalizedOutflows = history.map((entry) => normalizeDisbursement(entry));
        const normalizedInflows = inflows.map((entry) => {
            const raw = entry.toJSON ? entry.toJSON() : entry;
            return {
                ...raw,
                amount: Number(raw.verifiedAmount || raw.amountGenerated || 0),
                entryType: 'INFLOW',
                verifiedByName: raw.User?.name || null,
            };
        });

        const filteredOutflows = normalizedOutflows.filter((entry) => {
            const matchesDepartment = !department || department === 'All Departments' || entry.Project?.department === department;
            const matchesFundType = !fundType || fundType === 'All Funds' || entry.FundRequest?.source === fundType;
            const matchesCentre = !centre || centre === 'All Centres' || entry.Project?.centreName === centre || entry.FundRequest?.centreName === centre;
            return matchesDepartment && matchesFundType && matchesCentre;
        });

        const filteredInflows = normalizedInflows.filter((entry) =>
            !department || department === 'All Departments' || entry.User?.department === department
        );

        const totalOutflow = filteredOutflows.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const totalInflow = filteredInflows.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

        const summary = {
            totalAllocated: fundingTotals.totalAllocated,
            totalSanctioned: fundingTotals.totalAllocated,
            totalUsed: totalOutflow,
            remaining: Math.max(0, fundingTotals.totalAllocated - totalOutflow),
            totalDisbursed: totalOutflow,
            totalRevenue: totalInflow,
            netBalance: totalInflow - totalOutflow
        };

        console.log("[PIPELINE] Finance Data Truth:", summary);
        res.status(200).json({
            success: true,
            summary,
            outflows: filteredOutflows,
            inflows: filteredInflows,
            ledger: [
                ...filteredOutflows.map((entry) => ({ ...entry, entryType: 'OUTFLOW', entryDate: entry.disbursedAt })),
                ...filteredInflows.map((entry) => ({ ...entry, entryDate: entry.verifiedAt || entry.createdAt })),
            ].sort((a, b) => new Date(b.entryDate || b.createdAt || 0) - new Date(a.entryDate || a.createdAt || 0)),
            filters: { period, department, fundType, centre },
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
                    as: 'FundRequest',
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
