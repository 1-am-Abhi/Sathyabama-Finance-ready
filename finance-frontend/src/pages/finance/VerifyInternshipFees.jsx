import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

const VerifyInternshipFees = () => {
    const { setLayout } = useLayout();

    React.useEffect(() => {
        setLayout("Internship Fee Verification", "Verify and update internship fee payment status");
    }, [setLayout]);
    const [selectedInternship, setSelectedInternship] = useState(null);
    const [paymentData, setPaymentData] = useState({
        paymentMode: '',
        receiptNumber: '',
        paymentDate: ''
    });

    // Mock data
    const internships = [
        {
            id: 1,
            studentName: 'Rahul Kumar',
            studentId: 'STU2024001',
            internshipTitle: 'Summer Research Internship',
            feeAmount: 5000,
            paymentStatus: 'PENDING',
            approvalBlocked: true
        },
        {
            id: 2,
            studentName: 'Priya Sharma',
            studentId: 'STU2024002',
            internshipTitle: 'AI Lab Internship',
            feeAmount: 5000,
            paymentStatus: 'PAID',
            paymentMode: 'Online',
            receiptNumber: 'RCP2024001',
            paymentDate: '2024-01-15',
            approvalBlocked: false
        },
        {
            id: 3,
            studentName: 'Amit Patel',
            studentId: 'STU2024003',
            internshipTitle: 'IoT Research Internship',
            feeAmount: 5000,
            paymentStatus: 'PENDING',
            approvalBlocked: true
        }
    ];

    const handleVerifyPayment = (internship) => {
        setSelectedInternship(internship);
        if (internship.paymentStatus === 'PAID') {
            setPaymentData({
                paymentMode: internship.paymentMode || '',
                receiptNumber: internship.receiptNumber || '',
                paymentDate: internship.paymentDate || ''
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Updating payment for internship:', selectedInternship.id, paymentData);
        alert('Payment status updated successfully!');
        setSelectedInternship(null);
        setPaymentData({ paymentMode: '', receiptNumber: '', paymentDate: '' });
    };

    const pendingCount = internships.filter(i => i.paymentStatus === 'PENDING').length;

    return (
        <div className="flex min-h-screen bg-gray-50">
            <div className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        {/* Title handled by Layout */}
                    </div>

                    {/* Alert for pending verifications */}
                    {pendingCount > 0 && (
                        <Card className="mb-6 border-yellow-200 bg-yellow-50">
                            <CardContent className="pt-6">
                                <div className="flex items-start space-x-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-900">
                                            {pendingCount} internship{pendingCount > 1 ? 's' : ''} blocked from approval
                                        </p>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            These internships cannot be approved until fee payment is verified and marked as "Paid"
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Internships List */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Internships</CardTitle>
                                    <CardDescription>All internship applications and their payment status</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student</TableHead>
                                                <TableHead>Internship</TableHead>
                                                <TableHead>Fee Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {internships.map((internship) => (
                                                <TableRow key={internship.id} className={internship.approvalBlocked ? 'bg-red-50' : ''}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{internship.studentName}</div>
                                                            <div className="text-xs text-gray-500">{internship.studentId}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{internship.internshipTitle}</TableCell>
                                                    <TableCell>₹{internship.feeAmount}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={internship.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                                                            {internship.paymentStatus}
                                                        </Badge>
                                                        {internship.approvalBlocked && (
                                                            <div className="text-xs text-red-600 mt-1">🔒 Approval Blocked</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant={selectedInternship?.id === internship.id ? 'default' : 'outline'}
                                                            onClick={() => handleVerifyPayment(internship)}
                                                        >
                                                            {internship.paymentStatus === 'PAID' ? 'View' : 'Verify'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Payment Verification Form */}
                        <div>
                            {selectedInternship ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Payment Details</CardTitle>
                                        <CardDescription>{selectedInternship.studentName}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Internship</Label>
                                                <p className="text-sm text-gray-600">{selectedInternship.internshipTitle}</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Fee Amount</Label>
                                                <p className="text-sm font-semibold">₹{selectedInternship.feeAmount}</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="paymentMode">Payment Mode *</Label>
                                                <select
                                                    id="paymentMode"
                                                    value={paymentData.paymentMode}
                                                    onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    required
                                                >
                                                    <option value="">Select Mode</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Online">Online</option>
                                                    <option value="Cheque">Cheque</option>
                                                    <option value="DD">Demand Draft</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="receiptNumber">Receipt Number *</Label>
                                                <Input
                                                    id="receiptNumber"
                                                    value={paymentData.receiptNumber}
                                                    onChange={(e) => setPaymentData({ ...paymentData, receiptNumber: e.target.value })}
                                                    placeholder="Enter receipt number"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="paymentDate">Payment Date *</Label>
                                                <Input
                                                    id="paymentDate"
                                                    type="date"
                                                    value={paymentData.paymentDate}
                                                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="flex flex-col space-y-2 pt-4">
                                                <Button type="submit" className="w-full">
                                                    Mark as Paid
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => setSelectedInternship(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center text-gray-500 py-12">
                                            <p>Select an internship to verify payment details</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default VerifyInternshipFees;
