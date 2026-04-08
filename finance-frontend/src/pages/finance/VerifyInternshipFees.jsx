import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useLayout } from '../../contexts/LayoutContext';
import apiClient from '../../api/client';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { AlertCircle } from 'lucide-react';

const VerifyInternshipFees = () => {
    const { setLayout } = useLayout();
    const [selectedInternship, setSelectedInternship] = useState(null);

    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLayout("Internship Fees", "Verify and approve student internship payment records");
        fetchInternships();
    }, [setLayout]);

    const fetchInternships = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/finance/internship-fees');
            if (response.data.success) {
                setInternships(response.data.data);
            }
            setLoading(false);
        } catch (err) {
            console.error('Fetch Internships Error:', err);
            setError('Failed to load internship records');
            setLoading(false);
        }
    };
    
    const [paymentData, setPaymentData] = useState({
        paymentMode: '',
        receiptNumber: '',
        paymentDate: ''
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.put(`/finance/internship-fees/${selectedInternship._id || selectedInternship.id}`, {
                ...paymentData,
                paymentStatus: 'PAID'
            });
            
            if (response.data.success) {
                // Update local state instead of full refetch for smoother UX
                setInternships(prev => prev.map(item => 
                    item._id === selectedInternship._id || item.id === selectedInternship.id 
                    ? { ...item, ...paymentData, paymentStatus: 'PAID', approvalBlocked: false } 
                    : item
                ));
                setSelectedInternship(null);
                setPaymentData({ paymentMode: '', receiptNumber: '', paymentDate: '' });
            }
        } catch (err) {
            console.error('Update Payment Error:', err);
        }
    };

    const pendingCount = internships.filter(i => i.paymentStatus === 'PENDING').length;

    return (
        <div className="p-8">
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
    );
};

export default VerifyInternshipFees;
