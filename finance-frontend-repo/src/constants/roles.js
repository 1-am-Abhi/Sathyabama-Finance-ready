export const ROLES = {
    ADMIN: 'ADMIN',
    FACULTY: 'FACULTY',
    FINANCE_OFFICER: 'FINANCE_OFFICER'
};

export const ROLE_LABELS = {
    [ROLES.ADMIN]: 'Admin',
    [ROLES.FACULTY]: 'Faculty',
    [ROLES.FINANCE_OFFICER]: 'Finance Officer'
};

export const PERMISSIONS = {
    CREATE_PROJECT: 'create_project',
    APPROVE_PROJECT: 'approve_project',
    ASSIGN_FACULTY: 'assign_faculty',
    APPROVE_FUND_REQUEST: 'approve_fund_request',
    VIEW_ALL_REPORTS: 'view_all_reports',
    VIEW_ASSIGNED_PROJECTS: 'view_assigned_projects',
    REQUEST_FUNDS: 'request_funds',
    UPLOAD_DOCUMENTS: 'upload_documents',
    TRACK_FUNDS: 'track_funds',
    UPDATE_FUND_FLOW: 'update_fund_flow',
    MANAGE_PFMS: 'manage_pfms',
    VERIFY_INTERNSHIP_FEES: 'verify_internship_fees',
    VIEW_FINANCE_REPORTS: 'view_finance_reports'
};
