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

            // PHASE 2: RESEARCH CENTRE FULL FORM (UI ONLY)
            const CENTRE_MAP = {
                'CCCS': 'Centre for Computational and Communication Sciences',
                'CDDD': 'Centre for Drug Discovery and Development',
                'CNSNT': 'Centre for Nanoscience and Nanotechnology',
                'CWM': 'Centre for Waste Management',
                'CEER': 'Centre for Energy and Environmental Research',
                'CEAM': 'Centre for Advanced Materials'
            };

            const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
            
            const normalizeCentre = (c) => {
                const rawName = typeof c === "string" ? c : c?.name || "Unknown";
                return {
                    _id: c?._id || generateId(),
                    name: CENTRE_MAP[rawName] || rawName
                };
            };

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
