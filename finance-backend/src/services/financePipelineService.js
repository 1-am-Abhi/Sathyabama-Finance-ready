const { Op } = require('sequelize');
const models = require('../models');
const NotificationService = require('./notificationService');
const { logDisbursementAudit } = require('./auditService');
const { verifyFinancialParity } = require('./watchdogService');
const { detectAnomalies } = require('./analyticsService');

const {
    sequelize,
    Disbursement,
    FundRequest,
    FundSource,
    Ledger,
    Project,
    ProjectMember,
    User,
} = models;
const {
    ensureCanonicalFundSources,
    mapToFundSourceKey,
    normalizeFundSource,
} = require('./fundSourceCatalogService');

const {
    VALID_PROJECT_STATUSES,
    isValidProjectStatus,
    getSqlStatusList
} = require('../constants/financeConstants');

const EVENT_SOURCE_LABEL = 'College Funded';

const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const getRecordId = (record) => record?._id || record?.id || null;

const getEventMarker = (eventId) => `[EventRequest:${eventId}]`;

const isMissingTableError = (error) =>
    /relation .* does not exist/i.test(error?.message || '') ||
    /no such table/i.test(error?.message || '');

const normalizeSource = (value) => normalizeFundSource(value);

const getFinancialYear = (input = new Date()) => {
    const value = new Date(input);
    const year = value.getFullYear();
    const month = value.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = String(startYear + 1).slice(-2);
    return `${startYear}-${endYear}`;
};

const safeCreateLedgerEntry = async (payload, options = {}) => {
    try {
        // Ensure audit fields are persisted if present
        const ledgerPayload = {
            ...payload,
            approvedBy: payload.approvedBy || null,
            isHighValue: payload.isHighValue || false,
        };
        return await Ledger.create(ledgerPayload, options);
    } catch (error) {
        if (isMissingTableError(error)) {
            console.warn('[Ledger] Table missing, skipping ledger write until schema is synced.');
            return null;
        }
        throw error;
    }
};

const findEventProject = async (event, options = {}) => {
    const marker = getEventMarker(getRecordId(event));
    const where = {
        [Op.or]: [
            { description: { [Op.like]: `%${marker}%` } },
            {
                title: event.eventTitle,
                facultyId: event.facultyId,
                projectType: 'EVENT',
            },
        ],
    };

    return Project.findOne({ where, transaction: options.transaction });
};

const ensureEventProject = async (event, options = {}) => {
    const transaction = options.transaction;
    const marker = getEventMarker(getRecordId(event));
    let project = await findEventProject(event, { transaction });

    if (project) {
        await project.update({
            sanctionedBudget: toNumber(event.approvedAmount || project.sanctionedBudget),
            fundingSource: normalizeSource(event.fundingSource || event.fundingType),
            status: 'ACTIVE',
            description: project.description?.includes(marker)
                ? project.description
                : `${project.description || ''} ${marker}`.trim(),
            centre: event.researchCentre || project.centre,
        }, { transaction });
        return project;
    }

    project = await Project.create({
        title: event.eventTitle,
        description: `${event.description || event.eventType || 'Institutional event'} ${marker}`.trim(),
        userId: event.facultyId,
        facultyId: event.facultyId,
        pi: event.facultyName,
        department: event.department || 'RESEARCH',
        centre: event.researchCentre || null,
        sanctionedBudget: toNumber(event.approvedAmount),
        releasedBudget: 0,
        utilizedBudget: 0,
        status: 'ACTIVE',
        projectType: 'EVENT',
        fundingSource: normalizeSource(event.fundingSource || event.fundingType),
        startDate: event.dates?.split(' to ')[0] || null,
        endDate: event.dates?.includes(' to ') ? event.dates.split(' to ')[1] : event.dates || null,
    }, { transaction });

    return project;
};

const ensureProjectMembers = async (projectId, piId, memberIds = [], transaction) => {
    const uniqueMemberIds = [...new Set([piId, ...memberIds].filter(Boolean))];

    await ProjectMember.destroy({ where: { projectId }, transaction });

    if (!uniqueMemberIds.length) {
        return [];
    }

    await ProjectMember.bulkCreate(
        uniqueMemberIds.map((userId) => ({
            projectId,
            userId,
            role: userId === piId ? 'PI' : 'MEMBER',
        })),
        { transaction }
    );

    return ProjectMember.findAll({
        where: { projectId },
        include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'department', 'centre'] }],
        order: [['role', 'ASC']],
        transaction,
    });
};

