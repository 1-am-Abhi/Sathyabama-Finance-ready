import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useDisbursementQueue, useExecuteDisbursement } from '../../hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { IndianRupee, Search, Filter, ArrowRight, Building2, Hash, Users, Clock, Calendar, TrendingUp, CheckCircle, Undo2 } from 'lucide-react';
import useToast from '../../hooks/useToast';
import apiClient from '../../api/client';

const safeNumber = (value) => {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric : 0;
};

const HIGH_VALUE_THRESHOLD = 100000;
const formatCurrency = (value) => `₹${safeNumber(value).toLocaleString('en-IN')}`;
const formatCompactLakhs = (value) => `₹${(safeNumber(value) / 100000).toFixed(2)}L`;

const DisbursementQueue = () => {
    const { setLayout } = useLayout();
    const navigate = useNavigate();
    const { showToast, ToastPortal } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [formData, setFormData] = useState({
        amount: '',
        paymentMode: 'NEFT',
        transactionId: '',
        chequeNumber: '',
        bankName: '',
        disbursementDate: new Date().toISOString().split('T')[0],
        remarks: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    const { data: requests = [], isLoading, refetch } = useDisbursementQueue();
    const executeDisbursement = useExecuteDisbursement();

    // Utilization verification / return-for-correction (installment proof-gating)
    const [returnModal, setReturnModal] = useState({ open: false, requestId: null });
    const [returnRemarks, setReturnRemarks] = useState('');
    const [actionSubmitting, setActionSubmitting] = useState(false);

    const handleVerifyUtilization = async (req) => {
        const id = req.id || req._id;
        if (actionSubmitting) return;
        setActionSubmitting(true);
        try {
            await apiClient.post(`/fund-requests/${id}/verify-utilization`);
            showToast('Utilization verified successfully', 'success');
            if (refetch) refetch();
        } catch (error) {
            const data = error?.response?.data;
            if (error?.response?.status === 400 && data?.code === 'PROOFS_INCOMPLETE') {
                const missing = data.missing || data.missingItems || data.data?.missing;
                const detail = Array.isArray(missing) ? missing.join(', ') : missing;
                showToast(
                    `${data.message || 'Proofs are incomplete.'}${detail ? ` Missing: ${detail}` : ''}`,
                    'error'
                );
            } else {
                showToast(data?.message || error.message || 'Failed to verify utilization', 'error');
            }
        } finally {
            setActionSubmitting(false);
        }
    };

    const handleReturnSubmit = async () => {
        if (actionSubmitting) return;
        if (!returnRemarks.trim()) {
            showToast('Please enter remarks for the correction request', 'error');
            return;
        }
        setActionSubmitting(true);
        try {
            await apiClient.post(`/fund-requests/${returnModal.requestId}/return-for-correction`, { remarks: returnRemarks });
            showToast('Request returned for correction', 'success');
            setReturnModal({ open: false, requestId: null });
            setReturnRemarks('');
            if (refetch) refetch();
        } catch (error) {
            showToast(error?.response?.data?.message || error.message || 'Failed to return request', 'error');
        } finally {
            setActionSubmitting(false);
        }
    };

    React.useEffect(() => {
        setLayout("Disbursement Queue", "Execute payments for approved fund requests");
    }, [setLayout]);

    React.useEffect(() => {
        document.body.style.overflow = isModalOpen ? "hidden" : "unset";
        return () => { document.body.style.overflow = "unset"; };
    }, [isModalOpen]);

    const handleExecuteClick = (request) => {
        const pendingAmount = safeNumber(request.remainingAmount || request.requestedAmount);
        setSelectedRequest(request);
        setFormData({
            amount: String(pendingAmount),
            paymentMode: 'NEFT',
            transactionId: '',
            chequeNumber: '',
            bankName: '',
            disbursementDate: new Date().toISOString().split('T')[0],
            remarks: '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = safeNumber(formData.amount);
        const remainingAmount = safeNumber(selectedRequest?.remainingAmount || selectedRequest?.requestedAmount);
        
        if (amount <= 0 || amount > remainingAmount + 0.5) {
            showToast(`Installment amount must be between ₹1 and ${formatCurrency(remainingAmount)}`, 'error');
            return;
        }
        if (formData.paymentMode === 'CHEQUE' && !formData.chequeNumber.trim()) {
            showToast('Cheque number is required', 'error');
            return;
        }
        if (formData.paymentMode !== 'CHEQUE' && !formData.transactionId.trim()) {
            showToast('UTR / Transaction ID is required', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await executeDisbursement.mutateAsync({
                requestId: selectedRequest.id || selectedRequest._id,
                data: { ...formData, amount },
            });

            const totals = response?.totals || response?.data?.totals;
            const remainingMsg = totals ? ` (Remaining: ${formatCurrency(totals.remainingAmount)})` : '';
            
            showToast(`Installment of ${formatCurrency(amount)} executed successfully${remainingMsg}`, 'success');
            setIsModalOpen(false);
            
            window.dispatchEvent(new Event('fund-sources-updated'));
            localStorage.setItem('fundSourcesUpdatedAt', Date.now());
            navigate('/finance/dashboard');
        } catch (error) {
            const status = error.response?.status;
            showToast(error.response?.data?.message || error.message || 'Failed to execute disbursement', 'error');
            // 409 = already disbursed / not in a disbursable state. The row is
            // stale — close the modal and refresh so it drops out of the queue.
            if (status === 409) {
                setIsModalOpen(false);
                if (refetch) refetch();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const safeRequests = Array.isArray(requests) ? requests : [];
    const uniqueProjects = Array.from(new Map(
        safeRequests
            .map((r) => [r?.Project?._id || r?.Project?.id || r?.projectId, r?.Project])
            .filter(([key, project]) => Boolean(key && project))
    ).values());

    const filteredRequests = safeRequests.filter(req => {
        const search = searchTerm.toLowerCase();
        const title = req.Project?.title?.toLowerCase() || '';
        const pi = req.Project?.pi?.toLowerCase() || req.faculty?.toLowerCase() || '';
        const id = (req.id || req._id || '').toString().toLowerCase();
        return title.includes(search) || pi.includes(search) || id.includes(search);
    });

    const totalPendingAmount = safeRequests.reduce((sum, req) => sum + safeNumber(req.remainingAmount || req.requestedAmount), 0);
    const totalReleasedSoFar = uniqueProjects.reduce((sum, p) => sum + safeNumber(p?.releasedBudget), 0);
    const totalSanctionedBudget = uniqueProjects.reduce((sum, p) => sum + safeNumber(p?.sanctionedBudget), 0);
    const releaseCoverage = totalSanctionedBudget > 0
        ? Math.round((totalReleasedSoFar / totalSanctionedBudget) * 100) : 0;

    const selectedRequestedAmount = safeNumber(selectedRequest?.requestedAmount);
    const selectedReleasedAmount = safeNumber(selectedRequest?.releasedAmount);
    const selectedRemainingAmount = safeNumber(selectedRequest?.remainingAmount || selectedRequest?.requestedAmount);
    const selectedInstallmentNumber = Number(selectedRequest?.installmentNumber || 1);

    return (
        <div className="p-6 space-y-6">
            <ToastPortal />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Pending</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">{filteredRequests.length}</p>
                                <span className="text-green-500 text-xs font-semibold">▲ awaiting execution</span>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Released</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">{formatCompactLakhs(totalReleasedSoFar)}</p>
                                <span className="text-green-500 text-xs font-semibold">▲ {releaseCoverage}% of sanctioned</span>
                            </div>
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <IndianRupee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">Pending Amount</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">{formatCompactLakhs(totalPendingAmount)}</p>
                                <span className="text-green-500 text-xs font-semibold">▲ LIVE queue</span>
                            </div>
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by project title, PI or ID..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-maroon-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    variant={showFilters ? "default" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4" /> Filters
                </Button>
            </div>

            {showFilters && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-slate-500 italic font-medium">Advanced filters coming soon.</p>
                </div>
            )}

            {/* Queue Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Disbursement Queue</CardTitle>
                    <CardDescription>Approved fund requests awaiting bank transfer execution.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Project Details</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Source & Stage</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Submitted</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-6">
                                            <div className="space-y-3">
                                                {[0, 1, 2].map((row) => (
                                                    <div key={row} className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-6">
                                            <div className="text-center py-10 opacity-80">
                                                <div className="text-4xl mb-2">📊</div>
                                                <p className="text-lg font-medium">Queue is Empty</p>
                                                <p className="text-sm text-gray-400">No requests pending disbursement.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.id || req._id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <p className="font-medium text-slate-900 dark:text-white line-clamp-1 italic">
                                                        {req.Project?.title || req.projectTitle || '—'}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-bold">
                                                            <Users className="w-3 h-3" />
                                                            {req.Project?.pi || req.faculty || '—'}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-mono">
                                                            REQ #{String(req.id || req._id || '').slice(-8).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                                                            Installment #{req.installmentNumber || 1}
                                                        </span>
                                                        {safeNumber(req.requestedAmount) >= HIGH_VALUE_THRESHOLD && (
                                                            <span className="bg-red-500 px-2 py-0.5 text-xs rounded text-white font-bold">HIGH VALUE</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-2">
                                                    {req.source === 'PFMS' ? (
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 italic">PFMS FUNDED</span>
                                                    ) : req.source === 'OTHERS' ? (
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 italic">OTHER'S FUND</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 italic">INSTITUTIONAL</span>
                                                    )}
                                                    <div>
                                                        <Badge className="bg-green-100 text-green-700 text-[10px] font-black">{req.status}</Badge>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(req.remainingAmount || req.requestedAmount)}</p>
                                                {safeNumber(req.releasedAmount) > 0 && (
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                        {formatCurrency(req.releasedAmount)} released of {formatCurrency(req.requestedAmount)}
                                                    </span>
                                                )}
                                                {Array.isArray(req.documents) && req.documents.length > 0 && (
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                        {(() => {
                                                            const types = req.documents.map(d => String(d?.type || '').toUpperCase());
                                                            const bill = types.includes('BILL') || types.includes('INVOICE');
                                                            const uc = types.includes('UTILIZATION_CERTIFICATE');
                                                            return `Proofs: Bill ${bill ? 'YES' : 'NO'} / UC ${uc ? 'YES' : 'NO'}`;
                                                        })()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{new Date(req.updatedAt).toLocaleDateString()}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Approved by Admin</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                {(() => {
                                                    // Button visibility is driven ENTIRELY by backend state so a
                                                    // stale/duplicate action can never be offered.
                                                    const released = safeNumber(req.releasedAmount);
                                                    const requested = safeNumber(req.requestedAmount);
                                                    const isFullyDisbursed =
                                                        ['COMPLETED', 'DISBURSED'].includes(req.status) ||
                                                        (requested > 0 && released >= requested);
                                                    const isVerified = ['UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED'].includes(req.currentStage);
                                                    const canExecute =
                                                        !isFullyDisbursed &&
                                                        ['APPROVED', 'PARTIALLY_DISBURSED'].includes(req.status);
                                                    // Awaiting verification = money is out but utilization not yet verified.
                                                    const awaitingVerification = isFullyDisbursed && !isVerified;

                                                    return (
                                                        <div className="flex flex-col gap-2">
                                                            {canExecute && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleExecuteClick(req)}
                                                                    className="bg-gradient-to-r from-pink-500 to-red-500 hover:scale-105 transition text-white rounded-full px-4 h-9 flex items-center gap-2"
                                                                >
                                                                    {req.status === 'PARTIALLY_DISBURSED' ? 'Disburse Balance' : 'Execute'} <ArrowRight className="w-4 h-4" />
                                                                </Button>
                                                            )}

                                                            {isFullyDisbursed && (
                                                                <span className="inline-flex items-center gap-1.5 w-fit bg-green-100 text-green-700 rounded-full px-3 h-8 text-xs font-black">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Disbursed
                                                                </span>
                                                            )}

                                                            {isVerified && (
                                                                <span className="inline-flex items-center gap-1.5 w-fit bg-emerald-600 text-white rounded-full px-3 h-8 text-xs font-black">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Utilization Verified
                                                                </span>
                                                            )}

                                                            {awaitingVerification && (
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={actionSubmitting}
                                                                        onClick={() => handleVerifyUtilization(req)}
                                                                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full px-3 h-8 text-xs flex items-center gap-1"
                                                                    >
                                                                        <CheckCircle className="w-3.5 h-3.5" /> Verify Utilization
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={actionSubmitting}
                                                                        onClick={() => { setReturnRemarks(''); setReturnModal({ open: true, requestId: req.id || req._id }); }}
                                                                        className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full px-3 h-8 text-xs flex items-center gap-1"
                                                                    >
                                                                        <Undo2 className="w-3.5 h-3.5" /> Return
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Execution Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg flex flex-col rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto scrollbar-hide">
                        <div className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-950 to-maroon-800 text-white p-6 rounded-t-xl">
                            <div className="space-y-1">
                                <Badge className="bg-white/10 text-white border-0 w-fit">
                                    Installment #{selectedInstallmentNumber}
                                </Badge>
                                <h3 className="text-xl font-bold text-white">Execute Disbursement</h3>
                                <p className="text-sm text-slate-200">Enter the bank reference number to finalize payment.</p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col">
                            <div className="p-6 space-y-4">
                                {/* Request Amount Display */}
                                <div className="p-4 bg-maroon-50 dark:bg-maroon-900/20 rounded-lg border border-maroon-100 dark:border-maroon-800">
                                    <p className="text-xs text-maroon-600 dark:text-maroon-400 font-bold uppercase tracking-wider mb-1">Request Balance</p>
                                    <p className="text-2xl font-black text-maroon-700 dark:text-maroon-300">{formatCurrency(selectedRemainingAmount)}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Released {formatCurrency(selectedReleasedAmount)} of {formatCurrency(selectedRequestedAmount)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {selectedRequest?.Project?.pi || selectedRequest?.faculty} — {selectedRequest?.Project?.title || selectedRequest?.projectTitle}
                                    </p>
                                </div>

                                {/* Installment Amount */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                        <IndianRupee className="w-3 h-3" /> Installment Amount <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedRemainingAmount + 0.5}
                                        step="0.01"
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all font-mono"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>

                                {/* Payment Mode */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500">Payment Mode</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all"
                                        value={formData.paymentMode}
                                        onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                    >
                                        <option value="NEFT">NEFT</option>
                                        <option value="RTGS">RTGS</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                    </select>
                                </div>

                                {/* UTR / Cheque */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                        <Hash className="w-3 h-3" /> {formData.paymentMode === 'CHEQUE' ? 'Cheque Number' : 'Transaction ID / UTR'} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all font-mono"
                                        placeholder={formData.paymentMode === 'CHEQUE' ? 'Enter cheque number' : 'Enter Bank Ref / UTR Number'}
                                        value={formData.paymentMode === 'CHEQUE' ? formData.chequeNumber : formData.transactionId}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            [formData.paymentMode === 'CHEQUE' ? 'chequeNumber' : 'transactionId']: e.target.value
                                        })}
                                    />
                                </div>

                                {/* Bank Name */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                        <Building2 className="w-3 h-3" /> Bank Name
                                    </label>
                                    <input
                                        type="text"
                                        required={formData.paymentMode === 'CHEQUE'}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all"
                                        placeholder="e.g. Indian Bank, HDFC"
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    />
                                </div>

                                {/* Disbursement Date */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> Disbursement Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all"
                                        value={formData.disbursementDate}
                                        onChange={(e) => setFormData({ ...formData, disbursementDate: e.target.value })}
                                    />
                                </div>

                                {/* Remarks */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500">Remarks</label>
                                    <textarea
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all resize-none"
                                        rows="2"
                                        placeholder="Optional remarks..."
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 rounded-xl"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:scale-105 transition text-white rounded-xl font-bold shadow-lg shadow-maroon-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Processing...' : 'Finalize Payment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Return for Correction Modal */}
            {returnModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Return for Correction</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Provide remarks explaining what the faculty must correct in their utilization proofs.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500">Remarks <span className="text-red-500">*</span></label>
                            <textarea
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all resize-none"
                                rows="3"
                                placeholder="e.g. Utilization certificate is missing the sanction reference number."
                                value={returnRemarks}
                                onChange={(e) => setReturnRemarks(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={() => setReturnModal({ open: false, requestId: null })}
                                disabled={actionSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleReturnSubmit}
                                disabled={actionSubmitting}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold disabled:opacity-50"
                            >
                                {actionSubmitting ? 'Submitting...' : 'Return Request'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisbursementQueue;
