import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

export function hasPermission(userRole, permission) {
    const rolePermissions = {
        ADMIN: [
            'create_project',
            'approve_project',
            'assign_faculty',
            'approve_fund_request',
            'view_all_reports'
        ],
        FACULTY: [
            'view_assigned_projects',
            'request_funds',
            'upload_documents',
            'track_funds'
        ],
        FINANCE_OFFICER: [
            'update_fund_flow',
            'manage_pfms',
            'verify_internship_fees',
            'view_finance_reports'
        ]
    };

    return rolePermissions[userRole]?.includes(permission) || false;
}

export function canTransitionToStage(currentStage, targetStage, stages) {
    const currentIndex = stages.indexOf(currentStage);
    const targetIndex = stages.indexOf(targetStage);

    // Can only move to the next sequential stage
    return targetIndex === currentIndex + 1;
}