const ensureEventFundRequest = async (event, project, actor, options = {}) => {
    const transaction = options.transaction;
    const marker = getEventMarker(getRecordId(event));
    const requestedAmount = toNumber(event.approvedAmount);
    const purpose = `Event approval pipeline for ${event.eventTitle} ${marker}`;
    const source = normalizeSource(event.fundingSource || event.fundingType);

    let fundRequest = await FundRequest.findOne({
        where: {
            [Op.or]: [
                { purpose: { [Op.like]: `%${marker}%` } },
                { projectId: getRecordId(project), projectTitle: event.eventTitle, facultyId: event.facultyId },
            ],
        },
        transaction,
    });

    const payload = {
        projectTitle: event.eventTitle,
        projectId: getRecordId(project),
        faculty: event.facultyName,
        facultyId: event.facultyId,
        userId: event.facultyId,
        requestedAmount,
        purpose,
        status: 'PENDING_DISBURSAL',
        currentStage: 'FUND_APPROVED',
        department: event.department || project.department || 'RESEARCH',
        centre: event.researchCentre || project.centre || 'Research Centre',
        centreId: project.centreId || null,
        source,
        auditTrail: [
            {
                stage: 'FUND_APPROVED',
                prevStage: fundRequest?.status || 'PENDING',
                updatedBy: actor?.id || actor?._id || null,
                updatedByName: actor?.name || 'System',
                timestamp: new Date(),
                remarks: `Event approved and routed to Finance ${marker}`,
            },
        ],
    };

    if (fundRequest) {
        await fundRequest.update(payload, { transaction });
        return fundRequest;
    }

    fundRequest = await FundRequest.create(payload, { transaction });
    return fundRequest;
};

const ensureFundSourceSeed = async (source, transaction) => {
    await ensureCanonicalFundSources();
    const sourceType = mapToFundSourceKey(source);
    const [record] = await FundSource.findOrCreate({
        where: { sourceType },
        defaults: { totalAllocated: 0 },
        transaction,
    });
    return record;
};

const getFundSourceAllocationState = async (source, transaction) => {
    await ensureCanonicalFundSources();
    const sourceType = mapToFundSourceKey(source);
    const record = await FundSource.findOne({
        where: { sourceType },
        transaction,
    });

    const query = `
        SELECT COALESCE(SUM(d."amount"), 0) AS "totalUsed"
        FROM "Projects" p
        LEFT JOIN "Disbursements" d ON p."_id" = d."projectId"
        WHERE p."fundingSource" = :source AND p."status" IN (${getSqlStatusList()})
    `;
    const replacements = { source: normalizeSource(source) };

    console.log(`[getFundSourceAllocationState] Executing Raw SQL:`, query);
    console.log(`[getFundSourceAllocationState] Replacements:`, replacements);

    const [rows] = await sequelize.query(query, {
        replacements,
        transaction,
    });

    return {
        allocated: toNumber(record?.totalAllocated),
        used: toNumber(rows?.[0]?.totalUsed),
    };
};

const approveFundRequestPipeline = async (request, actor, remarks, options = {}) => {
    const transaction = options.transaction;
    const currentAudit = request.auditTrail || [];

    await request.update({
        status: 'PENDING_DISBURSAL',
        currentStage: 'FUND_APPROVED',
        auditTrail: [
            ...currentAudit,
            {
                stage: 'FUND_APPROVED',
                prevStage: request.currentStage || request.status,
                updatedBy: actor?.id || actor?._id || null,
                updatedByName: actor?.name || 'System',
                timestamp: new Date(),
                remarks: remarks || 'Approved by Admin',
            },
        ],
    }, { transaction });

    return request;
};

