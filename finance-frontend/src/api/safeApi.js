/**
 * Global API wrapper to handle success/error states consistently
 * and ensure a safe data format (defaults to [] if failed)
 */
export const safeApi = async (fn) => {
    try {
        const res = await fn();
        // Standardize returning data array or empty array
        return res?.data?.data || [];
    } catch (err) {
        console.warn('[SafeApi] Error occurred:', err.message);
        return [];
    }
};

/**
 * Handle object response instead of array
 */
export const safeApiObj = async (fn) => {
    try {
        const res = await fn();
        return res?.data?.data || null;
    } catch (err) {
        console.warn('[SafeApiObj] Error occurred:', err.message);
        return null;
    }
};
