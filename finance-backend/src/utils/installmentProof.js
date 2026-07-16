/**
 * Installment proof-gating utilities.
 *
 * Business rule (approved): the NEXT installment for a project can only be
 * requested once the PREVIOUS installment's utilization has been verified by
 * Finance — i.e. the faculty has uploaded the required proofs (bills/invoices
 * + a Utilization Certificate) and Finance has verified them.
 *
 * We model this on the existing FundRequest schema without new columns:
 *   - proofs live in FundRequest.documents (JSON array of typed entries)
 *   - verification advances FundRequest.currentStage through the fund-flow
 *     stage machine to UTILIZATION_COMPLETED (or SETTLEMENT_CLOSED).
 *
 * Enforcement can be toggled with the PROOF_GATING_ENABLED env var (default on)
 * so it can be rolled out safely on a live deployment.
 */

// Canonical proof document types stored in FundRequest.documents[].type
const PROOF_TYPES = {
    BILL: 'BILL',
    INVOICE: 'INVOICE',
    UTILIZATION_CERTIFICATE: 'UTILIZATION_CERTIFICATE',
    SUPPORTING: 'SUPPORTING',
};

// Stages that mean "the installment's utilization has been verified by Finance".
const VERIFIED_STAGES = ['UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED'];

const isGatingEnabled = () =>
    String(process.env.PROOF_GATING_ENABLED ?? 'true').toLowerCase() !== 'false';

const getProofDeadlineDays = () => {
    const n = parseInt(process.env.PROOF_DEADLINE_DAYS, 10);
    return Number.isFinite(n) && n > 0 ? n : 30;
};

const normalizeDocs = (documents) => {
    if (Array.isArray(documents)) return documents;
    if (typeof documents === 'string') {
        try { const p = JSON.parse(documents); return Array.isArray(p) ? p : []; }
        catch { return []; }
    }
    return [];
};

const hasType = (docs, type) =>
    normalizeDocs(docs).some(
        (d) => d && String(d.type || '').toUpperCase() === type && (d.url || d.path || d.fileUrl)
    );

/**
 * Which required proofs are present / missing for a request's documents.
 * Requires: at least one BILL or INVOICE, AND a Utilization Certificate.
 */
const evaluateProofs = (documents) => {
    const docs = normalizeDocs(documents);
    const hasBillOrInvoice = hasType(docs, PROOF_TYPES.BILL) || hasType(docs, PROOF_TYPES.INVOICE);
    const hasUC = hasType(docs, PROOF_TYPES.UTILIZATION_CERTIFICATE);

    const missing = [];
    if (!hasBillOrInvoice) missing.push('Bill or Invoice');
    if (!hasUC) missing.push('Utilization Certificate (UC)');

    return { ok: missing.length === 0, missing, count: docs.length };
};

/**
 * Has this installment (FundRequest) had its utilization verified by Finance?
 */
const isInstallmentVerified = (request) =>
    !!request && VERIFIED_STAGES.includes(request.currentStage);

module.exports = {
    PROOF_TYPES,
    VERIFIED_STAGES,
    isGatingEnabled,
    getProofDeadlineDays,
    normalizeDocs,
    evaluateProofs,
    isInstallmentVerified,
};
