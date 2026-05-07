const logger = require('../utils/logger');
const { Op } = require('sequelize');
const models = require('../models');
const NotificationService = require('./notificationService');
const { logDisbursementAudit } = require('./auditService');
const { verifyFinancialParity } = require('./watchdogService');
const { detectAnomalies } = require('./analyticsService');
const { clearDashboardCache } = require('./dashboardService');
const { isUuid } = require('../utils/userIdentity');

const {
    sequelize,
    Disbursement,
    FundRequest,
    FundSource,
    Ledger,
    JournalEntry,
    Account,
    AccountingPeriod,
    Project,
    ProjectMember,
    User,
    AuditLog,
} = models;
const {
    ensureCanonicalFundSources,
    mapToFundSourceKey,
    normalizeFundSource,
} = require('./fundSourceCatalogService');
const { safeEmit } = require('../socketInstance');

const {
    VALID_PROJECT_STATUSES,
    isValidProjectStatus,
    getSqlStatusList
} = require('../constants/financeConstants');
const { ACCOUNTS } = require('../constants/accounts');

const EVENT_SOURCE_LABEL = 'College Funded';
const PAYMENT_MODES = ['CHEQUE', 'NEFT', 'RTGS', 'UPI'];
const ROUNDING_TOLERANCE = 1;

const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const toMoney = (value) => Math.round(toNumber(value) * 100) / 100;

const sumAmounts = (rows = []) =>
    rows.reduce((sum, row) => sum + toMoney(row.amount), 0);

const sanitizeLogPayload = (payload = {}) => ({
    amount: payload.amount,
    paymentMode: payload.paymentMode,
    referenceId: payload.referenceId,
    hasTransactionId: Boolean(payload.transactionId),
    hasChequeNumber: Boolean(payload.chequeNumber),
    hasProof: Boolean(payload.proofUrl),
});

const logFinancialError = (event, err, context = {}) => {
    logger.error(event, {
        message: err.message,
        stack: err.stack,
        ...context,
        payload: sanitizeLogPayload(context.payload)
    });
};

const getRecordId = (record) => record?._id || record?.id || null;
const byUuid = (value) => ({ _id: value });

const getActorUuid = (actor) => {
    const candidate = actor?._id || actor?.userId || actor?.id;
    return isUuid(String(candidate || '')) ? String(candidate) : null;
};

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
    const endYear = startYear + 1;
    return `${startYear}-${endYear}`;
};

/**
 * Double-Entry Posting Engine
 * Enforces: totalDebit === totalCredit per transaction.
 */
const postJournalTransaction = async (params, options = {}) => {
    const { description, entries, referenceId, metadata, actor, transactionDate = new Date() } = params;
    const transaction = options.transaction;

    if (metadata?.financialOperation === 'DISBURSEMENT') {
        const missingLink = entries.some((entry) => !entry.disbursementId);
        if (missingLink) {
            throw new Error('LEDGER_INTEGRITY_ERROR: Disbursement ledger entries require disbursementId.');
        }
    }

    // 1. Period Lock Guard (Pipeline Layer)
    const closedPeriod = await AccountingPeriod.findOne({
        where: {
            startDate: { [Op.lte]: transactionDate },
            endDate: { [Op.gte]: transactionDate },
            status: 'CLOSED'
        },
        transaction
    });

    if (closedPeriod) {
        throw new Error(`CRITICAL: Access denied. Financial period ${closedPeriod.startDate} to ${closedPeriod.endDate} is CLOSED and locked for auditing.`);
    }

    // 2. Enforce Double-Entry Rule
    const totalDebit = entries.reduce((acc, e) => acc + toNumber(e.debit), 0);
    const totalCredit = entries.reduce((acc, e) => acc + toNumber(e.credit), 0);

    // Opening balances might have a different validation if they are single-sided (uncommon but possible in some migrations)
    // However, for strictness, we require them to be balanced (usually against an Equity/Capital account)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`ACCOUNTING ERROR: Unbalanced journal entry. Debits (₹${totalDebit}) must equal Credits (₹${totalCredit}).`);
    }

    // 3. Create Journal Header
    const journal = await JournalEntry.create({
        description,
        referenceId,
        metadata: { ...metadata, isOpeningBalance: description === 'OPENING_BALANCE' },
        transactionDate,
        createdByUserId: getActorUuid(actor)
    }, { transaction });

    // 3. Post Ledger Lines
    const ledgerLines = entries.map((entry, index) => ({
        journalId: journal.id,
        accountId: entry.accountId,
        projectId: entry.projectId || null,
        fundRequestId: entry.fundRequestId || null,
        disbursementId: entry.disbursementId || null,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        referenceId: referenceId || null,
        description: entry.description || description,
        metadata: { ...metadata, ...(entry.metadata || {}) },
        createdAt: new Date(new Date(transactionDate).getTime() + index)
    }));

    for (const line of ledgerLines) {
        await Ledger.create(line, { transaction, validate: true });
    }

    return journal;
};

