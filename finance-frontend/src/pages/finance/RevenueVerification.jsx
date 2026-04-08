import React, { useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useRevenueVerificationQueue, useVerifyRevenue } from '../../hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ShieldCheck, Clock, TrendingUp, Search, Filter, CheckCircle2, User, Landmark, History, Hash, IndianRupee } from 'lucide-react';
import useToast from '../../hooks/useToast';

const RevenueVerification = () => {
    const { setLayout } = useLayout();
    const { showToast, ToastPortal } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRevenue, setSelectedRevenue] = useState(null);
    const [formData, setFormData] = useState({
        verifiedAmount: '',
        bankReference: '',
        remarks: ''
    });

    const [showFilters, setShowFilters] = useState(false);

    const { data: records = [], isLoading } = useRevenueVerificationQueue();
    const verifyRevenue = useVerifyRevenue();

    React.useEffect(() => {
        setLayout("Revenue Verification", "Verify and finalize consultancy income submitted by faculty");
    }, [setLayout]);

    const handleVerifyClick = (record) => {
        setSelectedRevenue(record);
        setFormData({
            verifiedAmount: record.amountGenerated.toString(),
            bankReference: '',
            remarks: ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await verifyRevenue.mutateAsync({
                revenueId: selectedRevenue.id,
                data: formData
            });
            showToast('Revenue verified and recorded!');
            setIsModalOpen(false);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to verify revenue', 'error');
        }
    };

    const filteredRecords = records.filter(rec => {
        const search = searchTerm.toLowerCase();
        const userName = rec.User?.name?.toLowerCase() || '';
        const source = rec.revenueSource?.toLowerCase() || '';
        return userName.includes(search) || source.includes(search);
    });

    const pendingTotal = records.reduce((sum, rec) => sum + (rec.amountGenerated || 0), 0);

    return (
        <div className="p-6 space-y-6">
            <ToastPortal />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Inflows</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">₹{(pendingTotal / 100000).toFixed(2)}L</p>
                            </div>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Verification</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">{filteredRecords.length}</p>
                            </div>
                            <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
                                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Verification Rate</p>
                                <p className="text-2xl font-bold mt-1 tracking-tight">94%</p>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by faculty or source..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button 
                    variant={showFilters ? "default" : "outline"} 
                    className="flex items-center gap-2"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4" /> Filter
                </Button>
            </div>

            {showFilters && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-dashed border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 italic font-medium">Advanced filters coming soon: Filter by Faculty Department, Revenue Year, or Status.</p>
                </div>
            )}

            {/* Verification Queue */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Inflow Verification Queue</CardTitle>
                    <CardDescription>Matching faculty consultancy records with bank statements.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Revenue Source</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Faculty</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="5" className="text-center py-8">Loading verification queue...</td></tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8">No records awaiting verification.</td></tr>
                                ) : (
                                    filteredRecords.map((record) => (
                                        <tr key={record.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-900 dark:text-white capitalize">{record.revenueSource}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{record.details}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                                        <User className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{record.User?.name}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-500 ml-8 font-black uppercase">{record.User?.department}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-black text-rose-600 dark:text-rose-400">₹{record.amountGenerated?.toLocaleString()}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold italic">{record.year}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge variant={record.status === 'VERIFIED' ? 'success' : 'outline'} className="rounded-full text-[10px] font-black tracking-widest px-2 py-0.5 animate-pulse-slow">
                                                    {record.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {record.status === 'VERIFIED' ? (
                                                    <Button variant="ghost" size="sm" className="text-emerald-600 gap-2 cursor-default opacity-80" disabled>
                                                        <CheckCircle2 className="w-4 h-4" /> Verified
                                                    </Button>
                                                ) : (
                                                    <Button onClick={() => handleVerifyClick(record)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black text-[10px] uppercase shadow-lg shadow-emerald-500/10">
                                                        Verify Inflow
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Verification Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
                    <Card className="w-full max-w-md shadow-2xl border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
                        <div className="h-1 bg-emerald-500" />
                        <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30">
                            <CardTitle className="text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" /> Confirm Financial Inflow
                            </CardTitle>
                            <CardDescription>Finalize the consultancy revenue verification process.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="p-6 space-y-6 bg-white dark:bg-slate-900">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><User className="w-3 h-3" /> Submitted By</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{selectedRevenue?.User?.name}</p>
                                    </div>
                                    <div className="p-3 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1 italic"><History className="w-3 h-3" /> Claimed Amount</p>
                                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1 uppercase">₹{selectedRevenue?.amountGenerated?.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Actual Amount Received (₹)</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                required
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 dark:text-white"
                                                value={formData.verifiedAmount}
                                                onChange={(e) => setFormData({...formData, verifiedAmount: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Bank Reference / UTR</label>
                                        <div className="relative">
                                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-sm"
                                                placeholder="REF_CONS_2024_001"
                                                value={formData.bankReference}
                                                onChange={(e) => setFormData({...formData, bankReference: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Finance Remarks</label>
                                        <div className="relative">
                                            <textarea
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm min-h-[80px] resize-none"
                                                placeholder="Verification comments..."
                                                value={formData.remarks}
                                                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 border-t border-emerald-100 dark:border-emerald-900/30 flex gap-4">
                                <Button type="button" variant="ghost" className="flex-1 rounded-xl text-slate-500 hover:text-slate-900 font-bold" onClick={() => setIsModalOpen(false)}>
                                    Discard
                                </Button>
                                <Button type="submit" className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase shadow-xl shadow-emerald-500/20">
                                    Confirm & Record Inflow
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default RevenueVerification;
