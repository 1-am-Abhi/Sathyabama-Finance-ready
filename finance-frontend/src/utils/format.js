/**
 * Formats currency amounts according to user preference:
 * - If amount < 1,00,000 (1 Lakh), shows in full Rupees (e.g., ₹50,000)
 * - If amount >= 1,00,000, shows in Lakhs (e.g., ₹1.2L)
 * @param {number} amount - The amount in Rupees
 * @returns {string} - Formatted string
 */
export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
    
    const absAmount = Math.abs(amount);
    
    if (absAmount < 100000) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    } else {
        const lakhs = amount / 100000;
        // Show 1 decimal place unless it's a whole number, then show none
        const formattedLakhs = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1);
        return `₹${formattedLakhs}L`;
    }
};

/**
 * Strips currency formatting and returns a number
 */
export const parseCurrency = (str) => {
    if (!str) return 0;
    return Number(str.replace(/[^0-9.-]+/g, ""));
};
