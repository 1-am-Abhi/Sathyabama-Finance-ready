/**
 * Currency formatter utility for INR
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0';

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format large numbers in lakhs/crores
 * @param {number} amount - Amount to format
 * @returns {string} Formatted string (e.g., "₹25.5L", "₹1.2Cr")
 */
export const formatCurrencyCompact = (amount) => {
    if (amount === null || amount === undefined) return '₹0';

    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)}L`;
    }

    return formatCurrency(amount);
};
