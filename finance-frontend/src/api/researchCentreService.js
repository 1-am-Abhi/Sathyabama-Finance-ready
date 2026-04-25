import apiClient from './client';

export const getResearchCentres = async () => {
    const res = await apiClient.get("/research-centers");
    return (
        res?.data?.data?.centres ||
        res?.data?.data ||
        res?.data?.centres ||
        res?.data ||
        []
    );
};
