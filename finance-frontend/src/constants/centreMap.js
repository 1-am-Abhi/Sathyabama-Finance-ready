// Official Sathyabama research-hub full names (IRC Faculty master data).
// Codes are stored internally; the UI shows the full name.
export const CENTRE_MAP = {
    CCCS: "Centre for Climate Change Studies",
    CDDD: "Centre for Drug Discovery and Development",
    CEAM: "Centre for Excellence in Advanced Materials",
    CEER: "Centre for Excellence in Energy Research",
    CNSNT: "Centre for Nanoscience and Nanotechnology",
    CMNS: "Centre for Molecular and Nanomedical Sciences",
    CWM: "Centre for Waste Management",
    CAQ: "Centre for Aquaculture",
    NURSING: "Centre for Nursing",
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
