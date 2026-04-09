import React, { useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useDisbursalHistory } from '../../hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
    History, Search, Filter, Calendar, Users, 
    FileText, CheckCircle2, IndianRupee, Download,
    Building2, Hash, ArrowUpRight
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const DisbursalHistory = () => {
    const { setLayout } = useLayout();
    const [searchTerm, setSearchTerm] = useState('');
    const { data: history = [], isLoading } = useDisbursalHistory();

    React.useEffect(() => {
        setLayout("Disbursal History", "View and export records of finalized payments");
    }, [setLayout]);

    const filteredHistory = history.filter(req => {
        const search = searchTerm.toLowerCase();
        const title = req.Project?.title?.toLowerCase() || req.projectTitle?.toLowerCase() || '';
        const pi = req.Project?.pi?.toLowerCase() || req.faculty?.toLowerCase() || '';
        return title.includes(search) || pi.includes(search);
    });

    const totalDisbursed = filteredHistory.reduce((sum, req) => sum + (req.requestedAmount || req.amount || 0), 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Disbursements</p>
                                <p className="text-2xl font-bold mt-1">{filteredHistory.length}</p>
                            </div>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-maroon-50/50 dark:bg-maroon-900/10 border-maroon-100 dark:border-maroon-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-maroon-600 dark:text-maroon-400">Total Amount Settled</p>
                                <p className="text-2xl font-bold mt-1">₹{(totalDisbursed / 100000).toFixed(2)}L</p>
                            </div>
                            <div className="p-2 bg-maroon-100 dark:bg-maroon-900/30 rounded-lg">
                                <IndianRupee className="w-5 h-5 text-maroon-600 dark:text-maroon-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Settled this Month</p>
                                <p className="text-2xl font-bold mt-1">{filteredHistory.filter(h => new Date(h.updatedAt).getMonth() === new Date().getMonth()).length}</p>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search history by project or faculty..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-maroon-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter
                    </Button>
                    <Button className="bg-maroon-600 hover:bg-maroon-700 text-white flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* History Table */}
            <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg">Archived Disbursements</CardTitle>
                    <CardDescription>Comprehensive audit log of all financial transfers executed.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
                                <tr className="text-left">
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Transaction Details</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Beneficiary</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Source</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Amount</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Settled Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Fetching history...</td></tr>
                                ) : filteredHistory.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No disbursal records found matching your search.</td></tr>
                                ) : (
                                    filteredHistory.map((item) => (
                                        <tr key={item._id || item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-maroon-600 transition-colors">
                                                        {item.Project?.title || item.FundRequest?.projectTitle}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono mt-1 uppercase flex items-center gap-1">
                                                        <Hash className="w-3 h-3" /> {item.bankReference || 'INTERNAL_REIMBURSE'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                        <Users className="w-3.5 h-3.5 opacity-50" /> {item.Project?.pi || item.FundRequest?.faculty}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.Project?.department}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className={`border-0 text-[10px] font-black italic px-2 py-0.5 ${
                                                    item.FundRequest?.source === 'PFMS' ? 'bg-amber-100 text-amber-700' :
                                                    item.FundRequest?.source === 'DIRECTOR' ? 'bg-purple-100 text-purple-700' :
                                                    item.FundRequest?.source === 'OTHERS' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {item.FundRequest?.source || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-slate-900 dark:text-white">
                                                    ₹{(item.amount || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {new Date(item.disbursedAt).toLocaleDateString()}
                                                    </span>
                                                    <Badge className="mt-1 bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase">
                                                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Disbursed
                                                    </Badge>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DisbursalHistory;
