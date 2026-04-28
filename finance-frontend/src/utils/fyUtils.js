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
