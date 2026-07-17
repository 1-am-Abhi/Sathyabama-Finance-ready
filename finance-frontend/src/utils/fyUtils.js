/**
 * Utility for Institutional Financial Year (FY) calculations.
 * FY starts on April 1st and ends on March 31st of the next year.
 */

export const getCurrentFY = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    return month >= 4
        ? `${year}-${year + 1}`
        : `${year - 1}-${year}`;
};

export const getFYRange = (fy) => {
    const [startYear, endYear] = fy.split('-').map(y => parseInt(y.trim()));
    return {
        startDate: `${startYear}-04-01`,
        endDate: `${endYear}-03-31`
    };
};

/**
 * Returns an array of FY strings, current first then `back` previous years.
 * e.g. ["2026-2027", "2025-2026", "2024-2025", "2023-2024"]
 */
export const getFinancialYearOptions = (back = 3) => {
    const startYear = parseInt(getCurrentFY().split('-')[0], 10);
    const options = [];
    for (let i = 0; i <= back; i++) {
        const s = startYear - i;
        options.push(`${s}-${s + 1}`);
    }
    return options;
};

/**
 * Returns the SHORT cycle form of the current FY.
 * e.g. getCurrentFY() "2026-2027" -> "2026-27"
 */
export const getCurrentAcademicCycle = () => {
    const [start, end] = getCurrentFY().split('-');
    return `${start}-${end.slice(-2)}`;
};

/**
 * Returns an array of short academic cycles, current first then `back` previous.
 * e.g. ["2026-27", "2025-26", "2024-25", "2023-24"]
 */
export const getAcademicCycleOptions = (back = 3) => {
    const startYear = parseInt(getCurrentFY().split('-')[0], 10);
    const options = [];
    for (let i = 0; i <= back; i++) {
        const s = startYear - i;
        options.push(`${s}-${String(s + 1).slice(-2)}`);
    }
    return options;
};
