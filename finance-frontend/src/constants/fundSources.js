export const FUND_SOURCE_OPTIONS = [
    { value: 'PFMS', label: 'PFMS Funds', shortLabel: 'PFMS', overviewKey: 'pfmsFunds' },
    { value: 'INSTITUTIONAL', label: 'Institutional Funds', shortLabel: 'Institutional', overviewKey: 'institutionalFunds' },
    { value: 'OTHERS', label: "Other's Fund", shortLabel: "Other's Fund", overviewKey: 'othersFunds' },
];

export const FUND_SOURCES = FUND_SOURCE_OPTIONS.map((option) => option.value);

export const normalizeFundSource = (value) => {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');

    switch (raw) {
    case 'COLLEGE':
    case 'COLLEGE_FUNDED':
    case 'INSTITUTIONAL':
        return 'INSTITUTIONAL';
    case 'PFMS':
        return 'PFMS';
    case 'DIRECTOR':
    case 'DIRECTOR_INNOVATION':
    case 'DIRECTOR_INNOVATION_FUND':
    case 'OTHER':
    case 'OTHERS':
        return 'OTHERS';
    default:
        return 'INSTITUTIONAL';
    }
};

export const getFundSourceLabel = (value) => {
    const normalized = normalizeFundSource(value);
    return FUND_SOURCE_OPTIONS.find((option) => option.value === normalized)?.label || 'Institutional Funds';
};

export const getFundSourceShortLabel = (value) => {
    const normalized = normalizeFundSource(value);
    return FUND_SOURCE_OPTIONS.find((option) => option.value === normalized)?.shortLabel || 'Institutional';
};
