import React, { useState } from 'react';
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
import { useUpdateFunding } from '../../../hooks/useFinance';
import { Loader2 } from 'lucide-react';

const UpdateFundingModal = ({ isOpen, onClose, department, onSuccess }) => {
    const [formData, setFormData] = useState({
        fundSource: 'COLLEGE',
        amount: '',
        remarks: '',
    });

    const updateFundingMutation = useUpdateFunding();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            departmentId: department?.id,
            fundSource: formData.fundSource,
            amount: parseFloat(formData.amount),
            remarks: formData.remarks,
        };

        try {
            await updateFundingMutation.mutateAsync(payload);

            // Reset form
            setFormData({
                fundSource: 'COLLEGE',
                amount: '',
                remarks: '',
            });

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }

            // Close modal
            onClose();
        } catch (error) {
            console.error('Failed to update funding:', error);
        }
    };

    const handleCancel = () => {
        // Reset form
        setFormData({
            fundSource: 'COLLEGE',
            amount: '',
            remarks: '',
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Update Funding</DialogTitle>
                    <DialogDescription>
                        {department ? `Update funding for ${department.name}` : 'Update department funding'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {/* Fund Source Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="fundSource">Fund Source *</Label>
                            <select
                                id="fundSource"
                                value={formData.fundSource}
                                onChange={(e) => setFormData({ ...formData, fundSource: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                <option value="COLLEGE">College Funds</option>
                                <option value="PFMS">PFMS Funds</option>
                            </select>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₹) *</Label>
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

                        {/* Remarks Field */}
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

                        {/* Error Message */}
                        {updateFundingMutation.isError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                Failed to update funding. Please try again.
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={updateFundingMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateFundingMutation.isPending}
                        >
                            {updateFundingMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {updateFundingMutation.isPending ? 'Updating...' : 'Submit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateFundingModal;
