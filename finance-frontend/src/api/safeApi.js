/**
 * Global API wrappers that preserve backend failures.
 * Do not return fake fallbacks here: production errors must be visible.
 */
export const safeApi = async (fn) => {
  const res = await fn();
  return res?.data?.data ?? [];
};

/**
 * Handle object response instead of array
 */
export const safeApiObj = async (fn, fallback = null) => {
    const res = await fn();
    return res?.data?.data ?? fallback;
};

export const safeAxios = async (fn) => {
    return fn();
};
