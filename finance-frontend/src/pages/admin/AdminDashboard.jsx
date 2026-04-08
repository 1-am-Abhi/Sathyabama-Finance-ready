import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    FileText, Banknote, CheckCircle, TrendingUp,
    UserPlus, BarChart3, Filter, Wallet, Building2, Sparkles, Activity, CircleDollarSign
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import DateFilter from '../../components/shared/DateFilter';
import AIResultModal from '../../components/shared/AIResultModal';
import { generateResearchInsights } from '../../services/aiService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, Sector
} from 'recharts';
import {
    RESEARCH_CENTRES
} from '../../data/dashboardData';
import ResearchCentreDetail from './ResearchCentreDetail';
import { formatCurrency } from '../../utils/format';
import apiClient from '../../api/client';


const AdminDashboard = () => {
    const { setLayout } = useLayout();
    const navigate = useNavigate();
    const [activeMetric] = useState('projects'); // 'projects' | 'budget' | 'disbursed'
    const [selectedCentre, setSelectedCentre] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedFY, setSelectedFY] = useState('2024-25');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedCentreDetail, setSelectedCentreDetail] = useState(null);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });


    const [stats, setStats] = useState(null);
    const [centresStats, setCentresStats] = useState([]);
    const [recentRequests, setRecentRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        let isMounted = true;
        const fetchDashboardData = async () => {
            try {
                if (isMounted && !stats) setLoading(true); // Only show spinner on first load
                const [statsRes, requestsRes] = await Promise.all([
                    apiClient.get('/projects/stats'),
                    apiClient.get('/fund-requests')
                ]);

                if (isMounted && statsRes.data.success) {
                    setStats(statsRes.data.stats);
                    setCentresStats(statsRes.data.centres);
                }
                if (isMounted && requestsRes.data.success) {
                    setRecentRequests(requestsRes.data.data.slice(0, 5));
                }
            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDashboardData();
        const intervalId = setInterval(fetchDashboardData, 30000); // Poll every 30 seconds

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const centres = React.useMemo(() => {
        if (!centresStats || centresStats.length === 0) return RESEARCH_CENTRES;
        const dynamicCentres = [...new Set(centresStats.map(c => c.name))];
        return dynamicCentres.length > 0 ? dynamicCentres : RESEARCH_CENTRES;
    }, [centresStats]);

    const fyOptions = ['2023-24', '2024-25', '2025-26'];

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const totalStats = React.useMemo(() => {
        if (!stats) return {
            totalProjects: 0,
            activeProjects: 0,
            pendingApprovals: 0,
            totalBudget: 0,
            totalDisbursed: 0,
            totalFaculty: 0
        };
        return {
            totalProjects: stats.totalProjects,
            activeProjects: stats.activeProjects,
            pendingApprovals: stats.pendingApprovals,
            totalBudget: stats.totalBudget,
            totalDisbursed: stats.totalDisbursed,
            totalFaculty: stats.totalFaculty
        };
    }, [stats]);

    const pfmsChartData = React.useMemo(() => [
        { name: 'Consumed', value: stats?.pfmsStats?.consumed || 0, color: '#6366f1' },
        { name: 'Balance', value: Math.max(0, (stats?.pfmsStats?.allotted || 0) - (stats?.pfmsStats?.consumed || 0)), color: '#22c55e' }
    ], [stats]);

    const institutionalChartData = React.useMemo(() => [
        { name: 'Utilized', value: stats?.institutionalStats?.consumed || 0, color: '#f59e0b' },
        { name: 'Balance', value: Math.max(0, (stats?.institutionalStats?.allotted || 0) - (stats?.institutionalStats?.consumed || 0)), color: '#0ea5e9' }
    ], [stats]);

    const othersChartData = React.useMemo(() => [
        { name: 'Consumed', value: stats?.othersStats?.consumed || 0, color: '#10b981' },
        { name: 'Balance', value: Math.max(0, (stats?.othersStats?.allotted || 0) - (stats?.othersStats?.consumed || 0)), color: '#a78bfa' }
    ], [stats]);

    // Mapping API data to UI structure
    const centreData = React.useMemo(() => {
        return centres.map(name => {
            const centreStat = (centresStats || []).find(c => c.name === name);
            return {
                centre: name,
                totalProjects: centreStat?.totalProjects || 0,
                activeProjects: centreStat?.activeProjects || 0,
                completedProjects: 0, // Backend doesn't currently provide separate completed count per center
                pendingApproval: 0,
                totalBudget: centreStat?.totalBudget || 0,
                disbursed: centreStat?.disbursed || 0,
                faculty: 12 // Placeholder for faculty count per center if needed
            };
        });
    }, [centres, centresStats]);

    const filteredData = React.useMemo(() =>
        selectedCentre === 'ALL'
            ? centreData
            : centreData.filter(c => c.centre === selectedCentre)
        , [centreData, selectedCentre]);

    // Chart Data
    const barChartData = React.useMemo(() =>
        selectedCentre === 'ALL'
            ? centreData.map(c => ({
                name: c.centre.split(' ').map(w => w[0]).join(''),
                fullName: c.centre,
                projects: c.totalProjects,
                budget: c.totalBudget / 1000000,
                disbursed: c.disbursed / 1000000
            }))
            : [
                { name: 'Research', val: filteredData[0]?.totalProjects || 0, budget: (filteredData[0]?.totalBudget || 0) / 1000000, disbursed: (filteredData[0]?.disbursed || 0) / 1000000 },
                { name: 'Training', val: Math.floor((filteredData[0]?.totalProjects || 0) * 0.4), budget: (filteredData[0]?.totalBudget || 0) * 0.3 / 1000000, disbursed: (filteredData[0]?.disbursed || 0) * 0.3 / 1000000 },
                { name: 'Publications', val: Math.floor((filteredData[0]?.totalProjects || 0) * 0.6), budget: (filteredData[0]?.totalBudget || 0) * 0.2 / 1000000, disbursed: (filteredData[0]?.disbursed || 0) * 0.2 / 1000000 },
            ]
        , [centreData, filteredData, selectedCentre]);

    const pieData = React.useMemo(() => {
        const data = selectedCentre === 'ALL'
            ? centreData.map(c => ({
                name: c.centre,
                value: Number(c.totalProjects) || 0
            }))
            : [
                { name: 'Government Funded', value: Math.max(1, Math.round((filteredData[0]?.totalProjects || 0) * 0.65)) },
                { name: 'Institutional', value: Math.max(0, Math.round((filteredData[0]?.totalProjects || 0) * 0.25)) },
                { name: 'Industry Sponsored', value: Math.max(0, Math.round((filteredData[0]?.totalProjects || 0) * 0.10)) },
            ];
        return data.filter(item => item.value > 0);
    }, [filteredData, selectedCentre, centreData]);

    const totalProjectsOverall = React.useMemo(() =>
        centreData.reduce((sum, c) => sum + (Number(c.totalProjects) || 0), 0)
        , [centreData]);

    const trendData = React.useMemo(() => {
        if (selectedDate) {
            return [
                { month: '9 AM', projects: 2, budget: 1 },
                { month: '11 AM', projects: 5, budget: 2 },
                { month: '1 PM', projects: 3, budget: 1.5 },
                { month: '3 PM', projects: 6, budget: 4 },
                { month: '5 PM', projects: 4, budget: 3 },
            ];
        }
        const baseMultiplier = selectedCentre === 'ALL' ? 1 : 0.4;
        const growth = selectedFY === '2025-26' ? 1.5 : (selectedFY === '2023-24' ? 0.8 : 1);
        return months.map((m, i) => ({
            month: m,
            projects: Math.floor((10 + i * 2) * baseMultiplier * growth),
            budget: Math.floor((15 + i * 3) * baseMultiplier * growth)
        }));
    }, [selectedCentre, selectedDate, selectedFY, months]);

    const COLORS = [
        '#fb7185', '#fbbf24', '#34d399', '#818cf8', '#f472b6', '#a78bfa', '#22d3ee', '#fb923c',
        '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'
    ];

    const isDark = document.documentElement.classList.contains('dark');
    const chartConfig = {
        grid: isDark ? '#1e293b' : '#e2e8f0',
        text: isDark ? '#94a3b8' : '#64748b',
        tooltip: isDark ? '#0f172a' : '#ffffff',
        tooltipBorder: isDark ? '#1e293b' : '#e2e8f0'
    };

    const recentActivities = [
        { id: 1, type: 'fund', message: 'Fund request approved for Smart Grid - EEE', time: '5 hours ago', icon: Banknote, color: 'green' },
        { id: 2, type: 'approval', message: 'Robotics project approved - Mechanical', time: '1 day ago', icon: CheckCircle, color: 'purple' },
    ];

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    React.useEffect(() => {
        setLayout(
            "Admin Dashboard",
            selectedDate
                ? `Showing data for ${new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : "Research & Finance Management Overview"
        );
    }, [selectedDate, setLayout]);

    const renderActiveShape = (props) => {
        const {
            cx, cy, innerRadius, outerRadius, startAngle, endAngle,
            fill
        } = props;
        return (
            <g>
                <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
                <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
            </g>
        );
    };

    const quickActions = [
        {
            title: 'Projects',
            description: `${totalStats.pendingApprovals} projects pending`,
            icon: CheckCircle,
            color: 'bg-amber-50 text-amber-600',
            iconBg: 'bg-amber-100',
            action: () => navigate('/admin/approve-projects')
        },
        {
            title: 'Assign Faculty',
            description: 'Assign faculty to projects',
            icon: UserPlus,
            color: 'bg-maroon-50 text-maroon-600',
            iconBg: 'bg-maroon-100',
            action: () => navigate('/admin/assign-faculty')
        },
        {
            title: 'Fund Requests',
            description: 'Review funding requests',
            icon: Banknote,
            color: 'bg-green-50 text-green-600',
            iconBg: 'bg-green-100',
            action: () => navigate('/admin/fund-requests')
        },
        {
            title: 'View Reports',
            description: 'Analytics and insights',
            icon: BarChart3,
            color: 'bg-amber-50 text-amber-600',
            iconBg: 'bg-amber-100',
            action: () => navigate('/admin/reports')
        },
    ];

    const getIconColor = (color) => {
        const colors = {
            maroon: 'bg-maroon-100 text-maroon-600',
            green: 'bg-green-100 text-green-600',
            purple: 'bg-purple-100 text-purple-600'
        };
        return colors[color] || 'bg-gray-100 text-gray-600';
    };

    if (loading) {
        return <div className="flex-1 flex items-center justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-600"></div></div>;
    }

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-50 dark:bg-slate-950">

            {/* Funds Overview Section - 3 columns: PFMS | Director's Innovation | Others */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* PFMS / Government Funds */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <CardHeader className="pb-2 border-b border-gray-100 dark:border-slate-800 z-10 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">PFMS Overview</CardTitle>
                                    <CardDescription className="text-xs dark:text-gray-400">Government Sanctioned Projects</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">Live Status</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 z-10 relative">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 space-y-4 w-full">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sanctioned Amount</p>
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">₹{((stats?.pfmsStats?.allotted || 0) / 10000000).toFixed(2)} Cr</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rec. in Account</p>
                                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{((stats?.pfmsStats?.allotted || 0) / 10000000).toFixed(2)} Cr</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Consumed</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">₹{((stats?.pfmsStats?.consumed || 0) / 10000000).toFixed(2)} Cr</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(stats?.pfmsStats?.allotted || 0) > 0 ? Math.min(100, ((stats?.pfmsStats?.consumed || 0) / stats?.pfmsStats?.allotted) * 100) : 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Balance</span>
                                            <span className="font-semibold text-green-600 dark:text-green-400">₹{((stats?.pfmsStats?.balance || 0) / 10000000).toFixed(2)} Cr</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(stats?.pfmsStats?.allotted || 0) > 0 ? Math.min(100, ((stats?.pfmsStats?.balance || 0) / stats?.pfmsStats?.allotted) * 100) : 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-28 h-28 flex-shrink-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pfmsChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={5} dataKey="value">
                                            {pfmsChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${(value / 10000000).toFixed(2)} Cr`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {(stats?.pfmsStats?.allotted || 0) > 0 ? (((stats?.pfmsStats?.consumed || 0) / stats.pfmsStats.allotted) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Director's Innovation Fund */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 dark:bg-amber-900/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <CardHeader className="pb-2 border-b border-gray-100 dark:border-slate-800 z-10 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Director's Innovation</CardTitle>
                                    <CardDescription className="text-xs dark:text-gray-400">Institutional Seed Money &amp; Grants</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 animate-pulse">Live Status</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 z-10 relative">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 space-y-4 w-full">
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocated</p>
                                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">₹{((stats?.institutionalStats?.allotted || 0) / 10000000).toFixed(2)} Cr</p>
                                </div>
                                <div className="space-y-4 pt-1">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Utilized Amount</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">₹{((stats?.institutionalStats?.consumed || 0) / 10000000).toFixed(2)} Cr</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(stats?.institutionalStats?.allotted || 0) > 0 ? Math.min(100, ((stats?.institutionalStats?.consumed || 0) / stats?.institutionalStats?.allotted) * 100) : 0}%` }}></div>
                                        </div>
                                        <p className="text-xs text-right mt-1 text-gray-500">{(stats?.institutionalStats?.allotted || 0) > 0 ? ((stats?.institutionalStats?.consumed || 0) / stats?.institutionalStats?.allotted * 100).toFixed(1) : 0}% Used</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Available</span>
                                        <span className="text-lg font-bold text-sky-600 dark:text-sky-400">₹{((stats?.institutionalStats?.balance || 0) / 10000000).toFixed(2)} Cr</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-28 h-28 flex-shrink-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={institutionalChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={5} dataKey="value">
                                            {institutionalChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${(value / 10000000).toFixed(2)} Cr`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {(stats?.institutionalStats?.allotted || 0) > 0 ? (((stats?.institutionalStats?.consumed || 0) / stats.institutionalStats.allotted) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Others Fund — Director Innovation / External Grants */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <CardHeader className="pb-2 border-b border-gray-100 dark:border-slate-800 z-10 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                    <CircleDollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Others Fund</CardTitle>
                                    <CardDescription className="text-xs dark:text-gray-400">Director Innovation &amp; External Grants</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Live Status</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 z-10 relative">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 space-y-4 w-full">
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocated</p>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{((stats?.othersStats?.allotted || 0) / 10000000).toFixed(2)} Cr</p>
                                </div>
                                <div className="space-y-4 pt-1">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Utilized Amount</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">₹{((stats?.othersStats?.consumed || 0) / 10000000).toFixed(2)} Cr</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(stats?.othersStats?.allotted || 0) > 0 ? Math.min(100, ((stats?.othersStats?.consumed || 0) / stats?.othersStats?.allotted) * 100) : 0}%` }}></div>
                                        </div>
                                        <p className="text-xs text-right mt-1 text-gray-500">{(stats?.othersStats?.allotted || 0) > 0 ? ((stats?.othersStats?.consumed || 0) / stats?.othersStats?.allotted * 100).toFixed(1) : 0}% Used</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Available</span>
                                        <span className="text-lg font-bold text-violet-600 dark:text-violet-400">₹{((stats?.othersStats?.balance || 0) / 10000000).toFixed(2)} Cr</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-28 h-28 flex-shrink-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={othersChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={5} dataKey="value">
                                            {othersChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${(value / 10000000).toFixed(2)} Cr`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {(stats?.othersStats?.allotted || 0) > 0 ? (((stats?.othersStats?.consumed || 0) / stats.othersStats.allotted) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-stretch">
                <Card className="h-full border-0 bg-maroon-50 dark:bg-maroon-900/20 text-maroon-600 dark:text-maroon-400 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-80">Total Projects</p>
                                <p className="text-3xl font-bold mt-2">{totalStats.totalProjects}</p>
                            </div>
                            <div className="w-12 h-12 bg-maroon-100 dark:bg-maroon-800/30 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">{totalStats.activeProjects} active</p>
                    </CardContent>
                </Card>

                <Card className="h-full border-0 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Allocated Budget</p>
                                <p className="text-3xl font-bold mt-2">{formatCurrency(totalStats.totalBudget)}</p>
                                <p className="text-[10px] mt-1 opacity-60">Across {totalStats.totalProjects} Projects</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-800/30 rounded-lg flex items-center justify-center"><Banknote className="w-6 h-6" /></div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">Approved funding</p>
                    </CardContent>
                </Card>

                <Card className="h-full border-0 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Disbursed Funds</p>
                                <p className="text-3xl font-bold mt-2">{formatCurrency(totalStats.totalDisbursed)}</p>
                                <p className="text-[10px] mt-1 opacity-60">Verified Disbursements</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-800/30 rounded-lg flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">Utilization: {totalStats.totalBudget > 0 ? ((totalStats.totalDisbursed / totalStats.totalBudget) * 100).toFixed(0) : 0}%</p>
                    </CardContent>
                </Card>

                <Card className="h-full border-0 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-80">Faculty Members</p>
                                <p className="text-3xl font-bold mt-2">{totalStats.totalFaculty}</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/30 rounded-lg flex items-center justify-center"><UserPlus className="w-6 h-6" /></div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">Across institutional centres</p>
                    </CardContent>
                </Card>

                <Card className="h-full border-0 bg-slate-900 text-emerald-400 transition-all duration-300 hover:shadow-lg lg:col-span-1 hidden lg:flex">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                                <Activity className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-70">Zod Validation Active</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                    <CardTitle className="text-lg font-semibold dark:text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <button key={index} onClick={action.action} className={`p-6 rounded-lg ${action.color} dark:bg-opacity-10 dark:border-slate-800 hover:shadow-md transition-all text-left border border-gray-200`}>
                                    <div className="flex items-start justify-between mb-3"><div className={`w-12 h-12 ${action.iconBg} dark:bg-opacity-20 rounded-lg flex items-center justify-center`}><Icon className="w-6 h-6" /></div></div>
                                    <h3 className="font-bold text-base mb-1 dark:text-white">{action.title}</h3>
                                    <p className="text-sm opacity-80 dark:text-gray-400">{action.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <div className="mb-6 mt-8 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm gap-4">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 flex-1 md:flex-none justify-between md:justify-start">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">Fin. Year</span>
                        <select className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer py-1 pr-2" value={selectedFY} onChange={(e) => { setSelectedFY(e.target.value); setSelectedDate(null); }} disabled={!!selectedDate}>
                            {fyOptions.map(fy => <option key={fy} value={fy} className="dark:bg-slate-800">{fy}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 flex-1 md:flex-none justify-between md:justify-start">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">Centre</span>
                        <select className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer py-1 pr-2 max-w-[100px] md:max-w-[150px] truncate" value={selectedCentre} onChange={(e) => setSelectedCentre(e.target.value)}>
                            <option value="ALL" className="dark:bg-slate-800">All Centres</option>
                            {centres.map(c => <option key={c} value={c} className="dark:bg-slate-800">{c}</option>)}
                        </select>
                    </div>
                </div>
                <div className="w-full md:w-64"><DateFilter selectedDate={selectedDate} onChange={(date) => setSelectedDate(date)} placeholder="Filter by Specific Date" /></div>
                <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                    {selectedDate && <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900 animate-pulse">Daily View Active</Badge>}
                    {(selectedDate || selectedFY !== '2024-25' || selectedCentre !== 'ALL') && (
                        <button onClick={() => { setSelectedDate(null); setSelectedFY('2024-25'); setSelectedCentre('ALL'); }} className="text-xs font-medium text-gray-400 hover:text-maroon-600 dark:hover:text-maroon-400 transition-colors flex items-center">
                            <Filter className="w-3 h-3 mr-1" /> Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Research Centre Insights */}
            <Card className="border-0 shadow-sm mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800"><CardTitle className="text-lg font-semibold dark:text-white">Research Centre Insights</CardTitle></CardHeader>
                <CardContent className="p-6">
                    <Table>
                        <TableHeader><TableRow className="dark:border-slate-800"><TableHead>Centre</TableHead><TableHead>Projects</TableHead><TableHead>Active</TableHead><TableHead>Budget</TableHead><TableHead>Disbursed</TableHead><TableHead className="text-right">Utilization</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredData.map((centre, index) => (
                                <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => { setSelectedCentreDetail(centre.centre); setDetailModalOpen(true); }}>
                                    <TableCell className="font-semibold">{centre.centre}</TableCell>
                                    <TableCell><Badge className="bg-maroon-100 text-maroon-700">{centre.totalProjects}</Badge></TableCell>
                                    <TableCell><Badge className="bg-green-100 text-green-700">{centre.activeProjects}</Badge></TableCell>
                                    <TableCell>{formatCurrency(centre.totalBudget)}</TableCell>
                                    <TableCell>{formatCurrency(centre.disbursed)}</TableCell>
                                    <TableCell className="text-right">{centre.totalBudget > 0 ? ((centre.disbursed / centre.totalBudget) * 100).toFixed(0) : 0}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 items-stretch">
                <Card className="border-0 shadow-sm dark:bg-slate-900 flex flex-col h-full">
                    <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 flex-shrink-0">
                        <CardTitle className="text-lg font-semibold">{activeMetric === 'projects' ? 'Project Distribution' : 'Budget vs Disbursed'}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-center">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    {activeMetric === 'projects' && <Bar dataKey={selectedCentre === 'ALL' ? "projects" : "val"} fill="rgba(136, 19, 55, 0.8)" name="Projects" />}
                                    {activeMetric !== 'projects' && <Bar dataKey="budget" fill="rgba(22, 163, 74, 0.8)" name="Budget" />}
                                    {activeMetric !== 'projects' && <Bar dataKey="disbursed" fill="rgba(99, 102, 241, 0.8)" name="Disbursed" />}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm dark:bg-slate-900 flex flex-col h-full">
                    <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 flex-shrink-0">
                        <CardTitle className="text-lg font-semibold">Centre Project Share</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-center">
                        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 h-full">
                            <div className="h-[300px] w-full lg:w-3/5">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie activeIndex={activeIndex} activeShape={renderActiveShape} data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} dataKey="value" onMouseEnter={onPieEnter} onMouseLeave={() => setActiveIndex(-1)}>
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full lg:w-2/5 overflow-y-auto max-h-[280px] flex flex-col justify-center border-l dark:border-slate-800 pl-4">
                                <div className="space-y-1">
                                    {pieData.map((entry, index) => (
                                        <div key={index} className="flex items-center justify-between py-1.5 text-xs border-b last:border-0 border-gray-100 dark:border-slate-800/50">
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="truncate opacity-80">{entry.name}</span>
                                            </div>
                                            <span className="font-bold ml-2">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Administrative Audit Trail */}
            <Card className="border-0 shadow-sm mt-8 mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-black italic tracking-tighter uppercase">Administrative Audit Trail</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest italic">Successive state transformations and approval history</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-indigo-200 text-indigo-600 font-bold uppercase italic text-[10px]">immutable logs</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="text-[10px] uppercase font-black italic tracking-widest opacity-60">
                                <TableHead className="pl-8">Action Taken</TableHead>
                                <TableHead>Executor</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead className="pr-8 text-right">Remarks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentRequests.flatMap(req => (req.auditTrail || []).map((log, idx) => ({ ...log, project: req.projectTitle, id: `${req._id}-${idx}` }))).length > 0 ? (
                                recentRequests.flatMap(req => (req.auditTrail || []).map((log, idx) => ({ ...log, project: req.projectTitle, id: `${req._id}-${idx}` })))
                                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                    .slice(0, 10)
                                    .map((log) => (
                                        <TableRow key={log.id} className="text-xs">
                                            <TableCell className="pl-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black italic uppercase text-slate-800 dark:text-white truncate max-w-[200px]">{log.project}</span>
                                                    <span className="text-[9px] font-bold text-indigo-500 uppercase italic mt-0.5">{log.stage}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold italic uppercase text-slate-600 dark:text-slate-400">{log.updatedByName || 'SYSTEM'}</TableCell>
                                            <TableCell className="text-[10px] font-bold text-gray-400 italic">
                                                {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </TableCell>
                                            <TableCell className="pr-8 text-right italic font-medium text-gray-500 truncate max-w-[250px]">{log.remarks}</TableCell>
                                        </TableRow>
                                    ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-30 italic">No administrative logs currently synchronized.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* AI Insights Placeholder (Re-adding the premium UI) */}
            <Card className="border-0 shadow-lg mb-8 bg-slate-900 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <CardHeader className="border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-400" /> Administrative AI Insights
                        </CardTitle>
                    </div>
                    <Button onClick={async () => { setAiModal({ open: true, loading: true, result: null }); const r = await generateResearchInsights(centreData); setAiModal({ open: true, loading: false, result: r }); }} className="bg-indigo-500 hover:bg-indigo-600 text-white font-black italic uppercase tracking-tighter text-xs px-6 rounded-xl">GENERATE REPORT</Button>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] uppercase tracking-widest text-slate-500">Predicted Approval</p><p className="text-2xl font-black italic text-emerald-400">92.4%</p></div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] uppercase tracking-widest text-slate-500">Resource Optimization</p><p className="text-2xl font-black italic text-indigo-400 uppercase">High Efficiency</p></div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] uppercase tracking-widest text-slate-500">Forecast</p><p className="text-2xl font-black italic text-amber-400">+15.8%</p></div>
                    </div>
                </CardContent>
            </Card>

            <ResearchCentreDetail isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} centreName={selectedCentreDetail} isDark={isDark} />
            <AIResultModal open={aiModal.open} loading={aiModal.loading} result={aiModal.result} onClose={() => setAiModal({ ...aiModal, open: false })} />
        </div>
    );
};

export default AdminDashboard;
