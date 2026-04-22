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
            console.log("CENTRE API:", rawData);

            const centresData =
                rawData?.data?.centres ||
                rawData?.data ||
                rawData?.centres ||
                rawData ||
                [];

            console.log("FINAL CENTRES:", centresData);

            // Ensure we fallback to STATIC_CENTRES if API returns empty
            const finalCentres = Array.isArray(centresData) && centresData.length > 0 
                ? centresData 
                : STATIC_CENTRES;

            setCentres(finalCentres);
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
