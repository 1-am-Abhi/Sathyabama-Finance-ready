/**
 * Advanced Canonical Serializer (Operational Grade)
 * 
 * 1. Array Normalization: Sorts primitive arrays to ensure consistent signatures
 * 2. Transient Filtering: Ignores non-essential fields
 * 3. Type Coercion: Standardizes values for hash stability
 */
const canonicalSerialize = (val) => {
    const IGNORE_FIELDS = ['_t', 'timestamp', 'requestId', 'nonce'];

    if (val === null) return 'null';
    if (val === undefined) return '';

    if (typeof val !== 'object') {
        const str = String(val).trim();
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        return str;
    }

    if (Array.isArray(val)) {
        // Sort arrays of primitives to handle non-deterministic order from UI
        const normalizedItems = val.map(canonicalSerialize);
        const isPrimitiveArray = val.every(item => typeof item !== 'object');
        
        if (isPrimitiveArray) {
            normalizedItems.sort();
        }
        
        return `[${normalizedItems.join(',')}]`;
    }

    const sortedKeys = Object.keys(val)
        .filter(key => !IGNORE_FIELDS.includes(key))
        .sort();

    const parts = sortedKeys.map(key => {
        const value = val[key];
        if (value === undefined) return null;
        return `"${key}":${canonicalSerialize(value)}`;
    }).filter(p => p !== null);

    return `{${parts.join(',')}}`;
};

module.exports = canonicalSerialize;
