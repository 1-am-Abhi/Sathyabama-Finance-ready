import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { RESEARCH_CENTRES as STATIC_CENTRES } from '../data/dashboardData';

export const RESEARCH_CENTRES = STATIC_CENTRES;

export const useCentres = () => {
    // Deprecated separate fetching logic to avoid 404s and redundant calls.
    // Dashboard now relies on statsData?.centres.
    const [centres, setCentres] = useState(STATIC_CENTRES);
    const [loading, setLoading] = useState(false);

    const refreshCentres = () => {
        // No-op or trigger dashboard refresh if needed
        console.log("useCentres: Refresh triggered (coordinated via Dashboard stats)");
    };

    return { centres, loading, refreshCentres };
};
