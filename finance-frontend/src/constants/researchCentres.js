import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { RESEARCH_CENTRES as STATIC_CENTRES } from '../data/dashboardData';

export const RESEARCH_CENTRES = STATIC_CENTRES;

export const useCentres = () => {
    const [centres, setCentres] = useState(STATIC_CENTRES);
    const [loading, setLoading] = useState(false);

    const loadCentres = async () => {
        try {
            setLoading(true);

            const response = await apiClient.get('/research-centers');
            const rawData = response?.data;
            
            const centresData =
                rawData?.data?.centres ||
                rawData?.data ||
                rawData?.centres ||
                rawData ||
                [];

            // PHASE 7: DATA NORMALIZATION (MANDATORY)
            const normalizeCentre = (c) => {
                if (typeof c === 'string') return { _id: c, name: c };
                return {
                    _id: c?._id || c?.id || Math.random().toString(36).substr(2, 9),
                    name: String(c?.name || c || "Unknown Center")
                };
            };

            const normalizedCentres = (Array.isArray(centresData) ? centresData : [centresData])
                .filter(Boolean)
                .map(normalizeCentre);

            // Ensure we fallback to STATIC_CENTRES if API returns empty
            const finalCentres = normalizedCentres.length > 0 
                ? normalizedCentres 
                : STATIC_CENTRES.map(normalizeCentre);

            setCentres(finalCentres);
        } catch (error) {
            console.error("CENTRE FETCH ERROR:", error);
            // Fallback for static data normalization too
            const normalizeCentre = (c) => (typeof c === 'string' ? { _id: c, name: c } : c);
            setCentres(STATIC_CENTRES.map(normalizeCentre));
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
