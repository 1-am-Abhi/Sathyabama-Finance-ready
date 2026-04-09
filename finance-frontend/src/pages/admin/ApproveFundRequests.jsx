import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { CheckCircle, XCircle, Banknote, FileText, ArrowRight, Wallet, RefreshCw, Brain } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { formatCurrency } from '../../utils/format';
import DateFilter from '../../components/shared/DateFilter';
import { useCentres } from '../../constants/researchCentres';
import { FUND_SOURCES } from '../../constants/fundSources';
import AIResultModal from '../../components/shared/AIResultModal';
import { summarizeRequest } from '../../services/aiService';

const ApproveFundRequests = () => {
    const { fundRequests, approveRequest, rejectRequest, advanceStage, isLoading } = usePipeline();
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const { centres: dynamicCentres } = useCentres();
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState('All');
    const [selectedSource, setSelectedSource] = useState('All');
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionModal, setRejectionModal] = useState({ isOpen: false, requestId: null, remarks: '' });
    const [revokeModal, setRevokeModal] = useState({ isOpen: false, request: null, remarks: '' });


    React.useEffect(() => {
        setLayout(
            "Approve Fund Requests",
            selectedDate ? `Requests for ${new Date(selectedDate).toLocaleDateString()}` : "Manage fund approvals and cheque disbursements"
        );
    }, [selectedDate, setLayout]);

    const handleApprove = async (requestId) => {
        try {
            const req = fundRequests.find(r => (r._id || r.id) === requestId);
            await approveRequest({ requestId, remarks: approvalNotes || 'Approved by Admin' });
            
            // 1. Notify the Faculty that their request was approved
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Your Fund Request${req?.projectTitle ? ` for "${req.projectTitle}"` : ''} has been APPROVED! Please upload payment proofs and bills to proceed with disbursement.`,
                actionUrl: '/faculty/request-funds',
                targetUserId: req?.userId
            });
            
            setSelectedRequest(null);
            setApprovalNotes('');
        } catch (error) {
            console.error('Approval failed:', error);
        }
    };

    const handleRejectClick = (requestId) => {
        setRejectionModal({ isOpen: true, requestId, remarks: '' });
    };

    const handleConfirmReject = async () => {
        const { requestId, remarks } = rejectionModal;
        try {
            // Rejection now uses a dedicated endpoint
            await rejectRequest({ requestId, remarks }); 
            
            // Notify Faculty
            addNotification({
                role: 'FACULTY',
                type: 'rejection',
                message: `Your Fund Request was REJECTED. Remarks: ${remarks}`,
                actionUrl: '/faculty/request-funds',
                targetUserId: (fundRequests.find(r => r.id === requestId))?.userId || (fundRequests.find(r => r._id === requestId))?.userId
            });
            
            setRejectionModal({ isOpen: false, requestId: null, remarks: '' });
            setSelectedRequest(null);
            setApprovalNotes('');
        } catch (error) {
            console.error('Rejection failed:', error);
        }
    };

    const handleRevoke = async () => {
        const { request, remarks } = revokeModal;
        try {
            // Revoke logic here - maybe setting status back to pending
            // For now let's just use approveRequest with a revoke note if that's how backend handles it
            // Or implement a dedicated revoke endpoint in backend
            setRevokeModal({ isOpen: false, request: null, remarks: '' });
            setSelectedRequest(null);
        } catch (error) {
            console.error('Revoke failed:', error);
        }
    };

    // Cheque Logic Handlers
    const handleApproveCheque = async (requestId) => {
        try {
            await advanceStage({ requestId, nextStage: 'CHEQUE_RELEASED', remarks: 'Cheque issued' });
            setSelectedRequest(prev => ({ ...prev, currentStage: 'CHEQUE_RELEASED', chequeStatus: 'Approved' }));
        } catch (error) {
            console.error('Cheque approval failed:', error);
        }
    };

    const handleDisburseCheque = async (requestId) => {
        try {
            const req = fundRequests.find(r => (r._id || r.id) === requestId) || selectedRequest;
            await advanceStage({ requestId, nextStage: 'AMOUNT_DISBURSED', remarks: 'Amount disbursed by Finance Officer' });
            setSelectedRequest(prev => prev ? ({ ...prev, currentStage: 'AMOUNT_DISBURSED', chequeStatus: 'Disbursed' }) : null);
            
            // Notify faculty that funds are disbursed
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Funds disbursed for "${req?.projectTitle || 'your project'}"! Amount: ₹${req?.requestedAmount?.toLocaleString() || '0'}. Please proceed with utilization.`,
                actionUrl: '/faculty/request-funds',
                targetUserId: req?.userId
            });
        } catch (error) {
            console.error('Disbursement failed:', error);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading Pipeline Data...</div>;

    const filteredRequests = (fundRequests || []).filter(r => {
        const requestDate = r.submittedDate || r.createdAt;
        const matchesDate = !selectedDate || (requestDate && new Date(requestDate).toDateString() === new Date(selectedDate).toDateString());
        const matchesCentre = selectedCentre === 'All' || r.centre === selectedCentre;
        const matchesSource = selectedSource === 'All' || r.source === selectedSource;
        return matchesDate && matchesCentre && matchesSource;
    });

    // Stats Calculation
    const approvedAmount = filteredRequests
        .filter(r => r.status === 'APPROVED')
        .reduce((sum, r) => sum + r.requestedAmount, 0);

    const pendingChequesCount = filteredRequests
        .filter(r => r.status === 'APPROVED' && r.currentStage !== 'CHEQUE_RELEASED' && r.currentStage !== 'AMOUNT_DISBURSED')
        .length;

    // Disbursed = requests where cheque has been released/amount disbursed
    const disbursedAmount = filteredRequests
        .filter(r => r.currentStage === 'AMOUNT_DISBURSED' || r.currentStage === 'CHEQUE_RELEASED' || r.chequeStatus === 'Disbursed')
        .reduce((sum, r) => sum + r.requestedAmount, 0);


    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6">

                {/* Polished Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-0 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Approved Amount</p>
                                    <p className="text-3xl font-bold mt-2">{formatCurrency(approvedAmount)}</p>
                                    <p className="text-[10px] mt-1 opacity-60">Total Sanctioned</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100/50 dark:bg-blue-800/20 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Pending Cheques</p>
                                    <p className="text-3xl font-bold mt-2">{pendingChequesCount}</p>
                                    <p className="text-[10px] mt-1 opacity-60">Approved but not Issued</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-100/50 dark:bg-amber-800/20 rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Disbursed Amount</p>
                                    <p className="text-3xl font-bold mt-2">{formatCurrency(disbursedAmount)}</p>
                                    <p className="text-[10px] mt-1 opacity-60">Funds Released</p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-100/50 dark:bg-emerald-800/20 rounded-xl flex items-center justify-center">
                                    <Banknote className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Unified Filter Bar */}
                <div className="mb-6 mt-8 flex flex-col xl:flex-row items-start xl:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm gap-4">
                    <div className="flex flex-wrap items-center gap-4 w-full">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Source:</span>
                            <select 
                                className="h-9 px-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-md text-xs outline-none"
                                value={selectedSource}
                                onChange={(e) => setSelectedSource(e.target.value)}
                            >
                                <option value="All">All Sources</option>
                                {FUND_SOURCES.map(source => (
                                    <option key={source} value={source === 'Others' ? 'OTHERS' : source.toUpperCase() === 'INSTITUTIONAL' ? 'INSTITUTIONAL' : source}>
                                        {source === 'Others' ? "Other's Fund" : source}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Research Centre:</span>
                            <select 
                                className="h-9 px-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-md text-xs outline-none"
                                value={selectedCentre}
                                onChange={(e) => setSelectedCentre(e.target.value)}
                            >
                                <option value="All">All Centres</option>
                                {dynamicCentres.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-full md:w-48">
                                <DateFilter
                                    selectedDate={selectedDate}
                                    onChange={setSelectedDate}
                                    placeholder="Filter by Date"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end w-full md:w-auto shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-maroon-600 dark:hover:text-maroon-400 transition-colors"
                            onClick={() => {
                                setSelectedCentre('All');
                                setSelectedSource('All');
                                setSelectedDate(null);
                            }}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    </div>
                </div>

                {/* Fund Requests Table */}
                <Card className="border-0 shadow-lg dark:bg-slate-900">
                    <CardHeader className="border-b dark:border-slate-800">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl dark:text-white">Fund Requests</CardTitle>
                                <CardDescription className="dark:text-gray-400">Review funding requests and manage disbursements</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                                {selectedDate && (
                                    <Badge variant="outline" className="dark:text-gray-400 border-dashed animate-pulse">
                                        {new Date(selectedDate).toLocaleDateString()}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-slate-800">
                                    <TableHead className="dark:text-gray-400">Project</TableHead>
                                    <TableHead className="dark:text-gray-400">Source</TableHead>
                                    <TableHead className="dark:text-gray-400">Amount</TableHead>
                                    <TableHead className="dark:text-gray-400">Purpose</TableHead>
                                    <TableHead className="dark:text-gray-400">Submitted</TableHead>
                                    <TableHead className="dark:text-gray-400">Status</TableHead>
                                    <TableHead className="text-right dark:text-gray-400 min-w-[280px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRequests.map((request) => (
                                    <TableRow
                                        key={request._id || request.id}
                                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800 cursor-pointer"
                                        onClick={() => setSelectedRequest(request)}
                                    >
                                        <TableCell className="font-semibold dark:text-gray-200">
                                            {request.projectTitle}
                                            <div className="text-xs text-gray-400 font-normal mt-0.5">{request.faculty}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`${request.source === 'PFMS' ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20' : 'text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/20'}`}>
                                                {request.source}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(request.requestedAmount)}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate dark:text-gray-400">{request.purpose}</TableCell>
                                        <TableCell className="dark:text-gray-300">{new Date(request.submittedDate || request.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge
                                                    variant={
                                                        request.status === 'APPROVED' ? 'success' :
                                                            request.status === 'REJECTED' ? 'destructive' :
                                                                'default'
                                                    }
                                                    className={request.status === 'PENDING' ? 'dark:bg-slate-800 dark:text-gray-300 border-0' : 'border-0 w-fit'}
                                                >
                                                    {request.status}
                                                </Badge>
                                                {request.status === 'APPROVED' && (
                                                    <Badge className={`w-fit text-[10px] px-1.5 py-0 ${request.chequeStatus === 'Disbursed' ? 'bg-green-100 text-green-700' :
                                                        request.chequeStatus === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        Cheque: {request.chequeStatus}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="actions-cell justify-end">
                                                {request.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 action-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRejectClick(request._id || request.id);
                                                            }}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm px-4 action-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleApprove(request._id || request.id);
                                                            }}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-indigo-400 hover:bg-indigo-500/10 text-[10px] h-7 font-black action-btn"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setAiModal({ open: true, loading: true, result: null });
                                                                const r = await summarizeRequest(request);
                                                                setAiModal({ open: true, loading: false, result: r });
                                                            }}
                                                        >
                                                            <Brain className="w-3 h-3 mr-1" /> AI Summary
                                                        </Button>
                                                    </>
                                                )}
                                                {request.status === 'APPROVED' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 action-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRequest(request);
                                                            setRevokeModal({ isOpen: true, request, remarks: '' });
                                                        }}
                                                    >
                                                        Revoke
                                                    </Button>
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <Card className="max-w-2xl w-full border-0 shadow-2xl dark:bg-slate-900">
                            <CardHeader className="border-b dark:border-slate-800">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className={`${selectedRequest.source === 'PFMS' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-purple-600 border-purple-200 bg-purple-50'}`}>
                                                {selectedRequest.source}
                                            </Badge>
                                            {selectedRequest.status === 'APPROVED' && (
                                                <Badge className={`text-[10px] px-1.5 py-0 ${selectedRequest.chequeStatus === 'Disbursed' ? 'bg-green-100 text-green-700' :
                                                    selectedRequest.chequeStatus === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    Cheque: {selectedRequest.chequeStatus}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-2xl dark:text-white">{selectedRequest.projectTitle}</CardTitle>
                                        <CardDescription className="dark:text-gray-400 mt-1">Request Funds for: {selectedRequest.purpose}</CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Amount</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(selectedRequest.requestedAmount)}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Principal Investigator</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">{selectedRequest.faculty}</p>
                                        <p className="text-xs text-gray-400">{selectedRequest.department}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Research Centre</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">{selectedRequest.centre}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Submitted On</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">
                                            {new Date(selectedRequest.submittedDate || selectedRequest.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Request Status</p>
                                        <Badge className="mt-1" variant={selectedRequest.status === 'APPROVED' ? 'success' : selectedRequest.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                                            {selectedRequest.status}
                                        </Badge>
                                    </div>
                                </div>

                                {selectedRequest.status === 'APPROVED' && (
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                            <Wallet className="w-4 h-4 mr-2" />
                                            Cheque Processing
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            {/* Status Steps */}
                                            <div className={`flex-1 h-2 rounded-full ${selectedRequest.chequeStatus !== null ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                                            <div className={`flex-1 h-2 rounded-full ${['Approved', 'Disbursed'].includes(selectedRequest.chequeStatus) ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                                            <div className={`flex-1 h-2 rounded-full ${selectedRequest.chequeStatus === 'Disbursed' ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                                            <span>Pending</span>
                                            <span>Cheque Approved</span>
                                            <span>Disbursed</span>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-4">
                                            {selectedRequest.chequeStatus === 'Pending' && (
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleApproveCheque(selectedRequest._id || selectedRequest.id)}>
                                                    Approve Cheque
                                                    <ArrowRight className="w-3 h-3 ml-2" />
                                                </Button>
                                            )}
                                            {selectedRequest.chequeStatus === 'Approved' && (
                                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleDisburseCheque(selectedRequest._id || selectedRequest.id)}>
                                                    Mark Disbursed
                                                    <CheckCircle className="w-3 h-3 ml-2" />
                                                </Button>
                                            )}
                                            {selectedRequest.chequeStatus === 'Disbursed' && (
                                                <div className="text-sm font-medium text-emerald-600 flex items-center">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Disbursement Complete
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selectedRequest.status === 'PENDING' && (
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Approval Notes (Optional)</p>
                                        <Textarea
                                            placeholder="Add specific instructions for the cheque issuance..."
                                            value={approvalNotes}
                                            onChange={(e) => setApprovalNotes(e.target.value)}
                                            rows={2}
                                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                                    <Button variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => {
                                        setSelectedRequest(null);
                                        setApprovalNotes('');
                                    }}>
                                        Close
                                    </Button>
                                    {selectedRequest.status === 'PENDING' && (
                                        <>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                                                onClick={() => handleApprove(selectedRequest._id || selectedRequest.id)}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Approve Request
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => handleRejectClick(selectedRequest._id || selectedRequest.id)}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Reject Request
                                            </Button>
                                        </>
                                    )}
                                    {selectedRequest.status === 'APPROVED' && (
                                        <Button
                                            variant="outline"
                                            className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                            onClick={() => setRevokeModal({ isOpen: true, request: selectedRequest, remarks: '' })}
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Revoke Approval
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Mandatory Reject Remarks Modal */}
                {rejectionModal.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 transition-all animate-in fade-in">
                        <Card className="max-w-md w-full border-0 shadow-2xl dark:bg-slate-900 transform animate-in zoom-in-95 duration-200">
                            <CardHeader className="border-b dark:border-slate-800 pb-4">
                                <div className="flex items-center space-x-2 text-red-500">
                                    <XCircle className="w-6 h-6" />
                                    <CardTitle className="text-xl">Reject Request</CardTitle>
                                </div>
                                <CardDescription className="dark:text-gray-400 mt-2">
                                    Please provide a detailed reason for rejecting this fund request. This will be shared with the faculty.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rejection Remarks</label>
                                    <textarea
                                        className="w-full min-h-[120px] p-3 rounded-lg border border-gray-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Enter rejection remarks (e.g., incomplete justification, budget mismatch, policy issues)..."
                                        value={rejectionModal.remarks}
                                        onChange={(e) => setRejectionModal({ ...rejectionModal, remarks: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setRejectionModal({ ...rejectionModal, isOpen: false });
                                        }}
                                        autoFocus
                                    />
                                    <p className="text-[10px] text-gray-400 flex items-center italic">
                                        <CheckCircle className={`w-3 h-3 mr-1 ${rejectionModal.remarks.trim().length > 5 ? 'text-green-500' : 'text-gray-300'}`} />
                                        Justification is mandatory for audit purposes
                                    </p>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 dark:border-slate-800 dark:hover:bg-slate-800"
                                        onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className={`flex-1 transition-all duration-300 ${!rejectionModal.remarks.trim() ? 'opacity-50 cursor-not-allowed grayscale' : 'shadow-lg shadow-red-500/20'}`}
                                        disabled={!rejectionModal.remarks.trim()}
                                        onClick={handleConfirmReject}
                                    >
                                        Confirm Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Revoke Confirmation Modal */}
                {revokeModal.isOpen && revokeModal.request && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 transition-all animate-in fade-in">
                        <Card className="max-w-md w-full border-0 shadow-2xl dark:bg-slate-900 transform animate-in zoom-in-95 duration-200">
                            <CardHeader className="border-b dark:border-slate-800 pb-4">
                                <div className="flex items-center space-x-2 text-orange-600">
                                    <RefreshCw className="w-6 h-6" />
                                    <CardTitle className="text-xl">Revoke Approval</CardTitle>
                                </div>
                                <CardDescription className="dark:text-gray-400 mt-2">
                                    Are you sure you want to revoke approval for <strong>{revokeModal.request.projectTitle}</strong>?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    This will revert the status to <strong>PENDING</strong> and remove any cheque processing details.
                                </p>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Revocation</label>
                                    <Textarea
                                        className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Enter reason for revoking approval..."
                                        value={revokeModal.remarks}
                                        onChange={(e) => setRevokeModal({ ...revokeModal, remarks: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 flex items-center italic">
                                        <CheckCircle className={`w-3 h-3 mr-1 ${revokeModal.remarks.trim().length > 5 ? 'text-green-500' : 'text-gray-300'}`} />
                                        Reason is mandatory
                                    </p>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 dark:border-slate-800 dark:hover:bg-slate-800"
                                        onClick={() => setRevokeModal({ ...revokeModal, isOpen: false })}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className={`flex-1 bg-orange-600 hover:bg-orange-700 text-white ${!revokeModal.remarks.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={handleRevoke}
                                        disabled={!revokeModal.remarks.trim()}
                                    >
                                        Confirm Revoke
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* AI Result Modal */}
            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />
        </div>
    );
};

export default ApproveFundRequests;