const safeCreateLedgerEntry = async (payload, options = {}) => {
    const transaction = options.transaction;
    try {
        const { entryType, amount, projectId, fundRequestId, referenceId, description, createdByUserId } = payload;

        // 1. Calculate current balance for the context (Institutional vs Project)
        const where = projectId ? { projectId } : {};
        const ledgerEntries = await Ledger.findAll({ where, transaction });
        const currentBalance = ledgerEntries.reduce((acc, entry) => {
            return acc + Number(entry.credit || 0) - Number(entry.debit || 0);
        }, 0);

        // 2. Map legacy fields to bank-grade ledger schema
        const isOutflow = entryType === 'OUTFLOW';
        const type = payload.type || (isOutflow ? 'DISBURSEMENT' : 'REVENUE');
        const debit = isOutflow ? toNumber(amount) : 0;
        const credit = isOutflow ? 0 : toNumber(amount);
        const newBalance = currentBalance + credit - debit;

        const ledgerPayload = {
            type,
            projectId,
            fundRequestId,
            debit,
            credit,
            balanceAfter: newBalance,
            referenceId,
            description: description || `${type} recorded`,
            createdByUserId: createdByUserId || null,
            metadata: payload.metadata || {}
        };

        return await Ledger.create(ledgerPayload, { transaction });
    } catch (error) {
        if (isMissingTableError(error)) {
            logger.warn('[Ledger] Table missing, skipping ledger write until schema is synced.');
            return null;
        }
        logger.error('[safeCreateLedgerEntry] Error:', error.message);
        throw error;
    }
};

