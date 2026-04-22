/**
 * Utility to safely render text in JSX to prevent React Error #31 (object rendering)
 */
export const safeText = (val) => {
    if (val === null || val === undefined) return "N/A";
    
    // If it's a React element or a valid primitive, let it through
    // But for the purpose of this stabilization, we strictly handle objects
    if (typeof val === "object" && !val.$$typeof) {
        // Special case for Dates
        if (val instanceof Date) return val.toLocaleDateString();
        
        // Handle common object structures
        return val.name || val.title || val.label || "N/A";
    }
    
    return String(val);
};
