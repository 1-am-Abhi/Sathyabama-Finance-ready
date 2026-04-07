import React from 'react';
import { Badge } from '../../../components/ui/badge';

const ProjectStatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
        switch (status) {
            case 'PENDING_DEAN_APPROVAL':
                return { label: 'Pending Dean Approval', className: 'bg-gray-100 text-gray-700 border-gray-300' };
            case 'APPROVED_BY_DEAN':
                return { label: 'Approved by Dean', className: 'bg-blue-100 text-blue-700 border-blue-300' };
            case 'FUND_RELEASED':
                return { label: 'Fund Released', className: 'bg-purple-100 text-purple-700 border-purple-300' };
            case 'CHEQUE_RELEASED':
                return { label: 'Cheque Released', className: 'bg-green-100 text-green-700 border-green-300' };
            case 'COMPLETED':
                return { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
            case 'REJECTED':
                return { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-300' };
            default:
                return { label: status, className: 'bg-gray-100 text-gray-700 border-gray-300' };
        }
    };

    const config = getStatusConfig(status);

    return (
        <Badge variant="outline" className={`${config.className} font-medium`}>
            {config.label}
        </Badge>
    );
};

export default ProjectStatusBadge;
