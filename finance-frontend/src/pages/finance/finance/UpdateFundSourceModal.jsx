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
import { Loader2 } from 'lucide-react';

const UpdateFundSourceModal = ({ isOpen, onClose, fundSource, onSubmit, isLoading }) => {
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');

    // Generate financial year options: e.g. "2023-24", "2024-25" ...
    const generateFinancialYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = currentYear - 2; y <= currentYear + 2; y++) {
            years.push(`${y}-${String(y + 1).slice(-2)}`);
        }
        return years;
    };
    const financialYears = generateFinancialYears();
    const currentFY = `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
    const [financialYear, setFinancialYear] = useState(currentFY);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            fundSource: fundSource?.type, // 'COLLEGE', 'PFMS', or 'OTHERS'
            amount: parseFloat(amount),
            remarks: remarks,
            financialYear: financialYear,
        };

        try {
            await onSubmit(payload);

            // Reset form
            setAmount('');
            setRemarks('');
            setFinancialYear(currentFY);

            // Close modal
            onClose();
        } catch (error) {
            console.error('Failed to update fund source:', error);
        }
    };

    const handleCancel = () => {
        // Reset form
        setAmount('');
        setRemarks('');
        setFinancialYear(currentFY);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Update {fundSource?.title}</DialogTitle>
                    <DialogDescription>
                        Update the total amount received from {fundSource?.type === 'COLLEGE' ? 'College' : fundSource?.type === 'PFMS' ? 'Government (PFMS)' : 'Other Sources'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {/* Current Amount Display */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Current Total Allocated</p>
                            <p className="text-2xl font-bold text-blue-700">
                                ₹{fundSource?.currentAmount?.toLocaleString('en-IN') || '0'}
                            </p>
                        </div>

                        {/* Financial Year Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="financialYear">Financial Year *</Label>
                            <select
                                id="financialYear"
                                value={financialYear}
                                onChange={(e) => setFinancialYear(e.target.value)}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {financialYears.map((fy) => (
                                    <option key={fy} value={fy}>{fy}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500">Select the financial year this update applies to</p>
                        </div>


                        {/* New Amount Input */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">New Total Amount (₹) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Enter new total amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                            <p className="text-xs text-gray-500">
                                Enter the total amount received from {fundSource?.type === 'COLLEGE' ? 'college' : fundSource?.type === 'PFMS' ? 'government' : 'other sources'}
                            </p>
                        </div>

                        {/* Remarks Field */}
                        <div className="space-y-2">
                            <Label htmlFor="remarks">Remarks</Label>
                            <textarea
                                id="remarks"
                                rows="3"
                                placeholder="Add any remarks or notes about this update"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
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
                            {isLoading ? 'Updating...' : 'Update Amount'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateFundSourceModal;
