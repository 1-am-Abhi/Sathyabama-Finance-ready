import React, { useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useDisbursementQueue, useExecuteDisbursement } from '../../hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Settings, CheckCircle, BarChart3, Clock, Calendar, TrendingUp, ChevronDown, ChevronRight, Briefcase, GraduationCap, X, Sparkles, ShieldCheck, IndianRupee, Search, Filter, ArrowRight, Building2, Hash, Users, FileText } from 'lucide-react';
import useToast from '../../hooks/useToast';

const DisbursementQueue = () => {
    const { setLayout } = useLayout();
    const { showToast, ToastPortal } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [formData, setFormData] = useState({
        transactionId: '',
        bankName: '',
        disbursementDate: new Date().toISOString().split('T')[0],
        remarks: ''
    });

    const [showFilters, setShowFilters] = useState(false);

    const { data: requests = [], isLoading } = useDisbursementQueue();
    const executeDisbursement = useExecuteDisbursement();

    React.useEffect(() => {
        setLayout("Disbursement Queue", "Manage and execute payments for approved fund requests");
    }, [setLayout]);

    const handleExecuteClick = (request) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await executeDisbursement.mutateAsync({
                requestId: selectedRequest.id,
                data: formData
            });
            showToast('Disbursement executed successfully!');
            setIsModalOpen(false);
            setFormData({
                transactionId: '',
                bankName: '',
                disbursementDate: new Date().toISOString().split('T')[0],
                remarks: ''
            });
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to execute disbursement', 'error');
        }
    };

    const filteredRequests = requests.filter(req => {
        const search = searchTerm.toLowerCase();
        const title = req.Project?.title?.toLowerCase() || '';
        const pi = req.Project?.piName?.toLowerCase() || '';
        const id = req.id?.toString() || '';
        return title.includes(search) || pi.includes(search) || id.includes(search);
    });

    const totalPendingAmount = requests.reduce((sum, req) => sum + (req.amount || 0), 0);

    return (
        <div className="p-6 space-y-6">
            <ToastPortal />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Pending Requests</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">{filteredRequests.length}</p>
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
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Total Pending Amount</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">₹{(filteredRequests.reduce((s, r) => s + (r.amount || 0), 0) / 100000).toFixed(2)}L</p>
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
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">Avg. Processing Time</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">1.2 Days</p>
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
                                    <tr><td colSpan="4" className="text-center py-8 text-slate-500">Loading queue...</td></tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-slate-500">No pending disbursements found.</td></tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                                                            REQ #{String(req.id).slice(-8).toUpperCase()}
                                                        </span>
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
                                                <p className="font-bold text-slate-900 dark:text-white">₹{req.amount?.toLocaleString()}</p>
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
                                                <Button size="sm" onClick={() => handleExecuteClick(req)} className="bg-maroon-600 hover:bg-maroon-700 text-white rounded-full px-4 h-9 flex items-center gap-2">
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
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <CardTitle>Execute Disbursement</CardTitle>
                            <CardDescription>Enter transaction details to finalize the payment.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="p-6 space-y-4">
                                <div className="p-3 bg-maroon-50 dark:bg-maroon-900/20 rounded-lg border border-maroon-100 dark:border-maroon-800 space-y-1">
                                    <p className="text-xs text-maroon-600 dark:text-maroon-400 font-bold uppercase tracking-wider">Payable To</p>
                                    <p className="text-sm font-semibold">{selectedRequest?.Project?.pi || selectedRequest?.Project?.piName || selectedRequest?.faculty}</p>
                                    <p className="text-xs text-slate-500 font-mono tracking-tighter line-clamp-1">{selectedRequest?.Project?.title || selectedRequest?.projectTitle}</p>
                                    <div className="pt-2 flex justify-between items-baseline border-t border-maroon-100 dark:border-maroon-800 mt-2">
                                        <span className="text-xs text-slate-500 font-medium">Net Amount</span>
                                        <span className="text-lg font-black text-maroon-700 dark:text-maroon-400">₹{(selectedRequest?.requestedAmount || selectedRequest?.amount || 0)?.toLocaleString()}</span>
                                    </div>
                                </div>

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
                                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 bg-maroon-600 hover:bg-maroon-700 text-white rounded-xl font-bold shadow-lg shadow-maroon-500/20">
                                    Finalize Payment
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
