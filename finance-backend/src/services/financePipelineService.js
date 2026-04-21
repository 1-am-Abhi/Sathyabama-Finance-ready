const { Op } = require('sequelize');
const models = require('../models');
const NotificationService = require('./notificationService');

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
        return await Ledger.create(payload, options);
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

const ensureFundSourceSeed = async (source, amount, transaction) => {
    await ensureCanonicalFundSources();
    const sourceType = mapToFundSourceKey(source);
    const [record] = await FundSource.findOrCreate({
        where: { sourceType },
        defaults: { totalAllocated: Math.max(toNumber(amount), 0) },
        transaction,
    });
    return record;
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
    const amount = toNumber(request.requestedAmount || request.amount);
    const disbursementDate = payload.disbursementDate || new Date();
    const bankReference = payload.transactionId || request.transactionId || null;

    // 1. HARD BLOCK: Double Disbursement Protection
    if (bankReference) {
        const existingByRef = await Disbursement.findOne({ where: { bankReference } });
        if (existingByRef) {
            console.error(`[HARD BLOCK] Duplicate UTR detected: ${bankReference}`);
            throw new Error('Duplicate disbursement detected (UTR already exists)');
        }
    }

    // Fuzzy Duplicate Check (Project + Amount + Day)
    const dayStart = new Date(disbursementDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(disbursementDate);
    dayEnd.setHours(23, 59, 59, 999);

    const fuzzyDuplicate = await Disbursement.findOne({
        where: {
            projectId: request.projectId,
            amount: amount,
            disbursedAt: { [Op.between]: [dayStart, dayEnd] }
        }
    });

    if (fuzzyDuplicate) {
        console.warn(`[HARD BLOCK] Fuzzy Duplicate detected: Project ${request.projectId} already received ₹${amount} on this date.`);
        throw new Error('Duplicate disbursement detected: Same project, amount, and date.');
    }

    // 2. OVERSPENDING HARD BLOCK (Pre-transaction check)
    const project = await Project.findByPk(request.projectId);
    if (!project) throw new Error('Project not found for this fund request');

    const totalReleased = toNumber(project.releasedBudget);
    const sanctionedBudget = toNumber(project.sanctionedBudget);

    if (totalReleased + amount > sanctionedBudget) {
        console.error(`[HARD BLOCK] Overspending: Sanctioned ₹${sanctionedBudget}, Attempting total ₹${totalReleased + amount}`);
        throw new Error('Disbursement exceeds remaining budget');
    }

    return sequelize.transaction(async (transaction) => {
        // 3. FINAL INTEGRITY CHECK (Inside transaction to avoid races)
        const currentSum = await Disbursement.sum('amount', {
            where: { projectId: request.projectId },
            transaction
        }) || 0;

        if (toNumber(currentSum) + amount > sanctionedBudget) {
            throw new Error('Disbursement exceeds remaining budget (Concurrent transaction detected)');
        }

        // Handle installment meta if provided
        const isInstallment = payload.mode === 'INSTALLMENT' || payload.isInstallment === true;
        const instNo = payload.installmentNo || request.installmentNumber || 1;
        
        let financeRemarks = payload.remarks || request.financeRemarks || '';
        if (isInstallment) {
            financeRemarks = `[Installment #${instNo}] ${financeRemarks}`.trim();
        }

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

        let disbursement = await Disbursement.findOne({
            where: { fundRequestId: getRecordId(request) },
            transaction,
        });

        const disbursementPayload = {
            fundRequestId: getRecordId(request),
            projectId: request.projectId,
            amount,
            disbursedBy: actor?.id || actor?._id,
            disbursedByName: actor?.name || 'Finance Officer',
            disbursedAt: payload.disbursementDate || new Date(),
            bankReference: payload.transactionId || null,
            remarks: payload.remarks || null,
        };

        if (disbursement) {
            await disbursement.update(disbursementPayload, { transaction });
        } else {
            disbursement = await Disbursement.create(disbursementPayload, { transaction });
        }

        if (request.projectId) {
            // Update project releasedBudget using fresh transaction sum
            const p = await Project.findByPk(request.projectId, { transaction });
            if (p) {
                const freshSum = (await Disbursement.sum('amount', {
                    where: { projectId: request.projectId },
                    transaction
                })) || 0;

                await p.update({
                    releasedBudget: toNumber(freshSum),
                    utilizedBudget: toNumber(p.utilizedBudget),
                }, { transaction });
            }
        }

        await ensureFundSourceSeed(request.source, amount, transaction);

        await safeCreateLedgerEntry({
            entryType: 'OUTFLOW',
            category: request.source || 'GENERAL',
            amount,
            projectId: request.projectId || null,
            fundRequestId: getRecordId(request),
            disbursementId: getRecordId(disbursement),
            referenceId: payload.transactionId || getRecordId(disbursement),
            description: `Fund disbursement for ${request.projectTitle}`,
            financialYear: getFinancialYear(payload.disbursementDate || new Date()),
            entryDate: payload.disbursementDate || new Date(),
            createdByUserId: actor?.id || actor?._id || null,
        }, { transaction });

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
