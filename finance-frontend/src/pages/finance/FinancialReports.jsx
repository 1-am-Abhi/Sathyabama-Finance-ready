import React, { useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useFinancialReports } from '../../hooks/useFinance';
import { useCentres } from '../../hooks/useCentres';
import { FUND_SOURCE_OPTIONS } from '../../constants/fundSources';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BarChart3, Download, Filter, FileSpreadsheet, FilePieChart, TrendingUp, TrendingDown, Wallet, Calendar, Building2, Search, ArrowUpRight, ArrowDownRight, Globe, FileText } from 'lucide-react';
import useToast from '../../hooks/useToast';
import apiClient from '../../api/client';
import { getCurrentAcademicCycle } from '../../utils/fyUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatCrores = (value) => (Number(value || 0) / 10000000).toFixed(2);

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const FY_MAP = {
  "2024-Q1": { start: "2024-04-01", end: "2024-06-30" },
  "2023-Q4": { start: "2024-01-01", end: "2024-03-31" },
  "2023-ANNUAL": { start: "2023-01-01", end: "2023-12-31" },
};

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

    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [topProjects, setTopProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        const fy = FY_MAP[filters.period];

        const fetchData = () => {
            apiClient.get('/finance/financial-reports', {
                params: {
                    startDate: fy?.start,
                    endDate: fy?.end,
                }
            }).then(res => {
                setData(res.data);
                if (res.data.totalDisbursed > res.data.totalSanctioned * 0.9) {
                    setWarnings(['⚠ Budget nearly exhausted']);
                } else {
                    setWarnings([]);
                }
            }).catch(err => console.error(err))
              .finally(() => setIsLoading(false));
            
            apiClient.get('/analytics/alerts').then(res => {
                // Endpoint returns { success, data: [...] }. Accept either shape,
                // and always coerce to an array so the alerts.map() never crashes.
                const a = res.data?.data ?? res.data?.alerts;
                setAlerts(Array.isArray(a) ? a : []);
            }).catch(err => console.error(err));

            apiClient.get('/audit/top-projects').then(res => {
                setTopProjects(res.data?.data || []);
            }).catch(err => console.warn('Audit metrics not available for current role'));
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [filters.period]);

    React.useEffect(() => {
        setLayout("Financial Reports", "Consolidated financial ledger and audit-ready analytics");
    }, [setLayout]);

    const handleExport = (type) => {
        const fy = FY_MAP[filters.period];
        if (!fy) return;
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

        if (type === 'EXCEL') {
            const url = `${API_BASE_URL}/finance/financial-reports/export?startDate=${fy.start}&endDate=${fy.end}`;
            window.open(url, '_blank');
        } else if (type === 'PDF') {
            const url = `${API_BASE_URL}/finance/financial-reports/pdf?startDate=${fy.start}&endDate=${fy.end}`;
            window.open(url, '_blank');
        } else {
            alert(`Exporting ${type} report for ${filters.period}...`);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <ToastPortal />
            {/* Alerts & Warnings */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className="bg-red-500 text-white p-3 rounded font-bold shadow-sm">
                            {a.message}
                        </div>
                    ))}
                </div>
            )}
            
            {warnings.length > 0 && (
                <div className="space-y-2">
                    {warnings.map((w, i) => (
                        <div key={i} className="bg-yellow-500 text-white p-3 rounded font-bold shadow-sm">
                            {w}
                        </div>
                    ))}
                </div>
            )}

            {/* Header / Export Hub */}
            <div className="flex flex-wrap gap-3 justify-between items-center bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-maroon-500" />
                        <select 
                            className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-maroon-500 transition-all appearance-none cursor-pointer"
                            value={filters.period}
                            onChange={(e) => setFilters({...filters, period: e.target.value})}
                        >
                            <option value="2024-Q1">Q1 FY {getCurrentAcademicCycle()}</option>
                            <option value="2023-Q4">Q4 FY {getCurrentAcademicCycle()}</option>
                            <option value="2023-ANNUAL">Annual Report 2023</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <select 
                            className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
                            value={filters.centre}
                            onChange={(e) => setFilters({...filters, centre: e.target.value})}
                        >
                            <option value="All Centres">All Centres</option>
                            {(Array.isArray(dynamicCentres) ? dynamicCentres : []).map((centre) => {
                                const value = centre?.name || centre;
                                return <option key={value} value={value}>{value}</option>;
                            })}
                        </select>
                    </div>

                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                        <select 
                            className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            value={filters.fundType}
                            onChange={(e) => setFilters({...filters, fundType: e.target.value})}
                        >
                            <option value="All Funds">All Funds</option>
                            {FUND_SOURCE_OPTIONS.map((source) => (
                                <option key={source.value} value={source.value}>
                                    {source.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="whitespace-nowrap flex items-center gap-2 rounded-xl h-10 px-4 font-bold border-slate-200 dark:border-slate-800" onClick={() => handleExport('PDF')}>
                        <FilePieChart className="w-4 h-4 text-rose-500" /> PDF Audit
                    </Button>
                    <Button variant="outline" size="sm" className="whitespace-nowrap flex items-center gap-2 rounded-xl h-10 px-4 font-bold border-slate-200 dark:border-slate-800" onClick={() => handleExport('EXCEL')}>
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel
                    </Button>
                </div>
            </div>

            {(!data || data.totalDisbursed === 0) ? (
                <div className="bg-white/50 dark:bg-slate-900/50 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-slate-500 font-medium">No data available for selected period</p>
                </div>
            ) : (
                <>
                    {/* Master Summary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet className="w-16 h-16" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Net Cash Flow</p>
                        <p className={`text-2xl font-black mt-1 tracking-tighter ${(data?.netFlow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{data?.netFlow ? data.netFlow.toLocaleString() : 0}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-500">
                            {formatCrores(data?.netFlow)} Cr Total Balance
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown className="w-16 h-16 text-rose-500" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest pl-1">Total Disbursed</p>
                        <p className="text-2xl font-black mt-1 tracking-tighter text-rose-700 dark:text-rose-400">
                            ₹{data?.totalDisbursed ? data.totalDisbursed.toLocaleString() : 0}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-500 italic">
                            Total outflow from research funds
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 text-emerald-500" />
                    </div>
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-1">Total Revenue</p>
                        <p className="text-2xl font-black mt-1 tracking-tighter text-emerald-700 dark:text-emerald-400">
                            ₹{data?.totalRevenue ? data.totalRevenue.toLocaleString() : 0}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-500">
                            Verified consultancy & grant inflows
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm relative group">
                    <CardContent className="pt-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Utilization %</p>
                        <p className="text-2xl font-black mt-1 tracking-tighter text-indigo-600">
                            {data?.totalSanctioned > 0 ? ((data.totalDisbursed / data.totalSanctioned) * 100).toFixed(1) : 0}%
                        </p>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-full transition-all duration-1000" 
                                style={{ width: `${Math.min((data?.totalDisbursed / data?.totalSanctioned) * 100 || 0, 100)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-none shadow-sm p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-lg font-black tracking-tight">Project Expenditure Analysis</CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live fund distribution by project</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                        <div className="w-full h-[300px] min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.projects || []}>
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fontWeight: 700 }}
                                />
                                <YAxis 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                                    tick={{ fontWeight: 700 }}
                                />
                                <Tooltip 
                                    cursor={{fill: 'rgba(226, 232, 240, 0.4)'}}
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                        fontSize: '12px',
                                        fontWeight: 800
                                    }}
                                />
                                <Bar 
                                    dataKey="value" 
                                    fill="url(#barGradient)" 
                                    radius={[6, 6, 0, 0]} 
                                    barSize={32}
                                />
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4f46e5" />
                                        <stop offset="100%" stopColor="#818cf8" />
                                    </linearGradient>
                                </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-lg font-black tracking-tight">Top Spend Projects</CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">Highest cumulative disbursements</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 pt-4">
                        <div className="space-y-4">
                            {topProjects.length > 0 ? topProjects.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                                            0{idx + 1}
                                        </div>
                                        <div className="max-w-[140px]">
                                            <p className="text-xs font-black truncate">{p.project}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sanctioned Order</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-900 dark:text-white">₹{p.total.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase flex items-center justify-end gap-0.5">
                                            <TrendingUp className="w-2.5 h-2.5" /> High
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-xs font-bold text-slate-400 italic">No data available</p>
                                </div>
                            )}
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
                                {data?.outflows?.length === 0 || !data?.outflows ? (
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
                                                {(Array.isArray(data?.outflows) ? data.outflows : []).map((item) => (
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
                                {data?.inflows?.length === 0 || !data?.inflows ? (
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
                                                {(Array.isArray(data?.inflows) ? data.inflows : []).map((item) => (
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
                        <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase mr-2">Live Summary:</span>
                        ₹{data?.totalDisbursed?.toLocaleString() || 0} disbursed in selected period
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
                </>
            )}
        </div>
    );
};

export default FinancialReports;
