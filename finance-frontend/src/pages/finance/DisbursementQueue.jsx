import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useDisbursementQueue, useExecuteDisbursement } from '../../hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { IndianRupee, Search, Filter, ArrowRight, Building2, Hash, Users, Clock, Calendar, TrendingUp } from 'lucide-react';
import useToast from '../../hooks/useToast';

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

    const { data: requests = [], isLoading } = useDisbursementQueue();
    const executeDisbursement = useExecuteDisbursement();

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
        
        if (amount <= 0 || amount > remainingAmount + 0.5) { // EPS tolerance on frontend too
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

            // Render canonical totals from backend
            const totals = response?.totals || response?.data?.totals;
            const remainingMsg = totals ? ` (Remaining: ${formatCurrency(totals.remainingAmount)})` : '';
            
            showToast(`Installment of ${formatCurrency(amount)} executed successfully${remainingMsg}`, 'success');
            setIsModalOpen(false);
            
            window.dispatchEvent(new Event('fund-sources-updated'));
            localStorage.setItem('fundSourcesUpdatedAt', Date.now());
            navigate('/finance/dashboard');
        } catch (error) {
            showToast(error.response?.data?.message || error.message || 'Failed to execute disbursement', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const safeRequests = Array.isArray(requests) ? requests : [];
    const filteredRequests = safeRequests.filter(req => {
        const search = searchTerm.toLowerCase();
        const title = req.Project?.title?.toLowerCase() || '';
        const pi = req.Project?.pi?.toLowerCase() || req.faculty?.toLowerCase() || '';
        const id = (req.id || req._id || '').toString().toLowerCase();
        return title.includes(search) || pi.includes(search) || id.includes(search);
    });

    const totalPendingAmount = safeRequests.reduce((sum, req) => sum + safeNumber(req.remainingAmount || req.requestedAmount), 0);

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
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Project Focus</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">{safeRequests.length > 0 ? 'Active Queue' : 'Idle'}</p>
                                <span className="text-green-500 text-xs font-semibold">▲ Institutional Pipeline</span>
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
                                        <td colSpan="5" className="px-4 py-6 text-center">Loading queue...</td>
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
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-2">
                                                    <Badge className="bg-blue-50 text-blue-700 text-[10px] font-black">{req.source || 'INSTITUTIONAL'}</Badge>
                                                    <div>
                                                        <Badge className="bg-green-100 text-green-700 text-[10px] font-black">{req.status}</Badge>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(req.remainingAmount || req.requestedAmount)}</p>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                    Request Total: {formatCurrency(req.requestedAmount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleExecuteClick(req)}
                                                    className="bg-gradient-to-r from-pink-500 to-red-500 hover:scale-105 transition text-white rounded-full px-4 h-9 flex items-center gap-2"
                                                >
                                                    Execute <ArrowRight className="w-4 h-4" />
                                                </Button>
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
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg flex flex-col rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="bg-gradient-to-r from-slate-950 to-maroon-800 text-white p-6 rounded-t-xl">
                            <Badge className="bg-white/10 text-white border-0 mb-2">
                                Installment #{selectedInstallmentNumber}
                            </Badge>
                            <h3 className="text-xl font-bold">Execute Disbursement</h3>
                            <p className="text-sm text-slate-200">Institutional financial transfer protocol.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="p-4 bg-maroon-50 dark:bg-maroon-900/20 rounded-lg border border-maroon-100 dark:border-maroon-800">
                                <p className="text-xs text-maroon-600 dark:text-maroon-400 font-bold uppercase tracking-wider mb-1">Request Balance</p>
                                <p className="text-2xl font-black text-maroon-700 dark:text-maroon-300">{formatCurrency(selectedRemainingAmount)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Installment Amount</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedRemainingAmount + 0.5}
                                        step="0.01"
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-sm"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Payment Mode</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                        value={formData.paymentMode}
                                        onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                    >
                                        <option value="NEFT">NEFT</option>
                                        <option value="RTGS">RTGS</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500">{formData.paymentMode === 'CHEQUE' ? 'Cheque Number' : 'Transaction ID / UTR'}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-sm"
                                    placeholder="Enter reference number"
                                    value={formData.paymentMode === 'CHEQUE' ? formData.chequeNumber : formData.transactionId}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        [formData.paymentMode === 'CHEQUE' ? 'chequeNumber' : 'transactionId']: e.target.value
                                    })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500">Bank Name</label>
                                <input
                                    type="text"
                                    required={formData.paymentMode === 'CHEQUE'}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                    placeholder="e.g. Indian Bank"
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
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
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-bold shadow-lg shadow-maroon-500/20"
                                >
                                    {isSubmitting ? 'Processing...' : 'Finalize Payment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisbursementQueue;
