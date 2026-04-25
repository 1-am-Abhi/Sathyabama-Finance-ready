export const CENTRE_MAP = {
    CCCS: "Centre for Computational and Communication Sciences",
    CDDD: "Centre for Drug Discovery and Development",
    CNSNT: "Centre for Nanoscience and Nanotechnology",
    CWM: "Centre for Waste Management",
    CEER: "Centre for Energy and Environmental Research",
    CEAM: "Centre for Advanced Materials",
    CMNS: "Centre for Molecular and Nanomedical Sciences",
};

export const getCentreName = (value) => {
    if (!value) return "Not Assigned";

    // Handle object case
    if (typeof value === "object") {
        const name = value.name || value.code;
        return CENTRE_MAP[name] || name || "Not Assigned";
    }

    // Handle string case
    return CENTRE_MAP[value] || value;
};
