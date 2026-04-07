import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Loader2 } from 'lucide-react';
import ProjectStatusBadge from './ProjectStatusBadge';

const UpdateProjectStatusModal = ({ isOpen, onClose, project, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        newStatus: '',
        amount: '',
        transactionId: '',
        chequeNumber: '',
        chequeDate: '',
        bankName: '',
        releaseDate: '',
        remarks: '',
    });

    // Get available next statuses based on current status
    const getNextStatuses = (currentStatus) => {
        const statusFlow = {
            'PENDING_DEAN_APPROVAL': ['APPROVED_BY_DEAN', 'REJECTED'],
            'APPROVED_BY_DEAN': ['FUND_RELEASED', 'REJECTED'],
            'FUND_RELEASED': ['CHEQUE_RELEASED'],
            'CHEQUE_RELEASED': ['COMPLETED'],
        };
        return statusFlow[currentStatus] || [];
    };

    const nextStatuses = project ? getNextStatuses(project.currentStatus) : [];

    // Reset form when modal opens/closes or project changes
    useEffect(() => {
        if (isOpen && project) {
            setFormData({
                newStatus: nextStatuses[0] || '',
                amount: '',
                transactionId: '',
                chequeNumber: '',
                chequeDate: '',
                bankName: '',
                releaseDate: new Date().toISOString().split('T')[0],
                remarks: '',
            });
        }
    }, [isOpen, project]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            projectId: project?.id,
            newStatus: formData.newStatus,
            remarks: formData.remarks,
        };

        // Add conditional fields based on status
        if (formData.newStatus === 'FUND_RELEASED') {
            payload.fundReleasedAmount = parseFloat(formData.amount);
            payload.fundReleasedDate = formData.releaseDate;
            payload.transactionId = formData.transactionId;
        } else if (formData.newStatus === 'CHEQUE_RELEASED') {
            payload.chequeNumber = formData.chequeNumber;
            payload.chequeDate = formData.chequeDate;
            payload.bankName = formData.bankName;
        }

        try {
            await onSubmit(payload);
            onClose();
        } catch (error) {
            console.error('Failed to update project status:', error);
        }
    };

    const handleCancel = () => {
        setFormData({
            newStatus: '',
            amount: '',
            transactionId: '',
            chequeNumber: '',
            chequeDate: '',
            bankName: '',
            releaseDate: '',
            remarks: '',
        });
        onClose();
    };

    if (!project) return null;

    const showFundReleaseFields = formData.newStatus === 'FUND_RELEASED';
    const showChequeFields = formData.newStatus === 'CHEQUE_RELEASED';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Update Project Status</DialogTitle>
                    <DialogDescription>
                        Update the status for: {project.projectTitle}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {/* Project Info */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Current Status</p>
                                    <div className="mt-1">
                                        <ProjectStatusBadge status={project.currentStatus} />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Approved Amount</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        ₹{project.approvedAmount?.toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Principal Investigator</p>
                                <p className="text-sm font-medium text-gray-900">{project.principalInvestigator}</p>
                            </div>
                        </div>

                        {/* New Status */}
                        <div className="space-y-2">
                            <Label htmlFor="newStatus">New Status *</Label>
                            <select
                                id="newStatus"
                                value={formData.newStatus}
                                onChange={(e) => setFormData({ ...formData, newStatus: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                {nextStatuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fund Release Fields */}
                        {showFundReleaseFields && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Fund Release Amount (₹) *</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Enter amount"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="releaseDate">Release Date *</Label>
                                    <Input
                                        id="releaseDate"
                                        type="date"
                                        value={formData.releaseDate}
                                        onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="transactionId">Transaction ID *</Label>
                                    <Input
                                        id="transactionId"
                                        type="text"
                                        placeholder="Enter transaction ID"
                                        value={formData.transactionId}
                                        onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* Cheque Release Fields */}
                        {showChequeFields && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="chequeNumber">Cheque Number *</Label>
                                    <Input
                                        id="chequeNumber"
                                        type="text"
                                        placeholder="Enter cheque number"
                                        value={formData.chequeNumber}
                                        onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="chequeDate">Cheque Date *</Label>
                                    <Input
                                        id="chequeDate"
                                        type="date"
                                        value={formData.chequeDate}
                                        onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bankName">Bank Name *</Label>
                                    <Input
                                        id="bankName"
                                        type="text"
                                        placeholder="Enter bank name"
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* Remarks */}
                        <div className="space-y-2">
                            <Label htmlFor="remarks">Remarks</Label>
                            <textarea
                                id="remarks"
                                rows="3"
                                placeholder="Add any remarks or notes"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isLoading ? 'Updating...' : 'Update Status'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateProjectStatusModal;
