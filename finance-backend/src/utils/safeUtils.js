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

    const start = Number(parts[0]);
    const end = Number(parts[1]);

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

module.exports = {
    safeNumber,
    parseFY,
    safeArray
};
