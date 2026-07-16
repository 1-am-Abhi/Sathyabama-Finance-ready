/**
 * Centralized Finance Component Constants
 * Single source of truth for all project status whitelisting and logic.
 */

const { Op } = require('sequelize');

const VALID_PROJECT_STATUSES = ['ACTIVE', 'APPROVED'];

/**
 * WHERE fragment selecting disbursements that still count toward budget /
 * remaining / total-disbursed math — i.e. everything that is NOT reversed.
 * NULL-safe: legacy rows with a NULL status are treated as active (COMPLETED),
 * so a naive `status != 'REVERSED'` (which silently drops NULLs in SQL and would
 * under-count disbursed funds, enabling over-disbursement) is avoided.
 *
 * Spread into an existing where clause:
 *   Disbursement.sum('amount', { where: { fundRequestId, ...NON_REVERSED_DISBURSEMENT_WHERE } })
 */
const NON_REVERSED_DISBURSEMENT_WHERE = {
    [Op.or]: [
        { status: { [Op.ne]: 'REVERSED' } },
        { status: { [Op.is]: null } }
    ]
};

// Safety Guard: Stop execution if the system is misconfigured
if (!VALID_PROJECT_STATUSES || VALID_PROJECT_STATUSES.length === 0) {
    throw new Error("Critical Configuration Error: No valid project statuses defined for finance pipeline.");
}

/**
 * Checks if a given project status is valid for financial operations (Disbursement/Metrics)
 */
const isValidProjectStatus = (status) => VALID_PROJECT_STATUSES.includes(status);

/**
 * Generates a SQL-safe 'IN' list string based on valid constants.
 * Example: "'ACTIVE', 'APPROVED'"
 */
const getSqlStatusList = () => {
    // Only use local constants to ensure SQL safety
    return VALID_PROJECT_STATUSES.map(s => `'${s}'`).join(',');
};

module.exports = {
    VALID_PROJECT_STATUSES,
    isValidProjectStatus,
    getSqlStatusList,
    NON_REVERSED_DISBURSEMENT_WHERE
};
