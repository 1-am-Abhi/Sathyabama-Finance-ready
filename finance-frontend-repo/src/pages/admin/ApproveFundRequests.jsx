import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { CheckCircle, XCircle, DollarSign, FileText } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';

const ApproveFundRequests = () => {
    const [fundRequests, setFundRequests] = useState([
        {
            id: 1,
            projectTitle: 'AI-Powered Medical Diagnosis System',
            faculty: 'Dr. Priya Sharma',
            requestedAmount: 1500000,
            purpose: 'Equipment purchase and software licenses',
            submittedDate: '2024-01-25',
            status: 'PENDING'
        },
        {
            id: 2,
            projectTitle: 'Smart Traffic Management System',
            faculty: 'Dr. Vikram Singh',
            requestedAmount: 2000000,
            purpose: 'Hardware components and field testing',
            submittedDate: '2024-01-22',
            status: 'PENDING'
        },
        {
            id: 3,
            projectTitle: 'Renewable Energy Grid Optimization',
            faculty: 'Dr. Bharti',
            requestedAmount: 3000000,
            purpose: 'Research equipment and data collection',
            submittedDate: '2024-01-20',
            status: 'APPROVED'
        },
    ]);

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');

    const handleApprove = (requestId) => {
        setFundRequests(fundRequests.map(r =>
            r.id === requestId ? { ...r, status: 'APPROVED' } : r
        ));
        setSelectedRequest(null);
        setApprovalNotes('');
    };

    const handleReject = (requestId) => {
        setFundRequests(fundRequests.map(r =>
            r.id === requestId ? { ...r, status: 'REJECTED' } : r
        ));
        setSelectedRequest(null);
        setApprovalNotes('');
    };

    const pendingRequests = fundRequests.filter(r => r.status === 'PENDING');
    const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.requestedAmount, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        Approve Fund Requests
                    </h1>
                    <p className="text-gray-600 mt-2 text-lg">Review and approve funding requests from faculty</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Pending Requests</p>
                                    <p className="text-3xl font-bold mt-1">{pendingRequests.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Pending Amount</p>
                                    <p className="text-3xl font-bold mt-1">₹{(totalPendingAmount / 10000000).toFixed(1)}Cr</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Approved This Month</p>
                                    <p className="text-3xl font-bold mt-1">
                                        {fundRequests.filter(r => r.status === 'APPROVED').length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Fund Requests Table */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl">Fund Requests</CardTitle>
                        <CardDescription>Review funding requests and take action</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Faculty</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Purpose</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fundRequests.map((request) => (
                                    <TableRow key={request.id} className="hover:bg-gray-50">
                                        <TableCell className="font-semibold">{request.projectTitle}</TableCell>
                                        <TableCell>{request.faculty}</TableCell>
                                        <TableCell className="font-bold text-green-600">
                                            ₹{(request.requestedAmount / 100000).toFixed(1)}L
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                                        <TableCell>{new Date(request.submittedDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    request.status === 'APPROVED' ? 'success' :
                                                        request.status === 'REJECTED' ? 'destructive' :
                                                            'default'
                                                }
                                            >
                                                {request.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedRequest(request)}
                                                >
                                                    View Details
                                                </Button>
                                                {request.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleApprove(request.id)}
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleReject(request.id)}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Request Details Modal */}
                {selectedRequest && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <Card className="max-w-2xl w-full border-0 shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-2xl">Fund Request Details</CardTitle>
                                <CardDescription>{selectedRequest.projectTitle}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500">Faculty</p>
                                        <p className="text-base font-semibold mt-1">{selectedRequest.faculty}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500">Requested Amount</p>
                                        <p className="text-base font-semibold mt-1 text-green-600">
                                            ₹{(selectedRequest.requestedAmount / 100000).toFixed(1)} Lakhs
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm font-semibold text-gray-500">Purpose</p>
                                        <p className="text-base mt-1">{selectedRequest.purpose}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-gray-500 mb-2">Approval Notes (Optional)</p>
                                    <Textarea
                                        placeholder="Add any notes or conditions for this approval..."
                                        value={approvalNotes}
                                        onChange={(e) => setApprovalNotes(e.target.value)}
                                        rows={4}
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <Button variant="outline" onClick={() => {
                                        setSelectedRequest(null);
                                        setApprovalNotes('');
                                    }}>
                                        Close
                                    </Button>
                                    {selectedRequest.status === 'PENDING' && (
                                        <>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => handleApprove(selectedRequest.id)}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Approve Request
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleReject(selectedRequest.id)}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Reject Request
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApproveFundRequests;
