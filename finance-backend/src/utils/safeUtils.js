/**
 * Global rule: Safe number conversion.
 * Prevents NaN crashes in arithmetic operations.
 */
const safeNumber = (val) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

/**
 * Safe Financial Year (FY) parsing.
 * Returns null if the format is invalid (e.g., not "2025-2026").
 */
const parseFY = (fy) => {
    if (!fy || typeof fy !== "string") return null;

    const parts = fy.split("-");
    if (parts.length !== 2) return null;

    const [start, end] = parts.map(Number);

    if (!start || !end) return null;

    return {
        startDate: new Date(`${start}-04-01`),
        endDate: new Date(`${end}-03-31`)
    };
};

/**
 * Ensures a value is always an array.
 * Use this in return statements to prevent "map of undefined" errors on frontend.
 */
const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

/**
 * EPS Tolerance for financial comparisons.
 * Uses 0.5 as the institutional rounding limit.
 */
const EPS_TOLERANCE = 0.5;

/**
 * Rounds a number to standard financial precision (2 decimals).
 */
const toMoney = (val) => Math.round(safeNumber(val) * 100) / 100;

module.exports = {
    safeNumber,
    parseFY,
    safeArray,
    EPS_TOLERANCE,
    toMoney
};
