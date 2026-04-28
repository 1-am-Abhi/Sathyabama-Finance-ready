import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    Banknote, CheckCircle, TrendingUp, Plus, FileText, Landmark,
    UserPlus, BarChart3, Filter, Wallet, Building2, Activity, CircleDollarSign,
    Sparkles, AlertTriangle, Info, Clock, Users, Target, Calendar, FileSpreadsheet
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
import ResearchCentreDetail from './ResearchCentreDetail';
import { formatCurrency } from '../../utils/format';
import apiClient from '../../api/client';
import AddCentreModal from '../../components/shared/AddCentreModal';
import Loader from '../../components/shared/Loader';
import EmptyState from '../../components/shared/EmptyState';
import { normalizeFundSource } from '../../constants/fundSources';
import { safeApiObj } from '../../api/safeApi';
import { useCentres } from '../../hooks/useCentres';

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

const EMPTY_ADMIN_DASHBOARD = {
    totalAllocated: 0,
    used: 0,
    remaining: 0,
    totalBudget: 0,
    totalProjects: 0,
    activeProjects: 0,
    pendingApprovals: 0,
    totalFaculty: 0,
    totalDisbursed: 0,
    centres: [],
    monthlyData: [],
    fundSources: [],
    recentRequests: []
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
    const [drillCentre, setDrillCentre] = useState(null);
    const [drillData, setDrillData] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [isDrillLoading, setIsDrillLoading] = useState(false);
    const [isDark] = useState(false);


    const [stats, setStats] = useState(null);
    const [fundSources, setFundSources] = useState([]);
    const [centresStats, setCentresStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);
    const refreshTimerRef = React.useRef(null);
    const { centres: dynamicCentres } = useCentres();

    const normalizeCentre = (c) => {
        if (!c) return { _id: Math.random().toString(), name: 'Unknown', centre: 'Unknown' };
        // If the center object itself has a 'name' property that is an object, extract the string
        const id = c._id || c.id || (typeof c.name === 'object' ? c.name._id : null) || (typeof c.centre === 'object' ? c.centre._id : null) || Math.random().toString();
        const name = typeof c.name === 'object' ? (c.name.name || c.name.label || String(c.name)) : String(c.name || c.centre || (typeof c === 'string' ? c : 'Unknown'));
        return {
            ...c,
            _id: String(id),
            id: String(id),
            name: name,
            centre: name
        };
    };

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
            const fetchedData = await safeApiObj(
                () =>
                    apiClient.get('/projects/stats', {
                        params: { financialYear: selectedFY }
                    }),
                EMPTY_ADMIN_DASHBOARD
            );

            const statsCentres = (Array.isArray(fetchedData?.centres) ? fetchedData.centres : []).map(normalizeCentre);
            const fallbackCentres = statsCentres.length === 0 ? dynamicCentres.map(normalizeCentre) : [];
            
            const normalizedData = {
                ...EMPTY_ADMIN_DASHBOARD,
                ...(fetchedData || {}),
                centres: statsCentres.length > 0 ? statsCentres : fallbackCentres,
            };

            dashboardCache[selectedFY] = {
                stats: normalizedData,
                centres: normalizedData.centres,
                fundSources: normalizedData.fundSources ?? []
            };

            setStats(normalizedData);
            setCentresStats(normalizedData.centres);
            setFundSources(normalizedData.fundSources ?? []);
        } catch (error) {
            console.error("Error fetching admin data:", error);
            const fallbackCentres = dynamicCentres;
            const fallbackData = {
                ...EMPTY_ADMIN_DASHBOARD,
                centres: fallbackCentres,
            };
            setStats(fallbackData);
            setCentresStats(fallbackCentres);
            setFundSources([]);
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

        const socketUrl = process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
        const token = localStorage.getItem('token');

        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        const handleConnect = () => {
            setSocketConnected(true);
            setIsSocketConnected(true);
        };

        const handleDisconnect = () => {
            setSocketConnected(false);
            setIsSocketConnected(false);
        };

        const handleFinanceUpdate = () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(() => {
                fetchDashboardData();
                fetchInsights();
            }, 1000);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('finance:update', handleFinanceUpdate);

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('finance:update', handleFinanceUpdate);
            socket.disconnect();
        };
    }, [selectedFY]);

    const centresList = React.useMemo(
        () => (Array.isArray(stats?.centres) ? stats.centres : []),
        [stats]
    );

    React.useEffect(() => {
        console.log("CENTRES:", centresList);
    }, [centresList]);

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
        return (centresStats || [])
            .map(c => {
                const nameStr = String(c.name || c.centre || (typeof c === 'string' ? c : 'Unknown Centre'));
                return {
                    _id: c._id || c.name || c.centre || Math.random().toString(),
                    centre: nameStr,
                    name: nameStr,
                    totalProjects: Number(c.totalProjects || c.projects || 0),
                    activeProjects: Number(c.activeProjects || 0),
                    totalBudget: Number(c.totalBudget || c.allocated || 0),
                    disbursed: Number(c.disbursed || c.released || 0)
                };
            })
            .filter(c => c.name && c.name !== 'Others' && c.name !== 'N/A' && c.name !== 'Unassigned');
    }, [centresStats]);

    const filteredData = React.useMemo(
        () =>
            selectedCentre === 'ALL'
                ? centreData
                : centreData.filter(c => c._id === selectedCentre || c.centre === selectedCentre),
        [centreData, selectedCentre]
    );

    const barChartData = React.useMemo(() =>
        selectedCentre === 'ALL'
            ? centreData.map(c => ({
                name: c.centre.split(' ').map(w => w[0]).join(''),
                fullName: c.centre,
                budget: (c.totalBudget ?? 0) / 1000000,
                disbursed: (c.disbursed ?? 0) / 1000000
            }))
            : [
                {
                    name: 'Research',
                    fullName: filteredData[0]?.centre,
                    budget: (filteredData[0]?.totalBudget ?? 0) / 1000000,
                    disbursed: (filteredData[0]?.disbursed ?? 0) / 1000000
                },
            ]
        , [centreData, filteredData, selectedCentre]);

    const handleBarClick = async (data) => {
        if (!data || !data.fullName) return;
        try {
            setIsDrillLoading(true);
            setDrillCentre(data.fullName);
            setOpenModal(true);
            const res = await apiClient.get(`/analytics/centre/${encodeURIComponent(data.fullName)}`);
            setDrillData(res.data?.data || []);
        } catch (err) {
            console.error("Drill-down failed:", err);
            toast.error("Failed to fetch project breakdown");
        } finally {
            setIsDrillLoading(false);
        }
    };

    const chartConfig = { grid: '#E2E8F0', text: '#64748B', tooltip: '#FFFFFF', tooltipBorder: '#E2E8F0' };
    const quickActions = [
        { title: 'Manage Faculty / Projects', description: 'View and edit staff', icon: Users, color: 'bg-maroon-50', iconBg: 'bg-maroon-100', action: () => navigate('/admin/assign-faculty') },
        { title: 'Projects', description: 'Oversight & status', icon: Target, color: 'bg-indigo-50', iconBg: 'bg-indigo-100', action: () => navigate('/admin/approve-projects') },
        { title: 'Fund Requests', description: 'Process approvals', icon: FileText, color: 'bg-emerald-50', iconBg: 'bg-emerald-100', action: () => navigate('/admin/fund-requests') },
        { title: 'Add Research Center', description: 'Register new academic entity', icon: Building2, color: 'bg-indigo-50', iconBg: 'bg-indigo-100', action: () => setIsAddCentreOpen(true) },
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

    if (!loading && !hasData && (!centreList || !centreList.length)) {
        return <EmptyState message="No Financial Data Available" description="There are no records for the selected financial year." />;
    }

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gradient-to-br from-[#0b1220] to-[#0f172a] min-h-screen text-white selection:bg-indigo-500/30">
            {/* Real-time Connectivity Status */}
            {!isSocketConnected && (
                <div className="mb-6 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-400 text-[10px] font-bold text-center py-2.5 uppercase tracking-widest animate-pulse rounded-xl flex items-center justify-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    System Latency Detected - Synchronizing Financial Ledger...
                </div>
            )}

            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] ${socketConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        {socketConnected ? 'Institutional Node: Active' : 'Offline Mode'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>

            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Projects', value: totalStats.totalProjects, icon: Target, color: 'text-indigo-400' },
                    { label: 'Active Pipeline', value: totalStats.activeProjects, icon: Activity, color: 'text-emerald-400' },
                    { label: 'Total Disbursed', value: formatCurrency(totalStats.totalDisbursed), icon: Banknote, color: 'text-blue-400' },
                    { label: 'Pending Approvals', value: totalStats.pendingApprovals, icon: Clock, color: 'text-amber-400' }
                ].map((item, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</p>
                            <item.icon className={`w-4 h-4 ${item.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">{item.value}</h2>
                    </div>
                ))}
            </div>

            {fundSources.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {(fundSources ?? []).map(fund => (
                        <div key={fund.name} className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/[0.08] transition-all relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    {fund.displayName || getAdminFundSourceLabel(fund.name)}
                                </span>
                                <Wallet className="w-4 h-4 text-indigo-400 opacity-40" />
                            </div>
                            <div className="mb-6">
                                <h3 className="text-3xl font-semibold tracking-tight">
                                    ₹{(safeNumber(fund.totalAllocated) / 10000000).toFixed(2)}<span className="text-sm font-medium text-gray-500 ml-1">Cr</span>
                                </h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase mt-1">Authorized Allocation</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Disbursed</p>
                                    <p className="text-sm font-medium text-emerald-400">{formatCurrency(safeNumber(fund.totalUsed))}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Available</p>
                                    <p className="text-sm font-medium text-indigo-400">{formatCurrency(safeNumber(fund.remainingBalance))}</p>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/50 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                        </div>
                    ))}
                </div>
            )}



            {/* ─── QUICK ACTIONS (moved above table) ─── */}
            <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex gap-4">
                    {(quickActions ?? []).map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={index}
                                onClick={isEditable ? action.action : () => toast.error(`Actions are locked for past fiscal year`)}
                                disabled={!isEditable}
                                className={`min-w-[240px] p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-left transition-all duration-300 ${!isEditable ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:bg-white/10 hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-indigo-500/10'}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    {!isEditable && <Clock className="w-4 h-4 text-gray-500" />}
                                </div>
                                <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">{action.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── FILTERS BAR ─── */}
            <div className="mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Fiscal Cycle</label>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 hover:bg-white/10 transition-colors">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            <select 
                                className="bg-transparent text-sm font-medium outline-none cursor-pointer appearance-none min-w-[80px]" 
                                value={selectedFY} 
                                onChange={(e) => { setSelectedFY(e.target.value); setSelectedDate(null); }}
                            >
                                {fyOptions.map(fy => <option key={fy} value={fy} className="bg-[#0f172a]">{fy}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Research Hub</label>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 hover:bg-white/10 transition-colors">
                            <Building2 className="w-4 h-4 text-indigo-400" />
                            <select
                                className="bg-transparent text-sm font-medium outline-none cursor-pointer max-w-[180px] appearance-none"
                                value={selectedCentre}
                                onChange={(e) => setSelectedCentre(e.target.value)}
                            >
                                <option value="ALL" className="bg-[#0f172a]">All Centres</option>
                                {centresList.map(c => (
                                    <option key={c._id} value={c._id} className="bg-[#0f172a]">{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:w-64">
                         <DateFilter selectedDate={selectedDate} onChange={(date) => setSelectedDate(date)} placeholder="Daily Audit View" />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.open(`${apiClient.defaults.baseURL}/reports/export?fy=${selectedFY}&type=pdf`, '_blank')}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4 opacity-50" /> PDF
                        </button>
                        <button
                            onClick={() => window.open(`${apiClient.defaults.baseURL}/reports/export?fy=${selectedFY}&type=excel`, '_blank')}
                            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 text-xs font-semibold transition-all flex items-center gap-2"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── RESEARCH HUB PERFORMANCE TABLE ─── */}
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden mb-8 shadow-2xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-medium tracking-tight">Research Hub Performance</h3>
                    <div className="flex items-center gap-3">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sort by: Budget</span>
                         <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                            <Filter className="w-3.5 h-3.5 text-gray-400" />
                         </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Institutional Centre</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Staffing</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Active Load</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Total Budget</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Net Disbursed</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] text-right">Execution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {hasData && filteredData.length > 0 ? (
                                filteredData.map((centre, index) => (
                                    <tr 
                                        key={index} 
                                        onClick={() => { setSelectedCentreDetail(centre.centre); setDetailModalOpen(true); }}
                                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                    >
                                        <td className="px-8 py-6 font-medium tracking-tight">{centre.name}</td>
                                        <td className="px-6 py-6 text-sm text-gray-400">{centre.totalProjects} Projects</td>
                                        <td className="px-6 py-6">
                                            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                                                {centre.activeProjects} Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-sm text-gray-400 font-mono">{formatCurrency(centre.totalBudget)}</td>
                                        <td className="px-6 py-6 text-sm font-semibold text-white font-mono">{formatCurrency(centre.disbursed)}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="w-32 bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                                                    <div 
                                                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                                                        style={{ width: `${Math.min(100, (safeNumber(centre.disbursed) / (safeNumber(centre.totalBudget) || 1)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 font-mono">
                                                    {((safeNumber(centre.disbursed) / (safeNumber(centre.totalBudget) || 1)) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <EmptyState message="Registry Entry Not Found" description="Try adjusting fiscal filters." />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── ALL GRAPHS BELOW TABLE ─── */}

            {/* Budget Comparison + Fund Utilization */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-medium">Budget Comparison</h3>
                        <Badge variant="outline" className="text-[10px] border-white/10 text-gray-500 uppercase tracking-widest px-3">Centre Breakdown</Badge>
                    </div>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}M`} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }} />
                                <Bar dataKey="budget" fill="#6366f1" radius={[4, 4, 0, 0]} name="Allocated" barSize={12} onClick={(data) => handleBarClick(data)} className="cursor-pointer" />
                                <Bar dataKey="disbursed" fill="#10b981" radius={[4, 4, 0, 0]} name="Disbursed" barSize={12} onClick={(data) => handleBarClick(data)} className="cursor-pointer" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col">
                    <h3 className="text-lg font-medium mb-8">Fund Utilization</h3>
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                        <div className="w-full h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={24}
                                    data={[{ name: 'Utilization', value: totalStats.totalAllocated > 0 ? (totalStats.totalDisbursed / totalStats.totalAllocated) * 100 : 0, fill: '#6366f1' }]}
                                    startAngle={225} endAngle={-45}
                                >
                                    <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={12} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="absolute flex flex-col items-center justify-center pt-2">
                            <span className="text-5xl font-bold tracking-tighter text-white">
                                {totalStats.totalAllocated > 0 ? ((totalStats.totalDisbursed / totalStats.totalAllocated) * 100).toFixed(0) : 0}<span className="text-xl text-gray-500">%</span>
                            </span>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-2">Utilized</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mt-8 px-4">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Total Grant</p>
                            <p className="text-lg font-semibold tracking-tight">{formatCurrency(totalStats.totalAllocated)}</p>
                        </div>
                        <div className="text-center border-l border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Total Outflow</p>
                            <p className="text-lg font-semibold tracking-tight text-emerald-400">{formatCurrency(totalStats.totalDisbursed)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {monthlyData.length > 0 && (
                <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl mb-8 group">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-semibold tracking-tight">Financial Performance Trajectory</h3>
                            <p className="text-xs text-gray-500 mt-1">Disbursement trends across fiscal cycles</p>
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/5">
                           <TrendingUp className="w-5 h-5 text-indigo-400" />
                        </div>
                    </div>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                                <Bar dataKey="amount" fill="url(#barGradient2)" radius={[6, 6, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden mb-12">
                <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium tracking-tight">Administrative Audit Trail</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Immutable Immutable Security Ledger</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        Real-time Auditing
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="px-8 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">State Change</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Authorized By</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Timestamp</th>
                                <th className="px-8 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] text-right">Verification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {(recentRequests || []).flatMap(req => (req.auditTrail || []).map((log, idx) => ({ ...log, project: req.projectTitle, id: `${req._id}-${idx}` }))).length > 0 ? (
                                (recentRequests || []).flatMap(req => (req.auditTrail || []).map((log, idx) => ({ ...log, project: req.projectTitle, id: `${req._id}-${idx}` })))
                                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                    .slice(0, 8)
                                    .map((log) => (
                                        <tr key={log.id} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold tracking-tight group-hover:text-indigo-400 transition-colors">{log.project}</span>
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{log.stage}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-bold">
                                                        {log.updatedByName?.charAt(0) || 'S'}
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400">{log.updatedByName || 'SYSTEM'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-[10px] text-gray-500 font-mono">
                                                {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-8 py-5 text-right italic text-xs text-gray-500 max-w-[200px] truncate">
                                                {log.remarks}
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-gray-500">
                                        <Clock className="w-10 h-10 mx-auto mb-4 opacity-10" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">No Recent Displacements</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Sparkles className="w-5 h-5" />
                             </div>
                             <div>
                                <h3 className="text-lg font-medium">AI Financial Intelligence</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Autonomous Pattern Recognition</p>
                             </div>
                        </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {insights.length > 0 ? (
                            insights.map((insight, i) => (
                                <div key={i} className="p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.06] transition-all group/insight">
                                    <div className="flex gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                        <p className="text-sm text-gray-300 leading-relaxed group-hover/insight:text-white transition-colors">{insight}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 opacity-30">
                                <Activity className="w-12 h-12 mb-4 animate-pulse" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Scanning Transactional Graph...</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <TrendingUp className="w-5 h-5" />
                             </div>
                             <div>
                                <h3 className="text-lg font-medium">Outflow Projections</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">30-Day Predictive Velocity</p>
                             </div>
                        </div>
                        {forecast && (
                            <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${forecast.risk === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                {forecast.risk} RISK VECTOR
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Daily Average Spend</p>
                            <h4 className="text-xl font-semibold">{formatCurrency(forecast?.avgDailySpend ?? 0)}</h4>
                        </div>
                        <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Projected 30-Day</p>
                            <h4 className="text-xl font-semibold text-indigo-400">{formatCurrency(forecast?.projectedUsage30Days ?? 0)}</h4>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {(centreList ?? []).slice(0, 4).map((centre, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-400">{centre.name}</span>
                                    <span className="text-xs font-semibold text-white">{formatCurrency(centre.disbursed ?? 0)}</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
                                        style={{ width: `${Math.min(100, (safeNumber(centre.disbursed) / (safeNumber(stats?.used) || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ResearchCentreDetail isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} centreName={selectedCentreDetail} isDark={isDark} />
            <AIResultModal open={aiModal.open} loading={aiModal.loading} result={aiModal.result} onClose={() => setAiModal({ ...aiModal, open: false })} />
            <AddCentreModal isOpen={isAddCentreOpen} onClose={() => setIsAddCentreOpen(false)} onRefresh={refreshCentres} />

            {/* Drill-down Modal */}
            {openModal && (
                <div className="fixed inset-0 bg-[#0b1220]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#1e293b] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
                            <div>
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                                    {drillCentre} Breakdown
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">Project-level disbursement granularity</p>
                            </div>
                            <button 
                                onClick={() => { setOpenModal(false); setDrillData([]); }}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {isDrillLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-sm font-medium animate-pulse">Analyzing Financial Ledger...</p>
                                </div>
                            ) : drillData.length > 0 ? (
                                <div className="space-y-3">
                                    {drillData.map((p, idx) => (
                                        <div 
                                            key={idx}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate max-w-[300px]">
                                                    {p.projectTitle}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-emerald-400">
                                                    ₹{Number(p.disbursed).toLocaleString()}
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Released</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                                    <p className="text-gray-400">No active projects found for this centre.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
                            <button 
                                onClick={() => { setOpenModal(false); setDrillData([]); }}
                                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-all"
                            >
                                Close Analysis
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