const findEventProject = async (event, options = {}) => {
    const marker = getEventMarker(getRecordId(event));
    const where = {
        organizationId: event.organizationId,
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
        organizationId: event.organizationId,
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
            organizationId: event.organizationId,
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
        organizationId: event.organizationId,
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

    logger.info(`[getFundSourceAllocationState] Executing Raw SQL:`, query);
    logger.info(`[getFundSourceAllocationState] Replacements:`, replacements);

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
    if (!options.transaction) {
        return sequelize.transaction((transaction) =>
            approveFundRequestPipeline(request, actor, remarks, { ...options, transaction })
        );
    }

    const transaction = options.transaction;
    const reqId = request._id || request.id;
    const lockedRequest = await FundRequest.findOne({
        where: byUuid(reqId),
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    if (!lockedRequest) {
        throw new Error(`FundRequest ${request._id || request.id} not found`);
    }

    const requestId = lockedRequest._id || lockedRequest.id;
    await FundRequest.update({
        status: 'APPROVED',
        currentStage: 'FUND_APPROVED'
    }, {
        where: byUuid(requestId),
        transaction
    });

    // PROMOTE PROJECT TO ACTIVE IF PENDING
    const project = await Project.findOne({
        where: byUuid(lockedRequest.projectId),
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    if (project && project.status === 'PENDING') {
        await Project.update(
            { status: 'ACTIVE' },
            {
                where: byUuid(lockedRequest.projectId),
                transaction
            }
        );
    }

    const actorId = getActorUuid(actor);

    if (actorId) {
        await AuditLog.create({
            userId: actorId,
            action: 'FUND_REQUEST_APPROVED',
            entityType: 'FundRequest',
            entityId: String(lockedRequest._id || lockedRequest.id),
            organizationId: lockedRequest.organizationId || actor.organizationId || null,
            metadata: {
                updatedByName: actor.name || 'Admin',
                remarks: remarks || '',
                requestedAmount: toMoney(lockedRequest.requestedAmount)
            }
        }, { transaction });
    }

    return lockedRequest;
};

const executeDisbursementPipeline = async (request, payload, actor, options = {}) => {
    const correlationId = options.correlationId || `INTERNAL-${Date.now()}`;
    const fundRequestId = request?._id || request?.id;

    let amount = toMoney(payload.amount);
    if (amount <= 0) {
        throw new Error('Disbursement amount must be greater than zero');
    }

    const disbursementDate = payload.disbursementDate || new Date();
    const paymentMode = String(payload.paymentMode || '').trim().toUpperCase();
    const chequeNumber = payload.chequeNumber ? String(payload.chequeNumber).trim() : null;
    const transactionId = payload.transactionId ? String(payload.transactionId).trim() : null;
    const bankName = payload.bankName ? String(payload.bankName).trim() : null;
    const referenceId = payload.referenceId ? String(payload.referenceId).trim() : null;
    const bankReference = referenceId || (paymentMode === 'CHEQUE' ? chequeNumber : transactionId);

    if (!referenceId) {
        throw new Error('Missing referenceId for idempotency');
    }

    // --- RECONCILIATION ENGINE: SMART MULTI-MODE CHECKS ---
    if (!PAYMENT_MODES.includes(paymentMode)) {
        throw new Error('Institutional Compliance: Payment mode is required.');
    }

    if (paymentMode === 'CHEQUE') {
        if (!chequeNumber || !bankName) {
            throw new Error('Institutional Compliance: Cheque number and Bank name are mandatory for CHEQUE disbursement.');
        }
    }

    if (['UPI', 'NEFT', 'RTGS'].includes(paymentMode)) {
        if (!transactionId) {
            throw new Error('Institutional Compliance: Transaction ID / UTR is mandatory for digital disbursement.');
        }
    }

    if (!bankReference) {
        throw new Error('Bank reference, UTR, or cheque number is mandatory to prevent duplicate payouts');
    }

    try {
        const result = await sequelize.transaction(async (transaction) => {
            const existingByReference = await Disbursement.findOne({
                where: { referenceId },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (existingByReference) {
                const [existingRequest, totalDisbursed] = await Promise.all([
                    FundRequest.findOne({
                        where: {
                            _id: existingByReference.fundRequestId
                        },
                        transaction
                    }),
                    Disbursement.sum('amount', {
                        where: { fundRequestId: existingByReference.fundRequestId },
                        transaction
                    })
                ]);
                const requestedAmount = toMoney(existingRequest?.requestedAmount);
                const totalDisbursedValue = toMoney(totalDisbursed);
                return {
                    request: existingRequest,
                    disbursement: existingByReference,
                    idempotent: true,
                    totals: {
                        requestedAmount,
                        totalDisbursed: totalDisbursedValue,
                        remainingAmount: Math.max(0, toMoney(requestedAmount - totalDisbursedValue))
                    }
                };
            }

            // Reconciliation: Duplicate Cheque Detection
            if (chequeNumber) {
                const duplicateCheque = await Disbursement.findOne({
                    where: { chequeNumber },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (duplicateCheque) {
                    throw new Error(`Reconciliation Error: Cheque Number ${chequeNumber} has already been recorded.`);
                }
            }

            // Reconciliation: Duplicate Transaction Detection
            if (transactionId) {
                const duplicateTxn = await Disbursement.findOne({
                    where: { transactionId },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (duplicateTxn) {
                    throw new Error(`Reconciliation Error: Transaction ID ${transactionId} has already been recorded.`);
                }
            }

            // ROW-LEVEL LOCK on FundRequest
            const reqId = request._id || request.id;
            const lockedRequest = await FundRequest.findOne({
                where: byUuid(reqId),
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!lockedRequest) {
                throw new Error(`FundRequest ${request._id || request.id} not found`);
            }

            if (!['APPROVED', 'PARTIALLY_DISBURSED'].includes(lockedRequest.status)) {
                throw new Error(`Cannot disburse request in status '${lockedRequest.status}'. Only APPROVED or PARTIALLY_DISBURSED is allowed.`);
            }

            // ROW-LEVEL LOCK on Project
            const project = await Project.findOne({
                where: byUuid(lockedRequest.projectId),
                transaction,
                lock: transaction.LOCK.UPDATE
            });


            if (!project || !isValidProjectStatus(project.status)) {
                throw new Error(`Target project status [${project?.status || 'UNKNOWN'}] is invalid for disbursement`);
            }

            // BUDGET VALIDATION — project-level and request-level SUM within transaction
            const projectDisbursements = await Disbursement.findAll({
                where: { projectId: lockedRequest.projectId },
                attributes: ['amount'],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            const totalReleased = toMoney(sumAmounts(projectDisbursements));
            const remaining = toNumber(project.sanctionedBudget) - totalReleased;

            if (amount - remaining >= ROUNDING_TOLERANCE) {
                throw new Error(`Overpayment protection: Remaining budget ₹${remaining.toLocaleString()} is less than request amount ₹${amount.toLocaleString()}`);
            }
            if (amount > remaining) amount = toMoney(remaining);

            const requestDisbursements = await Disbursement.findAll({
                where: { fundRequestId: lockedRequest._id || lockedRequest.id },
                attributes: ['amount'],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            const requestDisbursedBefore = toMoney(sumAmounts(requestDisbursements));
            const requestRemaining = toMoney(toNumber(lockedRequest.requestedAmount) - requestDisbursedBefore);

            if (amount - requestRemaining >= ROUNDING_TOLERANCE) {
                throw new Error(`Overpayment protection: Remaining request amount ₹${requestRemaining.toLocaleString()} is less than installment amount ₹${amount.toLocaleString()}`);
            }
            if (amount > requestRemaining) amount = toMoney(requestRemaining);

            // FUND SOURCE CHECK
            const sourceTotals = await getFundSourceAllocationState(lockedRequest.source, transaction);
            if ((sourceTotals.used + amount) - sourceTotals.allocated >= ROUNDING_TOLERANCE) {
                throw new Error('Disbursement exceeds available fund source allocation limits');
            }

            const requestId = lockedRequest._id || lockedRequest.id;

            // IDEMPOTENCY CHECK
            const actorId = getActorUuid(actor);
            const sysActor = actorId || actor?.id || actor?._id || 'sys';
            const idempotencyKey = payload.idempotencyKey || `disburse_${requestId}_${bankReference}_${sysActor}`;

            const existingByKey = await Disbursement.findOne({
                where: { idempotencyKey },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (existingByKey) {
                logger.info(`[${correlationId}] [Pipeline:DISBURSE] Idempotent replay via key`);
                const totalDisbursedValue = toMoney(await Disbursement.sum('amount', {
                    where: { fundRequestId: requestId },
                    transaction
                }));
                const requestedAmount = toMoney(lockedRequest.requestedAmount);
                return {
                    request: lockedRequest,
                    disbursement: existingByKey,
                    idempotent: true,
                    totals: {
                        requestedAmount,
                        totalDisbursed: totalDisbursedValue,
                        remainingAmount: Math.max(0, toMoney(requestedAmount - totalDisbursedValue))
                    }
                };
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
            const installmentNumber = requestDisbursements.length + 1;

            let financeRemarks = (payload.remarks || '').trim();
            financeRemarks = `[INSTALLMENT #${installmentNumber}]${isHighValue ? ' [HIGH-VALUE]' : ''} ${financeRemarks}`.trim();

            logger.info(`[${correlationId}] [Pipeline:DISBURSE] Start — request=${requestId} amount=${amount} installment=${installmentNumber} isHighValue=${isHighValue}`);


            const disburseInput = {
                fundRequestId: requestId,
                projectId: lockedRequest.projectId,
                organizationId: lockedRequest.organizationId || actor?.organizationId,
                amount,
                installmentNumber,
                isInstallment: true,
                approvedBy,
                approvedByName,
                approvedAt,
                isHighValue,
                disbursedBy: actorId || actor?.id || actor?._id,
                disbursedByName: actor?.name || 'Finance Officer',
                disbursedAt: disbursementDate,
                bankReference,
                referenceId,
                chequeNumber,
                bankName,
                transactionId: paymentMode === 'CHEQUE' ? null : transactionId,
                proofUrl: payload.proofUrl || null,
                paymentMode,
                remarks: financeRemarks,
                idempotencyKey
            };
            

            // CREATE INSTALLMENT DISBURSEMENT
            let disbursement;
            try {
                disbursement = await Disbursement.create(disburseInput, { transaction });
            } catch (err) {
                if (err.name === 'SequelizeUniqueConstraintError') {
                    throw new Error('Duplicate disbursement detected (UTR or idempotency key already exists). Disbursement rejected.');
                }
                logger.error(`[DISBURSEMENT_CREATE_ERROR] Validation/Constraint failed: ${err.message}`, {
                    correlationId,
                    errName: err.name,
                    errErrors: err.errors?.map(e => e.message)
                });
                logFinancialError('DISBURSEMENT_CREATE_ERROR', err, {
                    correlationId,
                    fundRequestId: requestId,
                    amount,
                    userId: actorId || actor?.id || actor?._id,
                    payload
                });
                throw err;
            }

            // RECOMPUTE AUTHORITATIVE SUM AFTER INSERT
            const authoritativeProjectRows = await Disbursement.findAll({
                where: { projectId: lockedRequest.projectId },
                attributes: ['amount'],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            const authoritativeProjectSum = toMoney(sumAmounts(authoritativeProjectRows));
            const authoritativeRequestRows = await Disbursement.findAll({
                where: { fundRequestId: requestId },
                attributes: ['amount'],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            const authoritativeRequestSum = toMoney(sumAmounts(authoritativeRequestRows));
            const requestedAmount = toMoney(lockedRequest.requestedAmount);
            const remainingAmountRaw = toMoney(requestedAmount - authoritativeRequestSum);
            const remainingAmount = Math.max(0, remainingAmountRaw < ROUNDING_TOLERANCE ? 0 : remainingAmountRaw);
            const requestStatus = authoritativeRequestSum === 0
                ? 'APPROVED'
                : remainingAmount >= ROUNDING_TOLERANCE
                    ? 'PARTIALLY_DISBURSED'
                    : 'COMPLETED';

            try {
                await FundRequest.update({
                    status: requestStatus,
                    currentStage: requestStatus === 'APPROVED' ? 'FUND_APPROVED' : 'AMOUNT_DISBURSED',
                    transactionId: bankReference,
                    bankName: payload.bankName || lockedRequest.bankName,
                    disbursementDate,
                    financeRemarks,
                    financeProcessedAt: new Date(),
                    financeProcessedBy: actorId,
                }, {
                    where: byUuid(requestId),
                    transaction
                });
            } catch (err) {
                logger.error(`[${correlationId}] FundRequest.update failed: ${err.message}`);
                throw err;
            }

            // --- DOUBLE-ENTRY ACCOUNTING INTEGRATION ---
            const [bankAcc, expenseAcc] = await Promise.all([
                Account.findOne({ where: { code: ACCOUNTS.BANK.code }, transaction }),
                Account.findOne({ where: { code: ACCOUNTS.PROJECT_EXPENSE.code }, transaction })
            ]);

            if (!bankAcc || !expenseAcc) {
                throw new Error('CRITICAL: Chart of Accounts not properly initialized. Aborting disbursement.');
            }

            try {
                await postJournalTransaction({
                    description: `Fund disbursement for: ${lockedRequest.projectTitle}`,
                    referenceId: bankReference,
                    metadata: {
                        financialOperation: 'DISBURSEMENT',
                        disbursementId: disbursement._id || disbursement.id,
                        fundRequestId: requestId,
                    },
                    actor,
                    entries: [
                        {
                            accountId: expenseAcc.id,
                            projectId: lockedRequest.projectId,
                            fundRequestId: requestId,
                            disbursementId: disbursement._id || disbursement.id,
                            debit: amount,
                            credit: 0,
                            description: `Research Expense: ${lockedRequest.purpose}`
                        },
                        {
                            accountId: bankAcc.id,
                            projectId: null, // Bank account is institutional level
                            fundRequestId: requestId,
                            disbursementId: disbursement._id || disbursement.id,
                            debit: 0,
                            credit: amount,
                            description: `Cash outflow from Institutional Bank`
                        }
                    ]
                }, { transaction });
            } catch (err) {
                logger.error(`[${correlationId}] postJournalTransaction failed: ${err.message}`);
                throw err;
            }

            try {
                await Project.update({
                    releasedBudget: authoritativeProjectSum,
                    status: 'ACTIVE'
                }, {
                    where: byUuid(lockedRequest.projectId),
                    transaction
                });
            } catch (err) {
                logger.error(`[${correlationId}] Project.update failed: ${err.message}`);
                throw err;
            }

            const anomalyCheck = await detectAnomalies({ projectId: lockedRequest.projectId, amount });

            await logDisbursementAudit({
                projectId: lockedRequest.projectId,
                amount,
                previousTotalUsed: totalReleased,
                newTotalUsed: authoritativeProjectSum,
                remainingBudget: toNumber(project.sanctionedBudget) - authoritativeProjectSum,
                remainingAmount,
                isInstallment: true,
                isHighValue,
                userId: actorId,
                entityId: requestId,
                metadata: {
                    transactionId: bankReference,
                    chequeNumber,
                    bankName,
                    projectTitle: lockedRequest.projectTitle,
                    financeRemarks,
                    installmentNumber,
                    approvedBy,
                    approvedByName,
                    anomaly: anomalyCheck.anomaly,
                    anomalyReason: anomalyCheck.reason
                }
            });

            try {
                await AuditLog.create({
                    userId: actorId,
                    action: 'INSTALLMENT_DISBURSED',
                    entityType: 'Disbursement',
                    entityId: String(disbursement._id || disbursement.id),
                    organizationId: lockedRequest.organizationId || actor?.organizationId || null,
                    metadata: {
                        fundRequestId: requestId,
                        projectId: lockedRequest.projectId,
                        amount,
                        installmentNumber,
                        paymentMode,
                        bankReference,
                        referenceId,
                        requestedAmount,
                    totalDisbursed: authoritativeRequestSum,
                    remainingAmount
                }
            }, { transaction });
            } catch (err) {
                logger.error(`[${correlationId}] AuditLog.create failed: ${err.message}`);
                throw err;
            }

            logger.info(`[${correlationId}] [Pipeline:DISBURSE] Committed — request=${requestId} disbursement=${disbursement._id} status=${requestStatus} requestSum=${authoritativeRequestSum} authSum=${authoritativeProjectSum}`);

            // --- REAL-TIME STREAMING ---
            safeEmit('finance', 'finance:update', {
                type: 'DISBURSEMENT',
                projectId: lockedRequest.projectId,
                amount,
                timestamp: Date.now()
            });

            // --- REAL-TIME BUDGET ALERTS ---
            const sanctioned = toNumber(project.sanctionedBudget);
            const finalRemaining = sanctioned - authoritativeProjectSum;

            if (finalRemaining < sanctioned * 0.1 && sanctioned > 0) {
                await NotificationService.create(
                    project.facultyId || project.userId,
                    'Budget Threshold Alert',
                    `⚠ Project '${project.title}' has less than 10% budget remaining (₹${finalRemaining.toLocaleString()}).`,
                    'ALERT',
                    `/faculty/projects/${project._id || project.id}`
                );
                await NotificationService.notifyRole(
                    'ADMIN',
                    'Low Project Budget',
                    `Institutional Warning: '${project.title}' is at critical budget levels (<10%).`,
                    'ALERT',
                    '/admin/projects'
                );
            }

            // --- DISBURSEMENT NOTIFICATION ---
            await NotificationService.create(
                project.facultyId || project.userId,
                'Funds Disbursed',
                `✅ ₹${amount.toLocaleString()} has been credited for '${project.title}'. UTR: ${bankReference}`,
                'SUCCESS',
                '/faculty/request-funds'
            );

            verifyFinancialParity('DISBURSEMENT_PIPELINE').catch(err =>
                logFinancialError('DISBURSEMENT_WATCHDOG_ERROR', err, {
                    correlationId,
                    fundRequestId: requestId,
                    amount,
                    userId: actorId,
                    payload
                })
            );

            return {
                request: lockedRequest,
                disbursement,
                totals: {
                    requestedAmount,
                    totalDisbursed: authoritativeRequestSum,
                    remainingAmount
                }
            };
        });

        clearDashboardCache();
        return result;
    } catch (err) {
        logFinancialError('DISBURSEMENT_ERROR', err, {
            correlationId,
            fundRequestId,
            amount,
            userId: getActorUuid(actor),
            payload
        });
        throw err;
    }
};

const syncRevenueLedger = async (revenue, actor, options = {}) => {
    const transaction = options.transaction;
    const amount = toNumber(revenue.verifiedAmount || revenue.amountGenerated);

    const [bankAcc, revenueAcc] = await Promise.all([
        Account.findOne({ where: { code: ACCOUNTS.BANK.code }, transaction }),
        Account.findOne({ where: { code: ACCOUNTS.REVENUE.code }, transaction })
    ]);

    if (!bankAcc || !revenueAcc) {
        logger.error('[syncRevenueLedger] Chart of Accounts missing');
        return null;
    }

    return await postJournalTransaction({
        description: `Verified revenue: ${revenue.revenueSource}`,
        referenceId: revenue.bankReference || getRecordId(revenue),
        actor,
        entries: [
            {
                accountId: bankAcc.id,
                debit: amount,
                credit: 0,
                description: `Bank Inflow from ${revenue.revenueSource}`
            },
            {
                accountId: revenueAcc.id,
                debit: 0,
                credit: amount,
                description: `Institutional Revenue Recognition`
            }
        ]
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
