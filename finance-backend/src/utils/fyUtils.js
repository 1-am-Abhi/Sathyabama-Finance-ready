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
    const [startYear, endYear] = fy.split('-').map(y => parseInt(y.trim()));

    // Start: April 1st 00:00:00
    const startDate = new Date(startYear, 3, 1, 0, 0, 0);
    // End: March 31st 23:59:59 of endYear
    const endDate = new Date(endYear, 2, 31, 23, 59, 59);

    return { startDate, endDate };
}

module.exports = {
    getCurrentFY,
    getFYRange
};
