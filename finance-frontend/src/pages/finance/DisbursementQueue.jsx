import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useDisbursementQueue, useExecuteDisbursement } from '../../hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { IndianRupee, Search, Filter, ArrowRight, Building2, Hash, Users, FileText, Clock, Calendar, Sparkles, TrendingUp } from 'lucide-react';
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
        transactionId: '',
        bankName: '',
        disbursementDate: new Date().toISOString().split('T')[0],
        remarks: '',
        mode: 'FULL',
        amount: ''
    });

    const [showFilters, setShowFilters] = useState(false);

    const { data: requests = [], isLoading } = useDisbursementQueue();
    const executeDisbursement = useExecuteDisbursement();

    React.useEffect(() => {
        setLayout("Disbursement Queue", "Manage and execute payments for approved fund requests");
    }, [setLayout]);

    const handleExecuteClick = (request) => {
        setSelectedRequest(request);
        setFormData({
            transactionId: '',
            bankName: '',
            disbursementDate: new Date().toISOString().split('T')[0],
            remarks: '',
            mode: Number(request?.installmentNumber || 1) > 1 ? 'INSTALLMENT' : 'FULL',
            amount: safeNumber(request?.requestedAmount || request?.amount),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const submittedAmount = safeNumber(formData.amount);
            await executeDisbursement.mutateAsync({
                requestId: selectedRequest.id || selectedRequest._id,
                data: {
                    ...formData,
                    installmentNo: selectedRequest?.installmentNumber || 1,
                    isInstallment: formData.mode === 'INSTALLMENT',
                }
            });
            showToast(`Disbursement Successful for ${formatCurrency(submittedAmount)}`);
            setIsModalOpen(false);
            setFormData({
                transactionId: '',
                bankName: '',
                disbursementDate: new Date().toISOString().split('T')[0],
                remarks: '',
                mode: 'FULL',
                amount: ''
            });

            // Sync with other tabs/components
            window.dispatchEvent(new Event('fund-sources-updated'));
            localStorage.setItem('fundSourcesUpdatedAt', Date.now());

            // Redirect after successful execution
            navigate('/finance/dashboard');
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to execute disbursement', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const safeRequests = Array.isArray(requests) ? requests : [];
    const uniqueProjects = Array.from(new Map(
        safeRequests
            .map((request) => [
                request?.Project?._id || request?.Project?.id || request?.projectId,
                request?.Project,
            ])
            .filter(([key, project]) => Boolean(key && project))
    ).values());
    
    const filteredRequests = safeRequests.filter(req => {
        const search = searchTerm.toLowerCase();
        const title = req.Project?.title?.toLowerCase() || '';
        const pi = req.Project?.pi?.toLowerCase() || req.Project?.piName?.toLowerCase() || req.faculty?.toLowerCase() || '';
        const id = (req.id || req._id || '').toString().toLowerCase();
        return title.includes(search) || pi.includes(search) || id.includes(search);
    });

    const totalPendingAmount = safeRequests.reduce((sum, req) => sum + safeNumber(req.requestedAmount || req.amount), 0);
    const totalReleasedSoFar = uniqueProjects.reduce((sum, project) => sum + safeNumber(project?.releasedBudget), 0);
    const totalSanctionedBudget = uniqueProjects.reduce((sum, project) => sum + safeNumber(project?.sanctionedBudget), 0);
    const releaseCoverage = totalSanctionedBudget > 0
        ? Math.round((totalReleasedSoFar / totalSanctionedBudget) * 100)
        : 0;
    const queueMomentum = filteredRequests.length > 0
        ? Math.max(12, Math.round((filteredRequests.length / Math.max(safeRequests.length, 1)) * 100))
        : 12;
    const selectedInstallmentNumber = Number(selectedRequest?.installmentNumber || 1);
    const selectedRequestedAmount = safeNumber(selectedRequest?.requestedAmount || selectedRequest?.amount);
    const selectedReleasedAmount = safeNumber(selectedRequest?.Project?.releasedBudget);
    const selectedSanctionedAmount = safeNumber(selectedRequest?.Project?.sanctionedBudget);
    const selectedRemainingAmount = selectedSanctionedAmount > 0
        ? Math.max(0, selectedSanctionedAmount - selectedReleasedAmount)
        : selectedRequestedAmount;
    const maxDisbursementAmount = selectedSanctionedAmount > 0
        ? selectedRemainingAmount
        : selectedRequestedAmount;

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
                                <span className="text-green-500 dark:text-green-400 text-xs font-semibold">▲ +{queueMomentum}%</span>
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
                                <span className="text-green-500 dark:text-green-400 text-xs font-semibold">▲ {releaseCoverage}% covered</span>
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
                                <span className="text-green-500 dark:text-green-400 text-xs font-semibold">▲ LIVE queue</span>
                            </div>
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
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
                    <p className="text-xs text-slate-500 italic font-medium">Advanced filters coming soon: Filter by Department, Fund Source, or Date Range.</p>
                </div>
            )}

            {/* Queue Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Pending Disbursement Queue</CardTitle>
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
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Approved On</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-6">
                                            <div className="space-y-3">
                                                {[0, 1, 2].map((row) => (
                                                    <div key={row} className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-6">
                                            <div className="text-center py-10 opacity-80">
                                                <div className="text-4xl mb-2">📊</div>
                                                <p className="text-lg font-medium">No Data Yet</p>
                                                <p className="text-sm text-gray-400">
                                                    Select a research center or create a project to view funding insights
                                                </p>
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
                                                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                                                            REQ #{String(req.id || req._id || '').slice(-8).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                                                            Installment #{req.installmentNumber || 1}
                                                        </span>
                                                        {safeNumber(req.requestedAmount || req.amount) >= HIGH_VALUE_THRESHOLD && (
                                                            <span className="bg-red-500 px-2 py-1 text-xs rounded text-white">
                                                                HIGH VALUE
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {req.currentStage === 'FUND_APPROVED' ? (
                                                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-black italic">INITIAL ADVANCE</Badge>
                                                        ) : (
                                                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-black italic">REIMBURSEMENT</Badge>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {req.source === 'PFMS' ? (
                                                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 italic">PFMS FUNDED</span>
                                                        ) : req.source === 'OTHERS' ? (
                                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 italic">OTHER'S FUND</span>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 italic">INSTITUTIONAL</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-900 dark:text-white">₹{safeNumber(req.requestedAmount || req.amount).toLocaleString('en-IN')}</p>
                                                {req.documents && req.documents.length > 0 && (
                                                    <div className="mt-1">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{req.documents.length} Bills attached</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{new Date(req.updatedAt).toLocaleDateString()}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Approved by Dean/Admin</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-950 to-maroon-800 text-white">
                            <div className="space-y-2">
                                <Badge className="bg-white/10 text-white border-0 w-fit">
                                    Installment #{selectedInstallmentNumber}
                                </Badge>
                                <CardTitle className="text-white">Execute Disbursement</CardTitle>
                                <CardDescription className="text-slate-200">Enter transaction details to finalize the payment.</CardDescription>
                            </div>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="p-6 space-y-4">
                                <div className="p-3 bg-maroon-50 dark:bg-maroon-900/20 rounded-lg border border-maroon-100 dark:border-maroon-800 space-y-1">
                                    <p className="text-xs text-maroon-600 dark:text-maroon-400 font-bold uppercase tracking-wider">Payable To</p>
                                    <p className="text-sm font-semibold">{selectedRequest?.Project?.pi || selectedRequest?.Project?.piName || selectedRequest?.faculty}</p>
                                    <p className="text-xs text-slate-500 font-mono tracking-tighter line-clamp-1">{selectedRequest?.Project?.title || selectedRequest?.projectTitle}</p>
                                    <div className="pt-2 flex justify-between items-baseline border-t border-maroon-100 dark:border-maroon-800 mt-2">
                                        <span className="text-xs text-slate-500 font-medium">Requested</span>
                                        <span className="text-lg font-black text-maroon-700 dark:text-maroon-400">{formatCurrency(selectedRequestedAmount)}</span>
                                    </div>
                                    <div className="mt-1 flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                                        <span>Released: {formatCompactLakhs(selectedReleasedAmount)}</span>
                                        <span className="text-maroon-600">Max: {formatCompactLakhs(selectedSanctionedAmount)}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-3 rounded-lg mb-3 text-white">
                                    <p>Remaining Balance: {formatCurrency(selectedRemainingAmount)}</p>
                                    <p>Released So Far: {formatCurrency(selectedReleasedAmount)}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500">Payment Mode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${formData.mode === 'FULL' ? 'border-maroon-600 bg-maroon-50 text-maroon-700 dark:bg-maroon-900/20' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300'}`}
                                            onClick={() => setFormData({ ...formData, mode: 'FULL', amount: safeNumber(selectedRequest?.requestedAmount || selectedRequest?.amount) })}
                                        >
                                            Full
                                        </button>
                                        <button
                                            type="button"
                                            className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${formData.mode === 'INSTALLMENT' ? 'border-maroon-600 bg-maroon-50 text-maroon-700 dark:bg-maroon-900/20' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300'}`}
                                            onClick={() => setFormData({ ...formData, mode: 'INSTALLMENT' })}
                                        >
                                            Installment
                                        </button>
                                    </div>
                                </div>

                                {formData.mode === 'INSTALLMENT' && (
                                    <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                                        <label className="text-xs font-black uppercase text-slate-500 flex items-center justify-between">
                                            <span>Installment Amount (₹)</span>
                                            <span className="text-[10px] text-maroon-500">Partial Payment</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full p-3 bg-maroon-50/50 dark:bg-maroon-900/10 border border-maroon-200 dark:border-maroon-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all font-bold text-maroon-700 dark:text-maroon-300"
                                            placeholder="Enter payout amount"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        />
                                    </div>
                                )}

                                <div className="space-y-4 overflow-y-auto max-h-[40vh] pr-1">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                            <Hash className="w-3 h-3" /> Transaction ID / UTR
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all font-mono"
                                            placeholder="Enter Bank Ref / UTR Number"
                                            value={formData.transactionId}
                                            onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                            <Building2 className="w-3 h-3" /> Bank Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all"
                                            placeholder="e.g. Indian Bank, HDFC"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> Disbursement Date
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all"
                                            value={formData.disbursementDate}
                                            onChange={(e) => setFormData({...formData, disbursementDate: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-500">Remarks</label>
                                        <textarea
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-maroon-500 outline-none transition-all resize-none"
                                            rows="2"
                                            placeholder="Optional remarks..."
                                            value={formData.remarks}
                                            onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </CardContent>
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
                                    disabled={isSubmitting || safeNumber(formData.amount) <= 0 || safeNumber(formData.amount) > maxDisbursementAmount}
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:scale-105 transition text-white rounded-xl font-bold shadow-lg shadow-maroon-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Processing...' : 'Finalize Payment'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default DisbursementQueue;
