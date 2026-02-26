/**
 * Utility functions for handling dynamic year-based data rendering
 */

/**
 * Extract unique years from data and return them sorted in descending order
 * @param {Object} data - Object where keys are years (e.g., "2024-25")
 * @returns {Array<string>} - Sorted array of year strings
 */
export const extractYears = (data) => {
    if (!data || typeof data !== 'object') return [];

    const years = Object.keys(data).filter(key => {
        // Filter out non-year keys (e.g., "total", "category", etc.)
        return /^\d{4}-\d{2}$/.test(key);
    });

    // Sort in descending order (most recent first)
    return years.sort((a, b) => {
        const yearA = parseInt(a.split('-')[0]);
        const yearB = parseInt(b.split('-')[0]);
        return yearB - yearA;
    });
};

/**
 * Extract years from an array of objects containing year data
 * @param {Array<Object>} dataArray - Array of objects with year properties
 * @returns {Array<string>} - Sorted array of unique year strings
 */
export const extractYearsFromArray = (dataArray) => {
    if (!Array.isArray(dataArray)) return [];

    const yearsSet = new Set();
    dataArray.forEach(item => {
        Object.keys(item).forEach(key => {
            if (/^\d{4}-\d{2}$/.test(key)) {
                yearsSet.add(key);
            }
        });
    });

    const years = Array.from(yearsSet);
    return years.sort((a, b) => {
        const yearA = parseInt(a.split('-')[0]);
        const yearB = parseInt(b.split('-')[0]);
        return yearB - yearA;
    });
};

/**
 * Format year as academic year (e.g., "2024-25")
 * @param {number|string} year - Year to format
 * @returns {string} - Formatted academic year
 */
export const formatAcademicYear = (year) => {
    const yearNum = typeof year === 'string' ? parseInt(year) : year;
    const nextYear = (yearNum + 1).toString().slice(-2);
    return `${yearNum}-${nextYear}`;
};

/**
 * Get value for a specific year from data object
 * @param {Object} data - Data object with year keys
 * @param {string} year - Year key to retrieve
 * @param {*} defaultValue - Default value if not found
 * @returns {*} - Value for the year or default value
 */
export const getYearValue = (data, year, defaultValue = 0) => {
    if (!data || typeof data !== 'object') return defaultValue;
    return data[year] !== undefined ? data[year] : defaultValue;
};

/**
 * Format currency value with Rs symbol
 * @param {number|string} value - Value to format
 * @param {boolean} allowEmpty - Whether to show empty string for 0/null
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, allowEmpty = true) => {
    if (allowEmpty && (!value || value === 0)) return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return allowEmpty ? '' : 'Rs 0';

    // Format with Indian numbering system
    return `Rs ${numValue.toLocaleString('en-IN')}`;
};
