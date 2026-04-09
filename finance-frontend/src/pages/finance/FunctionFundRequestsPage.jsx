import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatCurrency } from '../../utils/currency';
import { Calendar, CheckCircle, Clock, Search, FileText } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useFunctionRequests, useReleaseFunctionFunds } from '../../hooks/useFinance';

const FunctionFundRequestsPage = () => {
    const { setLayout } = useLayout();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [releaseFormData, setReleaseFormData] = useState({
        transactionId: '',
        releaseDate: new Date().toISOString().split('T')[0],
        remarks: ''
    });
    const { data: requests = [], isLoading } = useFunctionRequests();
    const releaseFunctionFunds = useReleaseFunctionFunds();

    useEffect(() => {
        setLayout('Function Fund Requests', 'Process approved event requests and move them through the finance pipeline');
    }, [setLayout]);

    const filteredRequests = requests.filter(req =>
        req.functionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.facultyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.department.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleReleaseClick = (request) => {
        setSelectedRequest(request);
        setReleaseFormData({
            transactionId: request.transactionId || '',
            releaseDate: new Date().toISOString().split('T')[0],
            remarks: '',
        });
        setIsReleaseModalOpen(true);
    };

    const handleReleaseSubmit = async (e) => {
        e.preventDefault();

        if (!selectedRequest?.fundRequestId) {
            return;
        }

        await releaseFunctionFunds.mutateAsync({
            fundRequestId: selectedRequest.fundRequestId,
            data: {
                transactionId: releaseFormData.transactionId,
                disbursementDate: releaseFormData.releaseDate,
                remarks: releaseFormData.remarks,
            },
        });

        setIsReleaseModalOpen(false);
        setSelectedRequest(null);
        setReleaseFormData({
            transactionId: '',
            releaseDate: new Date().toISOString().split('T')[0],
            remarks: '',
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED_BY_DEAN':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">Approved by Dean</Badge>;
            case 'FUNDS_RELEASED':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Funds Released</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-8">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card className="bg-white border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                            <CardContent className="p-6 flex items-center space-x-4">
                                <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900/50">
                                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Total Requests</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{requests.length}</h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                            <CardContent className="p-6 flex items-center space-x-4">
                                <div className="p-3 bg-yellow-100 rounded-lg dark:bg-yellow-900/50">
                                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Pending Release</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {requests.filter(r => r.status === 'APPROVED_BY_DEAN').length}
                                    </h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                            <CardContent className="p-6 flex items-center space-x-4">
                                <div className="p-3 bg-green-100 rounded-lg dark:bg-green-900/50">
                                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Funds Released</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {requests.filter(r => r.status === 'FUNDS_RELEASED').length}
                                    </h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <Card className="border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader className="border-b bg-gray-50 px-6 py-4 dark:bg-slate-800 dark:border-slate-700">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Request List
                                </CardTitle>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by function, faculty or dept..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50 dark:bg-slate-800 dark:border-slate-700 hover:bg-transparent">
                                            <TableHead className="w-[300px] dark:text-slate-300">Function Details</TableHead>
                                            <TableHead className="dark:text-slate-300">Requested By</TableHead>
                                            <TableHead className="dark:text-slate-300">Amount</TableHead>
                                            <TableHead className="dark:text-slate-300">Date</TableHead>
                                            <TableHead className="dark:text-slate-300">Status</TableHead>
                                            <TableHead className="text-right dark:text-slate-300">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12 text-gray-500 dark:text-slate-400">
                                                    Loading function requests...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredRequests.length > 0 ? (
                                            filteredRequests.map((request) => (
                                                <TableRow key={request.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 dark:border-slate-700">
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{request.functionName}</p>
                                                            <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-1">{request.description}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{request.facultyName}</p>
                                                            <p className="text-xs text-gray-500 dark:text-slate-400">{request.department}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-gray-900 dark:text-white">
                                                        {formatCurrency(request.amount)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center text-gray-500 dark:text-slate-400 text-sm">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {new Date(request.requestDate).toLocaleDateString()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(request.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {request.status === 'APPROVED_BY_DEAN' && request.fundRequestId && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => handleReleaseClick(request)}
                                                            >
                                                                Release Funds
                                                            </Button>
                                                        )}
                                                        {request.status === 'FUNDS_RELEASED' && (
                                                            <span className="text-sm text-gray-500 dark:text-slate-400 italic">
                                                                Processed on {new Date(request.releaseDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12 text-gray-500 dark:text-slate-400">
                                                    No requests found matching your search.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fund Release Modal */}
                    <Dialog open={isReleaseModalOpen} onOpenChange={setIsReleaseModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Release Funds for Function</DialogTitle>
                                <DialogDescription>
                                    Enter transaction details to release funds for "{selectedRequest?.functionName}"
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleReleaseSubmit} className="space-y-4 py-4">
                                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Amount to Release:</span>
                                        <span className="font-bold text-lg">{selectedRequest && formatCurrency(selectedRequest.amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Faculty:</span>
                                        <span className="font-medium">{selectedRequest?.facultyName}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="transactionId">Transaction ID *</Label>
                                    <Input
                                        id="transactionId"
                                        required
                                        value={releaseFormData.transactionId}
                                        onChange={(e) => setReleaseFormData({ ...releaseFormData, transactionId: e.target.value })}
                                        placeholder="Enter bank transaction reference"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="releaseDate">Release Date *</Label>
                                    <Input
                                        id="releaseDate"
                                        type="date"
                                        required
                                        value={releaseFormData.releaseDate}
                                        onChange={(e) => setReleaseFormData({ ...releaseFormData, releaseDate: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                                    <Input
                                        id="remarks"
                                        value={releaseFormData.remarks}
                                        onChange={(e) => setReleaseFormData({ ...releaseFormData, remarks: e.target.value })}
                                        placeholder="Any additional notes"
                                    />
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsReleaseModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={releaseFunctionFunds.isPending}>
                                        {releaseFunctionFunds.isPending ? 'Releasing...' : 'Confirm Release'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            );
};

export default FunctionFundRequestsPage;