const executeDisbursementPipeline = async (request, payload, actor) => {
    // 1. STRICT AUTHORITATIVE VALIDATION (No trust in frontend)
    if (!payload.amount || toNumber(payload.amount) <= 0) {
        throw new Error('Disbursement amount is mandatory and must be greater than zero');
    }
    if (!payload.transactionId) {
        throw new Error('Bank Reference (UTR) is mandatory to prevent duplicate payouts');
    }

    const amount = toNumber(payload.amount);
    const disbursementDate = payload.disbursementDate || new Date();
    const bankReference = payload.transactionId;
    const isInstallment = payload.mode === 'INSTALLMENT' || payload.isInstallment === true;

    return sequelize.transaction(async (transaction) => {
        // 2. ELITE-LEVEL CONCURRENCY LOCK (Lock Project to serialize all payments for it)
        const project = await Project.findOne({
            where: { _id: request.projectId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!project || !isValidProjectStatus(project.status)) {
            throw new Error(`Target project status [${project.status || 'UNKNOWN'}] is invalid for disbursement`);
        }

        // 3. SEQUENTIAL INSTALLMENT CALCULATION
        const lastDisbursement = await Disbursement.findOne({
            where: { projectId: request.projectId },
            order: [['installmentNumber', 'DESC']],
            transaction
        });

        const nextInstallmentNumber = (lastDisbursement?.installmentNumber || 0) + 1;

        // 4. ATOMIC OVERPAYMENT PROTECTION
        const currentSum = await Disbursement.sum('amount', {
            where: { projectId: request.projectId },
            transaction
        }) || 0;

        const sanctionedBudget = toNumber(project.sanctionedBudget);
        if (toNumber(currentSum) + amount > sanctionedBudget) {
            throw new Error(`Overpayment protection: Sanctioned budget ₹${sanctionedBudget.toLocaleString()} exceeded by current transaction`);
        }

        const sourceTotals = await getFundSourceAllocationState(request.source, transaction);
        if (sourceTotals.used + amount > sourceTotals.allocated) {
            throw new Error('Disbursement exceeds available fund source allocation limits');
        }

        let financeRemarks = (payload.remarks || '').trim();
        financeRemarks = `[INSTALLMENT #${nextInstallmentNumber}] ${financeRemarks}`.trim();

        // 4.5. AUDIT INTEGRITY: Extract Original Approval Metadata
        const approvalEntry = (request.auditTrail || [])
            .filter(entry => entry.stage === 'FUND_APPROVED')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        if (!approvalEntry) {
            throw new Error('Audit Integrity Error: No valid approval record found foundations for disbursement');
        }

        const approvedBy = approvalEntry.updatedBy;
        const approvedByName = approvalEntry.updatedByName;
        const approvedAt = approvalEntry.timestamp;

        // 4.6. OBSERVABILITY: High-Value Threshold Detection
        const threshold = toNumber(process.env.HIGH_VALUE_THRESHOLD || 100000);
        const isHighValue = amount >= threshold;

        if (isHighValue && !financeRemarks.includes('[HIGH-VALUE]')) {
            financeRemarks = `[HIGH-VALUE] ${financeRemarks}`.trim();
        }

        // 5. ATOMIC STATE UPDATES
        await request.update({
            status: 'DISBURSED',
            currentStage: 'AMOUNT_DISBURSED',
            transactionId: bankReference,
            bankName: payload.bankName || request.bankName,
            disbursementDate,
            financeRemarks,
            financeProcessedAt: new Date(),
            financeProcessedBy: actor?.id || actor?._id || null,
        }, { transaction });

        let disbursement;
        try {
            // ALWAYS CREATE New record - Strict Append Model
            disbursement = await Disbursement.create({
                fundRequestId: getRecordId(request),
                projectId: request.projectId,
                amount,
                installmentNumber: nextInstallmentNumber,
                isInstallment,
                approvedBy,
                approvedByName,
                approvedAt,
                isHighValue,
                disbursedBy: actor?.id || actor?._id,
                disbursedByName: actor?.name || 'Finance Officer',
                disbursedAt: disbursementDate,
                bankReference,
                remarks: financeRemarks,
            }, { transaction });
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Concurrent disbursement conflict detected (Installment # or UTR already exists). Please retry.');
            }
            throw err;
        }

        // Update project releasedBudget using fresh transaction sum
        const updatedFreshSum = toNumber(currentSum) + amount;
        await project.update({
            releasedBudget: updatedFreshSum,
            utilizedBudget: toNumber(project.utilizedBudget),
        }, { transaction });

        await ensureFundSourceSeed(request.source, transaction);

        await safeCreateLedgerEntry({
            entryType: 'OUTFLOW',
            category: request.source || 'GENERAL',
            amount,
            projectId: request.projectId,
            fundRequestId: getRecordId(request),
            disbursementId: getRecordId(disbursement),
            referenceId: bankReference,
            description: `Fund disbursement for ${request.projectTitle}`,
            financialYear: getFinancialYear(disbursementDate),
            entryDate: disbursementDate,
            createdByUserId: actor?.id || actor?._id || null,
            approvedBy,
            isHighValue,
        }, { transaction });

        const anomalyCheck = await detectAnomalies({ projectId: request.projectId, amount });

        await logDisbursementAudit({
            projectId: request.projectId,
            amount,
            previousTotalUsed: toNumber(currentSum),
            newTotalUsed: updatedFreshSum,
            remainingBudget: sanctionedBudget - updatedFreshSum,
            isInstallment,
            isHighValue,
            userId: actor?.id || actor?._id,
            entityId: getRecordId(request),
            metadata: {
                transactionId: bankReference,
                projectTitle: request.projectTitle,
                financeRemarks: financeRemarks,
                approvedBy,
                approvedByName,
                anomaly: anomalyCheck.anomaly,
                anomalyReason: anomalyCheck.reason
            }
        });

        verifyFinancialParity('DISBURSEMENT_PIPELINE').catch(err => console.error('Watchdog failed:', err));

        return { request, disbursement };
    });
};

const syncRevenueLedger = async (revenue, actor, options = {}) => {
    const transaction = options.transaction;
    const amount = toNumber(revenue.verifiedAmount || revenue.amountGenerated);

    return safeCreateLedgerEntry({
        entryType: 'INFLOW',
        category: revenue.revenueSource || 'Revenue',
        amount,
        projectId: null,
        fundRequestId: null,
        disbursementId: null,
        revenueId: getRecordId(revenue),
        referenceId: revenue.bankReference || getRecordId(revenue),
        description: `Verified revenue: ${revenue.revenueSource}`,
        financialYear: getFinancialYear(revenue.verifiedAt || new Date()),
        entryDate: revenue.verifiedAt || new Date(),
        createdByUserId: actor?.id || actor?._id || null,
    }, { transaction });
};

const approveEventPipeline = async (event, payload, actor) => {
    return sequelize.transaction(async (transaction) => {
        await event.update({
            status: payload.status || event.status,
            approvedAmount: payload.approvedAmount !== undefined ? toNumber(payload.approvedAmount) : event.approvedAmount,
            remarks: payload.remarks !== undefined ? payload.remarks : event.remarks,
            photosUploaded: payload.photosUploaded !== undefined ? payload.photosUploaded : event.photosUploaded,
            photoData: payload.photoData !== undefined ? payload.photoData : event.photoData,
        }, { transaction });

        let project = null;
        let fundRequest = null;

        if (String(event.status).toUpperCase() === 'APPROVED' && String(event.fundingType).trim() === EVENT_SOURCE_LABEL) {
            project = await ensureEventProject(event, { transaction });
            await ensureProjectMembers(getRecordId(project), event.facultyId, [], transaction);
            fundRequest = await ensureEventFundRequest(event, project, actor, { transaction });
        }

        return { event, project, fundRequest };
    });
};

const buildEventProjectLookup = async (events) => {
    const markers = events.map((event) => getEventMarker(getRecordId(event)));

    if (!markers.length) {
        return new Map();
    }

    const projects = await Project.findAll({
        where: {
            projectType: 'EVENT',
            [Op.or]: markers.map((marker) => ({ description: { [Op.like]: `%${marker}%` } })),
        },
        attributes: ['_id', 'title', 'facultyId', 'description'],
    });

    const lookup = new Map();
    projects.forEach((project) => {
        const raw = project.toJSON ? project.toJSON() : project;
        markers.forEach((marker) => {
            if ((raw.description || '').includes(marker)) {
                lookup.set(marker, raw);
            }
        });
    });

    return lookup;
};

const getEventMembersMap = async (events) => {
    const projectLookup = await buildEventProjectLookup(events);
    const projectIds = [...new Set([...projectLookup.values()].map((project) => getRecordId(project)).filter(Boolean))];

    if (!projectIds.length) {
        return new Map();
    }

    const memberships = await ProjectMember.findAll({
        where: { projectId: { [Op.in]: projectIds } },
        include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'email', 'department', 'centre'] }],
        order: [['role', 'ASC']],
    });

    const membersByProjectId = memberships.reduce((acc, membership) => {
        const projectId = membership.projectId;
        if (!acc.has(projectId)) {
            acc.set(projectId, []);
        }
        acc.get(projectId).push(membership);
        return acc;
    }, new Map());

    const result = new Map();
    events.forEach((event) => {
        const marker = getEventMarker(getRecordId(event));
        const project = projectLookup.get(marker);
        result.set(getRecordId(event), membersByProjectId.get(getRecordId(project)) || []);
    });

    return result;
};

module.exports = {
    EVENT_SOURCE_LABEL,
    getRecordId,
    getEventMarker,
    normalizeSource,
    mapToFundSourceKey,
    getFinancialYear,
    findEventProject,
    ensureEventProject,
    ensureEventFundRequest,
    ensureProjectMembers,
    approveFundRequestPipeline,
    executeDisbursementPipeline,
    syncRevenueLedger,
    approveEventPipeline,
    getEventMembersMap,
};
