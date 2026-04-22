import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    Banknote, CheckCircle, TrendingUp, Plus, FileText, Landmark,
    UserPlus, BarChart3, Filter, Wallet, Building2, Activity, CircleDollarSign,
    Sparkles, AlertTriangle, Info, Clock, Users, Target
} from 'lucide-react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import DateFilter from '../../components/shared/DateFilter';
import AIResultModal from '../../components/shared/AIResultModal';
import { generateResearchInsights } from '../../services/aiService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, Sector, RadialBarChart, RadialBar
} from 'recharts';
import { useCentres } from '../../constants/researchCentres';
import ResearchCentreDetail from './ResearchCentreDetail';
import { formatCurrency } from '../../utils/format';
import apiClient from '../../api/client';
import AddCentreModal from '../../components/shared/AddCentreModal';
import Loader from '../../components/shared/Loader';
import EmptyState from '../../components/shared/EmptyState';
import { normalizeFundSource } from '../../constants/fundSources';

const safeNumber = (val) => {
    const num = Number(val || 0);
    return isFinite(num) ? num : 0;
};

const getAdminFundSourceLabel = (value) => {
    const normalized = normalizeFundSource(value);
    if (normalized === 'INSTITUTIONAL') return 'Director Fund';
    if (normalized === 'OTHERS') return 'Others';
    return 'PFMS';
};


const getCurrentFY = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-based: Apr is 3

    return month >= 3
        ? `${year}-${(year + 1).toString().slice(-2)}`
        : `${year - 1}-${year.toString().slice(-2)}`;
};

const generateFYOptions = (pastYears = 5) => {
    const currentFY = getCurrentFY();
    const [currentStartYear] = currentFY.split('-').map(Number);
    const options = [];
    for (let i = pastYears; i >= 0; i--) {
        const startYear = currentStartYear - i;
        const endYearShort = (startYear + 1).toString().slice(-2);
        options.push(`${startYear}-${endYearShort}`);
    }
    return options;
};

const dashboardCache = {};

