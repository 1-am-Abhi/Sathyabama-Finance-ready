/**
 * Utility for Institutional Financial Year (FY) calculations.
 * FY starts on April 1st and ends on March 31st of the next year.
 */

function getCurrentFY() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() is 0-indexed

    if (month >= 4) {
        return `${year}-${year + 1}`;
    } else {
        return `${year - 1}-${year}`;
    }
}

function getFYRange(fy) {
    if (!fy || !fy.includes('-')) {
        fy = getCurrentFY();
    }
    const [startYear, endYear] = fy.split('-').map(Number);

    const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
    const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`);

    return { startDate, endDate };
}

// Short academic-cycle form of the current FY, e.g. "2026-2027" -> "2026-27".
function getCurrentCycle() {
    const [start, end] = getCurrentFY().split('-');
    return `${start}-${String(end).slice(-2)}`;
}

module.exports = {
    getCurrentFY,
    getFYRange,
    getCurrentCycle
};
