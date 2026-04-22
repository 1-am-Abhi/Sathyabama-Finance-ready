/**
 * Global API wrapper to handle success/error states consistently
 * and ensure a safe data format (defaults to [] if failed)
 */
export const safeApi = async (fn, fallback = []) => {
    try {
        const res = await fn();
        return res?.data?.data ?? fallback;
    } catch (err) {
        console.error(err);
        return fallback;
    }
};

/**
 * Handle object response instead of array
 */
export const safeApiObj = async (fn, fallback = null) => {
    try {
        const res = await fn();
        return res?.data?.data ?? fallback;
    } catch (err) {
        console.error(err);
        return fallback;
    }
};

export const safeAxios = async (fn, fallback = { success: true, data: [] }) => {
    try {
        return await fn();
    } catch (err) {
        console.error(err);
        return { data: fallback };
    }
};
