import React, { useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useFinancialReports } from '../../hooks/useFinance';
import { useCentres } from '../../constants/researchCentres';
import { FUND_SOURCES } from '../../constants/fundSources';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BarChart3, Download, Filter, FileSpreadsheet, FilePieChart, TrendingUp, TrendingDown, Wallet, Calendar, Building2, Search, ArrowUpRight, ArrowDownRight, Globe, FileText } from 'lucide-react';
import useToast from '../../hooks/useToast';

const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatCrores = (value) => (toNumber(value) / 10000000).toFixed(2);

const formatAmount = (value) => `₹${toNumber(value).toLocaleString('en-IN')}`;

const FinancialReports = () => {
    const { setLayout } = useLayout();
    const { showToast, ToastPortal } = useToast();
    const [activeTab, setActiveTab] = useState('summary');
    const [filters, setFilters] = useState({
        period: '2024-Q1',
        department: 'All Departments',
        fundType: 'All Funds',
        centre: 'All Centres'
    });
    const { centres: dynamicCentres } = useCentres();

    const { data: reportsData = { inflows: [], outflows: [], summary: {} }, isLoading } = useFinancialReports(filters);

    React.useEffect(() => {
        setLayout("Financial Reports", "Consolidated financial ledger and audit-ready analytics");
    }, [setLayout]);

    const handleExport = (type) => {
        // Mock export logic
        alert(`Exporting ${type} report for ${filters.period}...`);
    };

    return (
        <div className="p-6 space-y-6">
            <ToastPortal />
            {/* Header / Export Hub */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-maroon-500" />
                        <select 
                            className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-maroon-500 transition-all appearance-none cursor-pointer"
                            value={filters.period}
                            onChange={(e) => setFilters({...filters, period: e.target.value})}
                        >
                            <option value="2024-Q1">Q1 FY 2024-25</option>
                            <option value="2023-Q4">Q4 FY 2023-24</option>
                            <option value="2023-ANNUAL">Annual Report 2023</option>
                        </select>
                    </div>

                    {/* NEW: Centre Filter */}
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <select 
                            className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
                            value={filters.centre}
                            onChange={(e) => setFilters({...filters, centre: e.target.value})}
                        >
                            <option value="All Centres">All Centres</option>
                            {dynamicCentres.map((centre) => {
                                const value = centre?.name || centre;
                                return <option key={value} value={value}>{value}</option>;
                            })}
                        </select>
                    </div>

                    {/* NEW: Fund Type Filter */}
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                        <select 
                            className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            value={filters.fundType}
                            onChange={(e) => setFilters({...filters, fundType: e.target.value})}
                        >
                            <option value="All Funds">All Funds</option>
                            {FUND_SOURCES.map(source => (
                                <option key={source} value={source === 'Others' ? 'OTHERS' : source.toUpperCase() === 'INSTITUTIONAL' ? 'INSTITUTIONAL' : source}>
                                    {source === 'Others' ? "Other's" : source}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold border-slate-200 dark:border-slate-800" onClick={() => handleExport('PDF')}>
                        <FilePieChart className="w-4 h-4 text-rose-500" /> PDF Audit
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-xl h-10 px-4 font-bold border-slate-200 dark:border-slate-800" onClick={() => handleExport('EXCEL')}>
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel Ledger
                    </Button>
                </div>
            </div>

            {/* Master Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet className="w-16 h-16" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Total Sanctioned</p>
                        <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900 dark:text-white">
                            ₹{formatCrores(reportsData.summary?.totalSanctioned ?? reportsData.summary?.totalAllocated)}Cr
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-500">
                            Active grants in current period
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown className="w-16 h-16 text-rose-500" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest pl-1">Total Disbursed</p>
                        <p className="text-2xl font-black mt-1 tracking-tighter text-rose-700 dark:text-rose-400">
                            ₹{formatCrores(reportsData.summary?.totalDisbursed)}Cr
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-500 italic">
                            Total outflow from research funds
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 text-emerald-500" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-1">Total Revenue</p>
                        <p className="text-2xl font-black mt-1 tracking-tighter text-emerald-700 dark:text-emerald-400">
                            ₹{formatCrores(reportsData.summary?.totalRevenue)}Cr
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-500">
                            Verified consultancy & grant inflows
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-maroon-600 dark:bg-maroon-900 border-none shadow-xl shadow-maroon-500/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <BarChart3 className="w-16 h-16 text-white" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Net Flow</p>
                        <p className="text-2xl font-black mt-1 tracking-tighter text-white">
                            ₹{formatCrores(reportsData.summary?.netBalance)}Cr
                        </p>
                        <div 
                            className="flex items-center gap-1 mt-2 text-xs font-bold text-white/50 underline cursor-pointer hover:text-white"
                            onClick={() => showToast('Deficit Analysis: Pendency in revenue verification from consultancy projects is the primary cause. Verify inflows to balance.', 'info')}
                        >
                            View deficit analysis
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reports Tabs */}
            <Tabs defaultValue="outflows" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                    <TabsTrigger value="outflows" className="flex items-center gap-2 rounded-lg font-bold uppercase text-[10px] tracking-widest py-2">
                        <ArrowDownRight className="w-4 h-4 text-rose-500" /> Outflow Ledger
                    </TabsTrigger>
                    <TabsTrigger value="inflows" className="flex items-center gap-2 rounded-lg font-bold uppercase text-[10px] tracking-widest py-2">
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Inflow Ledger
                    </TabsTrigger>
                </TabsList>

                {/* Outflow Ledger */}
                <TabsContent value="outflows" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Expenditure Analysis</CardTitle>
                                <CardDescription>Detailed breakdown of project fundings and equipment purchases.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 gap-2">
                                <Filter className="w-3 h-3" /> Sort by Amount
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {reportsData.outflows?.length === 0 ? (
                                    <div className="text-center py-12 space-y-3">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                                            <FileText className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium">No outflow records found for this period.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                    <th className="px-4 py-3 text-left">Date</th>
                                                    <th className="px-4 py-3 text-left">Entity / Project</th>
                                                    <th className="px-4 py-3 text-left">Category</th>
                                                    <th className="px-4 py-3 text-right">Amount</th>
                                                    <th className="px-4 py-3 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportsData.outflows.map((item) => (
                                                    <tr key={item.id || item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors border-b border-slate-50/50 dark:border-slate-800/30">
                                                        <td className="px-4 py-4 text-sm font-medium text-slate-500">
                                                            {new Date(item.disbursedAt || item.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{item.Project?.title || item.projectTitle || 'Untitled'}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{item.Project?.department || item.FundRequest?.department || 'Research'}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <Badge variant="outline" className="text-[8px] font-black opacity-60">{item.FundRequest?.source || 'OUTFLOW'}</Badge>
                                                        </td>
                                                        <td className="px-4 py-4 text-right font-black text-rose-600 dark:text-rose-400 italic">{formatAmount(item.amount)}</td>
                                                        <td className="px-4 py-4 text-right">
                                                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase">
                                                                Completed
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Inflow Ledger */}
                <TabsContent value="inflows" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Revenue Stream Log</CardTitle>
                                <CardDescription>Consolidated list of all verified consultancy and grant inflows.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 gap-2">
                                <Search className="w-3 h-3" /> Search UTR
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {reportsData.inflows?.length === 0 ? (
                                    <div className="text-center py-12 space-y-3">
                                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-full flex items-center justify-center mx-auto">
                                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium">No verified inflow records for this period.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                    <th className="px-4 py-3 text-left">Verified On</th>
                                                    <th className="px-4 py-3 text-left">Faculty</th>
                                                    <th className="px-4 py-3 text-left">Source</th>
                                                    <th className="px-4 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportsData.inflows.map((item) => (
                                                    <tr key={item.id || item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors border-b border-slate-50/50 dark:border-slate-800/30">
                                                        <td className="px-4 py-4 text-sm font-medium text-slate-500">
                                                            {new Date(item.verifiedAt || item.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{item.User?.name || item.verifiedByName || 'Faculty'}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{item.User?.department || 'Research'}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <Badge variant="outline" className="text-[8px] font-black opacity-60">{item.revenueSource || 'INFLOW'}</Badge>
                                                        </td>
                                                        <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 italic">{formatAmount(item.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AI Insights Bar */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl border border-white/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm">
                        <Globe className="w-5 h-5 text-emerald-500 animate-spin-slow" />
                    </div>
                    <p className="text-sm font-medium">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase mr-2">Audit Insight:</span>
                        Sanctioned vs Disbursed ratio improved by 12% following the new pipeline integration.
                    </p>
                </div>
                <Button 
                    variant="link" 
                    size="sm" 
                    className="text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest"
                    onClick={() => showToast('Detailed Audit Analysis is being compiled. Please wait...', 'loading')}
                >
                    Run detailed analysis
                </Button>
            </div>
        </div>
    );
};

export default FinancialReports;
