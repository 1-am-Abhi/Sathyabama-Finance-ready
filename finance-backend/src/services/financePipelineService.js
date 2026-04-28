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
        status: 'APPROVED',
        currentStage: 'FUND_APPROVED',
        department: event.department || project.department || 'RESEARCH',
        centre: event.researchCentre || project.centre || 'Research Centre',
        centreId: project.centreId || null,
        source,

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
    await request.update({
        status: 'APPROVED',
        currentStage: 'FUND_APPROVED'
    }, { transaction });

    return request;
};

const executeDisbursementPipeline = async (request, payload, actor, options = {}) => {
    const correlationId = options.correlationId || `INTERNAL-${Date.now()}`;

    if (!payload.transactionId) {
        throw new Error('Bank Reference (UTR) is mandatory to prevent duplicate payouts');
    }

    const amount = toNumber(request.requestedAmount);
    if (amount <= 0) {
        throw new Error('Disbursement amount must be greater than zero');
    }

    const disbursementDate = payload.disbursementDate || new Date();
    const bankReference = payload.transactionId;

    return sequelize.transaction(async (transaction) => {
        // ROW-LEVEL LOCK on FundRequest
        const lockedRequest = await FundRequest.findByPk(request._id || request.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!lockedRequest) {
            throw new Error(`FundRequest ${request._id || request.id} not found`);
        }

        // FINAL STATE GUARD — only one disbursement ever
        if (lockedRequest.status === 'DISBURSED') {
            const existing = await Disbursement.findOne({
                where: { fundRequestId: lockedRequest._id || lockedRequest.id },
                transaction
            });
            if (existing) {
                console.log(`[${correlationId}] [Pipeline:DISBURSE] Idempotent replay — already DISBURSED`);
                return { request: lockedRequest, disbursement: existing, idempotent: true };
            }
            throw new Error('Already fully disbursed but no disbursement record found — data inconsistency');
        }

        if (lockedRequest.status !== 'APPROVED') {
            throw new Error(`Cannot disburse request in status '${lockedRequest.status}'. Only APPROVED is allowed.`);
        }

        // ROW-LEVEL LOCK on Project
        const project = await Project.findOne({
            where: { _id: lockedRequest.projectId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!project || !isValidProjectStatus(project.status)) {
            throw new Error(`Target project status [${project?.status || 'UNKNOWN'}] is invalid for disbursement`);
        }

        // BUDGET VALIDATION — project-level SUM within transaction
        const totalReleased = toNumber(await Disbursement.sum('amount', {
            where: { projectId: lockedRequest.projectId },
            transaction
        }) || 0);
        const remaining = toNumber(project.sanctionedBudget) - totalReleased;

        if (amount > remaining) {
            throw new Error(`Overpayment protection: Remaining budget ₹${remaining.toLocaleString()} is less than request amount ₹${amount.toLocaleString()}`);
        }

        // FUND SOURCE CHECK
        const sourceTotals = await getFundSourceAllocationState(lockedRequest.source, transaction);
        if (sourceTotals.used + amount > sourceTotals.allocated) {
            throw new Error('Disbursement exceeds available fund source allocation limits');
        }

        const requestId = lockedRequest._id || lockedRequest.id;

        // IDEMPOTENCY CHECK
        const sysActor = actor?.id || actor?._id || 'sys';
        const idempotencyKey = `disburse_${requestId}*${Number(amount).toFixed(2)}*${Number(lockedRequest.installmentNumber)}_${sysActor}`;

        const existingByKey = await Disbursement.findOne({
            where: { idempotencyKey },
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (existingByKey) {
            console.log(`[${correlationId}] [Pipeline:DISBURSE] Idempotent replay via key`);
            return { request: lockedRequest, disbursement: existingByKey, idempotent: true };
        }

        // FETCH APPROVAL RECORD
        const { AuditLog } = require('../models');
        const { Op: SeqOp } = require('sequelize');
        const approvalLog = await AuditLog.findOne({
            where: {
                entityId: String(requestId),
                action: { [SeqOp.in]: ['FUND_REQUEST_APPROVED', 'FUND_APPROVED'] }
            },
            order: [['createdAt', 'DESC']],
            transaction
        });

        if (!approvalLog) {
            throw new Error(`No formal approval record found for request ${requestId}. Disbursement blocked.`);
        }

        const approvedBy = approvalLog.userId || null;
        const approvedByName = approvalLog.performedByName || approvalLog.metadata?.updatedByName || 'Admin';
        const approvedAt = approvalLog.createdAt;

        const threshold = toNumber(process.env.HIGH_VALUE_THRESHOLD || 100000);
        const isHighValue = amount >= threshold;
        let financeRemarks = (payload.remarks || '').trim();
        financeRemarks = `[INSTALLMENT #${lockedRequest.installmentNumber}]${isHighValue ? ' [HIGH-VALUE]' : ''} ${financeRemarks}`.trim();

        console.log(`[${correlationId}] [Pipeline:DISBURSE] Start — request=${requestId} amount=${amount} installment=${lockedRequest.installmentNumber} isHighValue=${isHighValue}`);

        // SET STATUS TO DISBURSED (always — one request, one disbursement)
        await lockedRequest.update({
            status: 'DISBURSED',
            currentStage: 'AMOUNT_DISBURSED',
            transactionId: bankReference,
            bankName: payload.bankName || lockedRequest.bankName,
            disbursementDate,
            financeRemarks,
            financeProcessedAt: new Date(),
            financeProcessedBy: actor?.id || actor?._id || null,
        }, { transaction });

        // CREATE THE SINGLE DISBURSEMENT
        let disbursement;
        try {
            disbursement = await Disbursement.create({
                fundRequestId: requestId,
                projectId: lockedRequest.projectId,
                amount,
                installmentNumber: lockedRequest.installmentNumber,
                isInstallment: true,
                approvedBy,
                approvedByName,
                approvedAt,
                isHighValue,
                disbursedBy: actor?.id || actor?._id,
                disbursedByName: actor?.name || 'Finance Officer',
                disbursedAt: disbursementDate,
                bankReference,
                remarks: financeRemarks,
                idempotencyKey
            }, { transaction });
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Duplicate disbursement detected (UTR or idempotency key already exists). Disbursement rejected.');
            }
            console.error(`[${correlationId}] [Pipeline:DISBURSE] Disbursement create failed:`, err.message);
            throw err;
        }

        // RECOMPUTE AUTHORITATIVE SUM AFTER INSERT
        const authoritativeProjectSum = toNumber(await Disbursement.sum('amount', {
            where: { projectId: lockedRequest.projectId },
            transaction
        }) || 0);

        await project.update({
            releasedBudget: authoritativeProjectSum,
        }, { transaction });

        await ensureFundSourceSeed(lockedRequest.source, transaction);

        await safeCreateLedgerEntry({
            entryType: 'OUTFLOW',
            category: lockedRequest.source || 'GENERAL',
            amount,
            projectId: lockedRequest.projectId,
            fundRequestId: requestId,
            disbursementId: getRecordId(disbursement),
            referenceId: bankReference,
            description: `Fund disbursement for ${lockedRequest.projectTitle}`,
            financialYear: getFinancialYear(disbursementDate),
            entryDate: disbursementDate,
            createdByUserId: actor?.id || actor?._id || null,
            approvedBy,
            isHighValue,
        }, { transaction });

        const anomalyCheck = await detectAnomalies({ projectId: lockedRequest.projectId, amount });

        await logDisbursementAudit({
            projectId: lockedRequest.projectId,
            amount,
            previousTotalUsed: totalReleased,
            newTotalUsed: authoritativeProjectSum,
            remainingBudget: toNumber(project.sanctionedBudget) - authoritativeProjectSum,
            isInstallment: true,
            isHighValue,
            userId: actor?.id || actor?._id,
            entityId: requestId,
            metadata: {
                transactionId: bankReference,
                projectTitle: lockedRequest.projectTitle,
                financeRemarks,
                approvedBy,
                approvedByName,
                anomaly: anomalyCheck.anomaly,
                anomalyReason: anomalyCheck.reason
            }
        });

        console.log(`[${correlationId}] [Pipeline:DISBURSE] Committed — request=${requestId} disbursement=${disbursement._id} status=DISBURSED authSum=${authoritativeProjectSum}`);

        verifyFinancialParity('DISBURSEMENT_PIPELINE').catch(err =>
            console.error(`[${correlationId}] Watchdog failed:`, err)
        );

        return { request: lockedRequest, disbursement };
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
