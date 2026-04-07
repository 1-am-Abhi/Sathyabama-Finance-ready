import React from 'react';
import { Badge } from '../ui/badge';

const StatusBadge = ({ status, type = 'project' }) => {
    const getVariant = () => {
        if (type === 'project') {
            switch (status) {
                case 'APPROVED':
                case 'ACTIVE':
                    return 'success';
                case 'PENDING':
                    return 'warning';
                case 'REJECTED':
                case 'CLOSED':
                    return 'destructive';
                default:
                    return 'default';
            }
        }

        if (type === 'fund') {
            switch (status) {
                case 'SETTLEMENT_CLOSED':
                case 'UTILIZATION_COMPLETED':
                    return 'success';
                case 'FUND_APPROVED':
                case 'FUND_RELEASED':
                    return 'default';
                case 'CHEQUE_RELEASED':
                case 'AMOUNT_DISBURSED':
                    return 'secondary';
                default:
                    return 'outline';
            }
        }

        if (type === 'payment') {
            return status === 'PAID' ? 'success' : 'warning';
        }

        return 'default';
    };

    const getLabel = () => {
        return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    return <Badge variant={getVariant()}>{getLabel()}</Badge>;
};

export default StatusBadge;
