import { useState, useEffect } from 'react';
import { getResearchCentres } from '../api/researchCentreService';
import { RESEARCH_CENTRES as STATIC_CENTRES } from '../data/dashboardData';

export const useCentres = () => {
    const [centres, setCentres] = useState(STATIC_CENTRES);
    const [loading, setLoading] = useState(false);

    const loadCentres = async () => {
        try {
            setLoading(true);

            const centresData = await getResearchCentres();

            // PHASE 2: SAFE DATA NORMALIZATION (MINIMAL)
            const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
            
            const normalizeCentre = (c) => ({
                _id: c?._id || generateId(),
                name: typeof c === "string" ? c : c?.name || "Unknown"
            });

            const normalized = Array.isArray(centresData) 
                ? centresData.map(normalizeCentre) 
                : [];

            setCentres(normalized.length > 0 ? normalized : STATIC_CENTRES);
        } catch (error) {
            console.error("CENTRE FETCH ERROR:", error);
            setCentres(STATIC_CENTRES);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCentres();
    }, []);

    const refreshCentres = () => {
        loadCentres();
    };

    return { centres, loading, refreshCentres };
};
