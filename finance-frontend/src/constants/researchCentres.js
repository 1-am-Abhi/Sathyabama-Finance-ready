import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { RESEARCH_CENTRES as STATIC_CENTRES } from '../data/dashboardData';

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

            // PHASE 4: NORMALIZE DATA ONCE
            const normalizeCentre = (c) => {
                if (!c) return { _id: Math.random().toString(), name: "Unknown Center" };
                if (typeof c === 'string') return { _id: c, name: c };
                
                const id = c?._id || c?.id || Math.random().toString(36).substr(2, 9);
                const name = typeof c?.name === 'object' ? (c.name.name || c.name.label || String(c.name)) : String(c?.name || c?.centre || "Unknown Center");
                
                return {
                    _id: String(id),
                    name: name
                };
            };

            const finalCentres = (Array.isArray(centresData) ? centresData : [centresData])
                .filter(Boolean)
                .map(normalizeCentre);

            setCentres(finalCentres.length > 0 ? finalCentres : STATIC_CENTRES);
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
