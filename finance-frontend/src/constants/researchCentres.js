import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { RESEARCH_CENTRES as STATIC_CENTRES } from '../data/dashboardData';

export const RESEARCH_CENTRES = STATIC_CENTRES;

export const useCentres = () => {
    const [centres, setCentres] = useState(STATIC_CENTRES);
    const [loading, setLoading] = useState(true);

    const fetchCentres = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/auth/centres');
            if (response.data.success) {
                setCentres(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCentres();
    }, []);

    return { centres, loading, refreshCentres: fetchCentres };
};
