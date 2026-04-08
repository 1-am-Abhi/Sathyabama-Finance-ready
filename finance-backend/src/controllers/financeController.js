const PFMSTransaction = require('../models/PFMSTransaction');
const InternshipFee = require('../models/InternshipFee');
const { FundRequest } = require('../models/FundRequest');
const Project = require('../models/Project');
const { sequelize } = require('../config/db');

exports.getFinanceStats = async (req, res) => {
    try {
        // Pending Releases: FUND_APPROVED but not yet FUND_RELEASED
        const pendingReleases = await FundRequest.count({ where: { currentStage: 'FUND_APPROVED' } });
        
        // Pending Disbursements: CHEQUE_RELEASED but not yet AMOUNT_DISBURSED
        const pendingDisbursements = await FundRequest.count({ where: { currentStage: 'CHEQUE_RELEASED' } });
        
        // Pending Settlements: UTILIZATION_COMPLETED but not yet SETTLEMENT_CLOSED
        const pendingSettlements = await FundRequest.count({ where: { currentStage: 'UTILIZATION_COMPLETED' } });
        
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
                currentStage: ['FUND_APPROVED', 'FUND_RELEASED', 'CHEQUE_RELEASED', 'AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED']
            },
            order: [['updatedAt', 'DESC']],
            include: [{ model: Project, attributes: ['title', 'piName', 'agency'] }]
        });
        
        res.status(200).json({
            success: true,
            data: fundRequests
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
        const fees = await InternshipFee.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ success: true, data: fees });
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
            paymentStatus, paymentMode, receiptNumber, paymentDate,
            verifiedBy: req.user.id
        });
        
        res.status(200).json({ success: true, data: fee });
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
        const projects = await Project.findAll();
        
        // PFMS-funded projects
        const pfmsProjects = projects.filter(p => p.fundingSource === 'PFMS');
        // Director Innovation / Other college grants (non-PFMS, non-institutional)
        const directorProjects = projects.filter(p => ['DIRECTOR_INNOVATION', 'DIRECTOR_INNOVATION_FUND'].includes(p.fundingSource));
        // Institutional (pure college overhead funding)
        const institutionalProjects = projects.filter(p => p.fundingSource === 'INSTITUTIONAL');
        // Combined college (institutional + director) for backward compat
        const collegeProjects = [...institutionalProjects, ...directorProjects];
        
        const allSources = await FundSource.findAll();
        let collegeCeiling = allSources.find(s => s.sourceType === 'collegeFunds')?.totalAllocated || 0;
        let pfmsCeiling = allSources.find(s => s.sourceType === 'pfmsFunds')?.totalAllocated || 0;
        let directorCeiling = allSources.find(s => s.sourceType === 'directorFunds')?.totalAllocated || 0;

        // Fallback to sum of project allocations if ceiling not configured
        if (collegeCeiling === 0) collegeCeiling = institutionalProjects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0);
        if (pfmsCeiling === 0) pfmsCeiling = pfmsProjects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0);
        if (directorCeiling === 0) directorCeiling = directorProjects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0);
        
        const collegeUsed = institutionalProjects.reduce((sum, p) => sum + (p.releasedBudget || 0), 0);
        const pfmsUsed = pfmsProjects.reduce((sum, p) => sum + (p.releasedBudget || 0), 0);
        const directorUsed = directorProjects.reduce((sum, p) => sum + (p.releasedBudget || 0), 0);

        const data = {
            collegeFunds: {
                totalAllocated: collegeCeiling,
                totalUsed: collegeUsed,
                remainingBalance: collegeCeiling - collegeUsed,
                projectCount: institutionalProjects.length
            },
            pfmsFunds: {
                totalAllocated: pfmsCeiling,
                totalUsed: pfmsUsed,
                remainingBalance: pfmsCeiling - pfmsUsed,
                projectCount: pfmsProjects.length
            },
            // NEW: Director Innovation / Other Funds breakdown
            directorFunds: {
                totalAllocated: directorCeiling,
                totalUsed: directorUsed,
                remainingBalance: directorCeiling - directorUsed,
                projectCount: directorProjects.length
            }
        };
        res.status(200).json(data);
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
        if (fundSource === 'DIRECTOR' || fundSource === 'directorFunds' || fundSource === 'DIRECTOR_INNOVATION') dbSourceType = 'directorFunds';

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
        // FIX: Always return the full official Sathyabama Research Centre list
        // so the Finance Dashboard dropdown is never empty regardless of project data
        const SATHYABAMA_RESEARCH_CENTRES = [
            'Centre for Nano Science and Nanotechnology',
            'Centre of Excellence for Energy Research',
            'Centre for Waste Management',
            'Centre for Climate Studies',
            'Centre for Molecular and Nanomedical Sciences',
            'Centre for Drug Discovery and Development',
            'Centre of Excellence for Additive Manufacturing',
            'Centre for Indian System of Medicine',
            'Centre for Aqua Culture'
        ];

        // Also retrieve any unique department values from DB (to catch custom entries)
        const projects = await Project.findAll({
            attributes: ['department'],
            group: ['department'],
            where: {
                department: {
                    [require('sequelize').Op.not]: null,
                    [require('sequelize').Op.ne]: ''
                }
            }
        });
        const dbDepts = projects.map(p => p.department).filter(Boolean);

        // Merge: start with official list, append any DB-only departments not already in it
        const allCentres = [...SATHYABAMA_RESEARCH_CENTRES];
        dbDepts.forEach(dept => {
            if (!allCentres.includes(dept)) allCentres.push(dept);
        });

        const departments = allCentres.map(name => ({ id: name, name }));
        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDepartmentFunding = async (req, res) => {
    try {
        const { id } = req.params;
        const projects = await Project.findAll({ where: { department: id } });
        
        const collegeProjects = projects.filter(p => ['INSTITUTIONAL', 'DIRECTOR_INNOVATION', 'DIRECTOR_INNOVATION_FUND'].includes(p.fundingSource));
        const pfmsProjects = projects.filter(p => p.fundingSource === 'PFMS');

        const result = [];
        if (collegeProjects.length > 0) {
            result.push({
                id: 'college_' + id,
                departmentName: id,
                fundSource: 'COLLEGE',
                totalAllocated: collegeProjects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0),
                amountReleased: collegeProjects.reduce((sum, p) => sum + (p.releasedBudget || 0), 0),
                remainingBalance: collegeProjects.reduce((sum, p) => sum + ((p.sanctionedBudget || 0) - (p.releasedBudget || 0)), 0),
            });
        }
        if (pfmsProjects.length > 0) {
            result.push({
                id: 'pfms_' + id,
                departmentName: id,
                fundSource: 'PFMS',
                totalAllocated: pfmsProjects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0),
                amountReleased: pfmsProjects.reduce((sum, p) => sum + (p.releasedBudget || 0), 0),
                remainingBalance: pfmsProjects.reduce((sum, p) => sum + ((p.sanctionedBudget || 0) - (p.releasedBudget || 0)), 0),
            });
        }
        res.status(200).json(result);
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
                fundingType: 'College Funded'
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
                currentStage: 'FUND_APPROVED'
            },
            // FIX: Include pi in Project attributes (model uses 'pi' not 'piName')
            include: [
                { model: Project, attributes: ['title', 'pi', 'centre', 'department', 'fundingSource'] },
                { model: User, attributes: ['name', 'email', 'department'], as: 'requester', required: false }
            ],
            order: [['updatedAt', 'ASC']]
        });
        
        // Normalize field names for frontend compatibility
        const normalized = requests.map(r => ({
            ...r.toJSON(),
            // Ensure amount is set (FundRequest uses requestedAmount)
            amount: r.requestedAmount || r.amount || 0,
            faculty: r.faculty || r.requester?.name || 'N/A'
        }));
        
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
        const { transactionId, bankName, disbursementDate, remarks } = req.body;
        
        const request = await FundRequest.findByPk(id);
        if (!request) return res.status(404).json({ success: false, message: 'Fund request not found' });
        
        // Update request status and tracking info
        await request.update({
            currentStage: 'FUND_RELEASED',
            transactionId: transactionId || request.transactionId,
            bankName: bankName || request.bankName,
            disbursementDate: disbursementDate || new Date(),
            financeRemarks: remarks || request.financeRemarks,
            financeProcessedAt: new Date(),
            financeProcessedBy: req.user.id
        });
        
        // Update the project's released budget if applicable
        if (request.projectId) {
            const project = await Project.findByPk(request.projectId);
            if (project) {
                const newReleasedAmount = (project.releasedBudget || 0) + (request.amount || 0);
                await project.update({ releasedBudget: newReleasedAmount });
            }
        }
        
        res.status(200).json({ success: true, message: 'Disbursement executed successfully', data: request });
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

        // 1. Calculate Outflows (Released Funds)
        const disbursedRequests = await FundRequest.findAll({
            where: { currentStage: ['FUND_RELEASED', 'AMOUNT_DISBURSED', 'CHEQUE_RELEASED'] },
            include: [{ model: Project, attributes: ['title', 'department', 'pi'] }]
        });

        const totalOutflow = disbursedRequests.reduce((sum, r) => sum + (r.amount || 0), 0);

        // 2. Calculate Inflows (Verified Revenue)
        const verifiedRevenue = await Revenue.findAll({
            where: { status: 'VERIFIED' },
            include: [{ model: User, attributes: ['name', 'department'] }]
        });

        const totalInflow = verifiedRevenue.reduce((sum, r) => sum + (r.verifiedAmount || r.amountGenerated || 0), 0);

        // 3. Prepare summary
        const projects = await Project.findAll();
        const totalSanctioned = projects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0);

        const summary = {
            totalSanctioned,
            totalDisbursed: totalOutflow,
            totalRevenue: totalInflow,
            netBalance: totalInflow - totalOutflow
        };

        res.status(200).json({
            success: true,
            summary,
            outflows: disbursedRequests,
            inflows: verifiedRevenue
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