const AdminDashboard = () => {
    const { setLayout } = useLayout();
    const navigate = useNavigate();
    const { user } = useAuth();
    const userId = user?.id || user?._id;
    const [selectedCentre, setSelectedCentre] = useState('ALL');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedFY, setSelectedFY] = useState(getCurrentFY());
    const isEditable = selectedFY === getCurrentFY();
    const fyOptions = React.useMemo(() => generateFYOptions(5), []);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedCentreDetail, setSelectedCentreDetail] = useState(null);
    const [isAddCentreOpen, setIsAddCentreOpen] = useState(false);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });
    const [forecast, setForecast] = useState(null);
    const [insights, setInsights] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(true);
    const [isDark] = useState(false);


    const [stats, setStats] = useState(null);
    const [fundSources, setFundSources] = useState([]);
    const [centresStats, setCentresStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);
    const { centres: dynamicCentres } = useCentres();
    const refreshTimerRef = React.useRef(null);

    const fetchDashboardData = async (force = false) => {
        try {
            if (!force && dashboardCache[selectedFY]) {
                const cached = dashboardCache[selectedFY];
                setStats(cached.stats);
                setCentresStats(cached.centres);
                setFundSources(cached.fundSources || []);
                setLoading(false);
                return;
            }

            if (!stats) setLoading(true);
            const [statsRes] = await Promise.all([
                apiClient.get('/projects/stats', {
                    params: { financialYear: selectedFY }
                })
            ]);

            if (statsRes?.data?.success) {
                const fetchedData = statsRes.data.data || {};
                dashboardCache[selectedFY] = {
                    stats: fetchedData,
                    centres: fetchedData.centres ?? [],
                    fundSources: fetchedData.fundSources ?? []
                };

                setStats(fetchedData);
                setCentresStats(fetchedData.centres ?? []);
                setFundSources(fetchedData.fundSources ?? []);
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchDashboardData();

        const fetchInsights = async () => {
            try {
                const [insightsRes, forecastRes] = await Promise.all([
                    apiClient.get('/analytics/insights'),
                    apiClient.get('/analytics/forecast-base?days=30')
                ]);

                if (insightsRes.data?.success) {
                    setInsights(insightsRes.data.data?.insights ?? []);
                    const avgDaily = Number(insightsRes.data.data?.avgDailySpend || 0);
                    setForecast({
                        avgDailySpend: avgDaily,
                        projectedUsage30Days: avgDaily * 30,
                        confidence: avgDaily > 0 ? 'HIGH' : 'LOW',
                        risk: (avgDaily * 30) > (Number(totalStats?.totalAllocated || 0) / 12) ? 'HIGH' : 'LOW'
                    });
                }
            } catch (err) {
                console.warn("Failed to fetch analytics:", err);
            }
        };
        fetchInsights();

        const socketUrl = (process.env.REACT_APP_API_URL || 'https://finance-api-x1ig.onrender.com').replace(/\/api\/?$/, '');
        const token = localStorage.getItem('token');

        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            setSocketConnected(true);
            setIsSocketConnected(true);
        });
        socket.on('disconnect', () => {
            setSocketConnected(false);
            setIsSocketConnected(false);
        });

        socket.on('finance:update', () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(() => {
                fetchDashboardData();
                fetchInsights();
            }, 1000);
        });

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            socket.off('connect');
            socket.off('disconnect');
            socket.off('finance:update');
            socket.disconnect();
        };
    }, []);

    const centresList = React.useMemo(() => {
        const list = (dynamicCentres || []).map(c => ({
            label: c.name || c.centre || 'Unknown Centre',
            value: c._id || c.id || c.name
        }));

        // Merge with stats-based centres for maximum coverage
        (centresStats || []).forEach(c => {
            const name = c.name || c.centre;
            if (name && !list.find(item => item.label === name)) {
                list.push({ label: name, value: c._id || c.id || name });
            }
        });

        return list;
    }, [dynamicCentres, centresStats]);

    // Auto-select first centre if none selected
    React.useEffect(() => {
        if ((selectedCentre === 'ALL' || !selectedCentre) && centresList.length > 0) {
            setSelectedCentre(centresList[0].value);
        }
    }, [centresList, selectedCentre]);

    const totalStats = React.useMemo(() => {
        if (!stats) return { totalProjects: 0, activeProjects: 0, pendingApprovals: 0, totalBudget: 0, totalAllocated: 0, used: 0, remaining: 0, totalFaculty: 0, totalDisbursed: 0 };
        return {
            totalProjects: safeNumber(stats.totalProjects),
            activeProjects: safeNumber(stats.activeProjects),
            pendingApprovals: safeNumber(stats.pendingApprovals),
            totalBudget: safeNumber(stats.totalBudget),
            totalAllocated: safeNumber(stats.totalAllocated),
            used: safeNumber(stats.used),
            remaining: safeNumber(stats.remaining),
            totalFaculty: safeNumber(stats.totalFaculty),
            totalDisbursed: safeNumber(stats.totalDisbursed ?? stats.used)
        };
    }, [stats]);

    const centreData = React.useMemo(() => {
        const normalize = (s) => (s || '').trim().toLowerCase().replace(/^centre\s+(for|of\s+excellence\s+for)\s+/i, '');
        return centres.map(name => {
            const centreStat = (centresStats || []).find(c => {
                const n1 = normalize(c.name);
                const n2 = normalize(name);
                return n1 === n2 || (n1.length > 5 && n2.includes(n1)) || (n2.length > 5 && n1.includes(n2));
            });
            return {
                centre: name,
                totalProjects: centreStat?.totalProjects ?? 0,
                activeProjects: centreStat?.activeProjects ?? 0,
                totalBudget: centreStat?.totalBudget ?? 0,
                disbursed: centreStat?.disbursed ?? 0
            };
        });
    }, [centres, centresStats]);

    const filteredData = React.useMemo(() =>
        selectedCentre === 'ALL' ? centreData : centreData.filter(c => c.centre === selectedCentre)
        , [centreData, selectedCentre]);

    const barChartData = React.useMemo(() =>
        selectedCentre === 'ALL'
            ? centreData.map(c => ({
                name: c.centre.split(' ').map(w => w[0]).join(''),
                budget: (c.totalBudget ?? 0) / 1000000,
                disbursed: (c.disbursed ?? 0) / 1000000
            }))
            : [
                { name: 'Research', budget: (filteredData[0]?.totalBudget ?? 0) / 1000000, disbursed: (filteredData[0]?.disbursed ?? 0) / 1000000 },
            ]
        , [centreData, filteredData, selectedCentre]);

    const chartConfig = { grid: '#E2E8F0', text: '#64748B', tooltip: '#FFFFFF', tooltipBorder: '#E2E8F0' };
    const quickActions = [
        { title: 'Manage Faculty / Projects', description: 'View and edit staff', icon: Users, color: 'bg-maroon-50', iconBg: 'bg-maroon-100', action: () => navigate('/admin/assign-faculty') },
        { title: 'Projects', description: 'Oversight & status', icon: Target, color: 'bg-indigo-50', iconBg: 'bg-indigo-100', action: () => navigate('/admin/approve-projects') },
        { title: 'Fund Requests', description: 'Process approvals', icon: FileText, color: 'bg-emerald-50', iconBg: 'bg-emerald-100', action: () => navigate('/admin/fund-requests') },
        { title: 'Reports', description: 'Audit & analytics', icon: Landmark, color: 'bg-amber-50', iconBg: 'bg-amber-100', action: () => navigate('/admin/reports') }
    ];
    const recentRequests = stats?.recentRequests ?? [];
    const refreshCentres = () => fetchDashboardData(true);

    React.useEffect(() => {
        setLayout("Admin Dashboard", "Research & Finance Management Overview");
    }, [setLayout]);

    if (!userId) return null;
    if (loading) return <Loader message="Analyzing financial metrics..." />;

    const hasData = (stats?.totalAllocated ?? 0) > 0 || safeNumber(stats?.used) > 0;
    const monthlyData = stats?.monthlyData ?? [];
    const centreList = stats?.centres ?? [];

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-50 dark:bg-slate-950">
            {!isSocketConnected && (
                <div className="mb-4 bg-amber-500 text-white text-[10px] font-bold text-center py-2 uppercase tracking-widest animate-pulse rounded-lg flex items-center justify-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Connection Lost - Reconnecting to Sathyabama Finance Engine...
                </div>
            )}
            <div className="mb-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black italic uppercase tracking-widest text-slate-400">
                    {socketConnected ? 'Live Connection Active' : 'Real-time Sync Offline'}
                </span>
            </div>

            {fundSources.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {fundSources.map(fund => (
                        <Card key={fund.name} className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden relative group">
                            <CardHeader className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {fund.displayName || getAdminFundSourceLabel(fund.name)}
                                </CardTitle>
                                <Wallet className="w-4 h-4 text-indigo-500" />
                            </CardHeader>
                            <CardContent className="p-4">
                                <p className="text-2xl font-black italic tracking-tighter text-gray-800 dark:text-white">
                                    ₹{(safeNumber(fund.totalAllocated) / 10000000).toFixed(2)} Cr
                                </p>
                                <p className="text-[9px] font-bold uppercase text-slate-400 mt-1 italic">Read-only source allocation</p>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    <div>
                                        <p className="text-slate-400">Used</p>
                                        <p className="mt-1 text-slate-700 dark:text-slate-200">{formatCurrency(safeNumber(fund.totalUsed))}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400">Remaining</p>
                                        <p className="mt-1 text-slate-700 dark:text-slate-200">{formatCurrency(safeNumber(fund.remainingBalance))}</p>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                        </Card>
                    ))}
                </div>
            )}



            {monthlyData.length > 0 && (
                <Card className="border-0 shadow-md mb-8 bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-800 p-4 sm:p-6 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Financial Performance Trajectory</CardTitle>
                            <CardDescription className="text-xs">Monthly disbursement trends for FY {selectedFY}</CardDescription>
                        </div>
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#64748B' }} />
                                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#64748B' }} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(val) => [formatCurrency(val), 'Disbursed']}
                                />
                                <Bar dataKey="amount" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <Card className="border-0 shadow-sm mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4">
                    <CardTitle className="text-base sm:text-lg font-semibold dark:text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                    <div className="grid grid-cols-4 gap-4">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={isEditable ? action.action : () => toast.error(`Actions are locked for past financial year ${selectedFY}`)}
                                    disabled={!isEditable}
                                    className={`p-4 sm:p-6 rounded-lg ${action.color} dark:bg-opacity-10 dark:border-slate-800 transition-all text-left border border-gray-200 ${!isEditable ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-md'}`}
                                >
                                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${action.iconBg} dark:bg-opacity-20 rounded-lg flex items-center justify-center`}>
                                            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        {!isEditable && <Clock className="w-4 h-4 text-gray-400" />}
                                    </div>
                                    <h3 className="font-bold text-sm sm:text-base mb-1 dark:text-white">{action.title}</h3>
                                    <p className="text-xs sm:text-sm opacity-80 dark:text-gray-400 hidden sm:block">{action.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="mb-6 mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">Fin. Year</span>
                        <select className="bg-transparent text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer" value={selectedFY} onChange={(e) => { setSelectedFY(e.target.value); setSelectedDate(null); }} disabled={!!selectedDate}>
                            {fyOptions.map(fy => <option key={fy} value={fy} className="dark:bg-slate-800">{fy}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">Centre</span>
                        <select 
                            className="bg-transparent text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer max-w-[120px] sm:max-w-[180px]" 
                            value={selectedCentre} 
                            onChange={(e) => setSelectedCentre(e.target.value)}
                        >
                            <option value="ALL" className="dark:bg-slate-800">All Centres</option>
                            {centresList.length > 0 ? (
                                centresList.map(c => (
                                    <option key={c.value} value={c.value} className="dark:bg-slate-800">
                                        {c.label}
                                    </option>
                                ))
                            ) : (
                                <option disabled className="dark:bg-slate-800">No Centres Found</option>
                            )}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => fetchDashboardData()}
                        disabled={loading}
                        className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-maroon-600 transition-all flex items-center gap-2"
                        title="Refresh Dashboard"
                    >
                        <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Refresh</span>
                    </button>
                    <div className="flex-1 min-w-[160px]"><DateFilter selectedDate={selectedDate} onChange={(date) => setSelectedDate(date)} placeholder="Filter by Date" /></div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${apiClient.defaults.baseURL}/reports/export?fy=${selectedFY}&type=pdf`, '_blank')}
                            className="h-9 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-gray-200 dark:border-slate-700"
                        >
                            PDF
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${apiClient.defaults.baseURL}/reports/export?fy=${selectedFY}&type=excel`, '_blank')}
                            className="h-9 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-gray-200 dark:border-slate-700"
                        >
                            Excel
                        </Button>
                    </div>
                    {selectedDate && <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900 animate-pulse whitespace-nowrap">Daily View</Badge>}
                    {(selectedDate || selectedFY !== getCurrentFY() || selectedCentre !== 'ALL') && (
                        <button onClick={() => { setSelectedDate(null); setSelectedFY(getCurrentFY()); setSelectedCentre('ALL'); }} className="text-xs font-medium text-gray-400 hover:text-maroon-600 dark:hover:text-maroon-400 transition-colors flex items-center whitespace-nowrap">
                            <Filter className="w-3 h-3 mr-1" /> Reset
                        </button>
                    )}
                </div>
            </div>

            <Card className="border-0 shadow-sm mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg font-semibold dark:text-white">Research Centre Insights</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader><TableRow className="dark:border-slate-800">
                                <TableHead className="pl-4 sm:pl-6">Centre</TableHead>
                                <TableHead>Projects</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead>Budget</TableHead>
                                <TableHead>Disbursed</TableHead>
                                <TableHead className="text-right pr-4 sm:pr-6">Utilization</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {hasData && filteredData.length > 0 ? (
                                    filteredData.map((centre, index) => (
                                        <TableRow
                                            key={index}
                                            className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors dark:border-slate-800"
                                            onClick={() => { setSelectedCentreDetail(centre.centre); setDetailModalOpen(true); }}
                                        >
                                            <TableCell className="font-bold text-gray-700 dark:text-gray-200 pl-4 sm:pl-6">{centre.name || centre.centre || 'Unknown'}</TableCell>
                                            <TableCell className="text-gray-500 font-medium">{centre.totalProjects || 0}</TableCell>
                                            <TableCell><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900 font-bold">{centre.activeProjects || 0}</Badge></TableCell>
                                            <TableCell className="text-gray-500 font-medium">{formatCurrency(centre.totalBudget || 0)}</TableCell>
                                            <TableCell className="font-bold text-slate-800 dark:text-white">{formatCurrency(centre.disbursed || 0)}</TableCell>
                                            <TableCell className="text-right pr-4 sm:pr-6">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div className="w-16 sm:w-24 bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-maroon-600 h-full rounded-full" style={{ width: `${Math.min(100, (safeNumber(centre.disbursed) / (safeNumber(centre.totalBudget) || 1)) * 100)}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-black italic text-gray-500 w-8">
                                                        {((safeNumber(centre.disbursed) / (safeNumber(centre.totalBudget) || 1)) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8">
                                            <EmptyState message="No Centres Matched" description="Try adjusting your filters or adding a new centre." />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 items-stretch">
                <Card className="border-0 shadow-sm dark:bg-slate-900 flex flex-col">
                    <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 flex-shrink-0 px-4 sm:px-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-base sm:text-lg font-semibold">Budget vs Disbursed Comparison</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">Global Overview</Badge>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 flex-1 flex flex-col justify-center">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartConfig.grid} />
                                    <XAxis dataKey="name" fontSize={10} tick={{ fill: chartConfig.text }} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} width={40} tick={{ fill: chartConfig.text }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}M`} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: chartConfig.tooltip, border: `1px solid ${chartConfig.tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(value) => [formatCurrency(value * 1000000), 'Value']}
                                    />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="budget" fill="#6366f1" radius={[4, 4, 0, 0]} name="Allocated Budget" barSize={12} />
                                    <Bar dataKey="disbursed" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Disbursed" barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm dark:bg-slate-900 flex flex-col">
                    <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 flex-shrink-0 px-4 sm:px-6">
                        <CardTitle className="text-base sm:text-lg font-semibold">Fund Utilization Percentage</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 flex-1 flex flex-col justify-center items-center">
                        <div className="h-[280px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="60%"
                                    outerRadius="100%"
                                    barSize={20}
                                    data={[
                                        {
                                            name: 'Utilization',
                                            value: totalStats.totalAllocated > 0 ? (totalStats.totalDisbursed / totalStats.totalAllocated) * 100 : 0,
                                            fill: totalStats.totalAllocated > 0 && (totalStats.totalDisbursed / totalStats.totalAllocated) > 0.8 ? '#e11d48' : '#6366f1'
                                        }
                                    ]}
                                    startAngle={180}
                                    endAngle={0}
                                >
                                    <RadialBar background dataKey="value" cornerRadius={10} />
                                    <Tooltip />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
                                <span className="text-4xl font-black italic text-slate-800 dark:text-white">
                                    {totalStats.totalAllocated > 0 ? ((totalStats.totalDisbursed / totalStats.totalAllocated) * 100).toFixed(0) : 0}%
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Utilized</span>
                            </div>
                        </div>
                        <div className="w-full max-w-xs mt-4 grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Allocated</p>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(totalStats.totalAllocated)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Spent</p>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(totalStats.totalDisbursed)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-sm mt-8 mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 flex flex-row items-center justify-between px-4 sm:px-6">
                    <div>
                        <CardTitle className="text-sm sm:text-lg font-black italic tracking-tighter uppercase">Administrative Audit Trail</CardTitle>
                        <CardDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Successive state transformations and approval history</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-indigo-200 text-indigo-600 font-bold uppercase italic text-[10px] hidden sm:flex">immutable logs</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[500px]">
                            <TableHeader>
                                <TableRow className="text-[10px] uppercase font-black italic tracking-widest opacity-60">
                                    <TableHead className="pl-4 sm:pl-8">Action Taken</TableHead>
                                    <TableHead>Executor</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead className="pr-4 sm:pr-8 text-right">Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(recentRequests || []).flatMap(req => (req.auditTrail || []).map((log, idx) => ({ ...log, project: req.projectTitle, id: `${req._id}-${idx}` }))).length > 0 ? (
                                    (recentRequests || []).flatMap(req => (req.auditTrail || []).map((log, idx) => ({ ...log, project: req.projectTitle, id: `${req._id}-${idx}` })))
                                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                        .slice(0, 10)
                                        .map((log) => (
                                            <TableRow key={log.id} className="text-xs">
                                                <TableCell className="pl-4 sm:pl-8 py-3 sm:py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black italic uppercase text-slate-800 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">{log.project}</span>
                                                        <span className="text-[9px] font-bold text-indigo-500 uppercase italic mt-0.5">{log.stage}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold italic uppercase text-slate-600 dark:text-slate-400">{log.updatedByName || 'SYSTEM'}</TableCell>
                                                <TableCell className="text-[10px] font-bold text-gray-400 italic">
                                                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </TableCell>
                                                <TableCell className="pr-4 sm:pr-8 text-right italic font-medium text-gray-500 truncate max-w-[160px] sm:max-w-[250px]">{log.remarks}</TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-12">
                                            <EmptyState
                                                message="Audit Trail Empty"
                                                description="No administrative actions or state changes have been logged yet."
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <Card className="border-0 shadow-lg bg-slate-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <CardHeader className="border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" /> AI Financial Insights
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {insights.length > 0 ? (
                            insights.map((insight, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0 animate-pulse"></div>
                                    <p className="text-xs text-slate-300 leading-relaxed italic">{insight}</p>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                                <Landmark className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Generating Pattern Analysis...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden relative border-l-4 border-l-indigo-500">
                    <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50 dark:border-slate-800 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" /> Spending Forecast
                            </CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Based on last 30 days disbursement velocity</CardDescription>
                        </div>
                        {forecast && (
                            <Badge className={`${forecast.risk === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} font-black italic uppercase tracking-tighter`}>
                                {forecast.risk} RISK
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2 text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    <p className="text-[9px] uppercase font-black italic tracking-wider">Avg Daily Spend</p>
                                </div>
                                <p className="text-lg font-black italic text-slate-900 dark:text-white">{formatCurrency(forecast?.avgDailySpend ?? 0)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2 text-slate-500">
                                    <TrendingUp className="w-3 h-3" />
                                    <p className="text-[9px] uppercase font-black italic tracking-wider">Projected (30 Days)</p>
                                </div>
                                <p className="text-lg font-black italic text-indigo-600 dark:text-indigo-400">{formatCurrency(forecast?.projectedUsage30Days ?? 0)}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex items-center justify-between">
                            <div className="space-y-4">
                                {(centreList).slice(0, 5).map((centre, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-maroon-600"></div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                                    {centre.name}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(centre.disbursed ?? 0)}
                                            </span>
                                        </div>
                                        <div className="relative h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="absolute top-0 left-0 h-full bg-maroon-600 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (safeNumber(centre.disbursed) / (safeNumber(stats?.used) || 1)) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-indigo-500" />
                                <span className="text-[10px] font-bold italic text-indigo-700 dark:text-indigo-300 uppercase tracking-tight">Forecast Confidence</span>
                            </div>
                            <Badge variant="outline" className="border-indigo-300 text-indigo-600 dark:text-indigo-400 font-black italic uppercase text-[9px] tracking-widest">{forecast?.confidence ?? 'LOW'} CONFIDENCE</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ResearchCentreDetail isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} centreName={selectedCentreDetail} isDark={isDark} />
            <AIResultModal open={aiModal.open} loading={aiModal.loading} result={aiModal.result} onClose={() => setAiModal({ ...aiModal, open: false })} />
            <AddCentreModal isOpen={isAddCentreOpen} onClose={() => setIsAddCentreOpen(false)} onRefresh={refreshCentres} />
        </div>
    );
};

export default AdminDashboard;
