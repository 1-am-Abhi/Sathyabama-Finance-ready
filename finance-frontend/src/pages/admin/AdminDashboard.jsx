import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import {
    FileText, Banknote, CheckCircle, Clock, TrendingUp, AlertCircle,
    UserPlus, BarChart3, Filter, ArrowRight, Wallet, Building2
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import DateFilter from '../../components/shared/DateFilter';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Sector
} from 'recharts';
import { RESEARCH_CENTRES } from '../../constants/researchCentres';

const AdminDashboard = () => {
    const { setLayout } = useLayout();
    const navigate = useNavigate();
    const [activeMetric, setActiveMetric] = useState('projects'); // 'projects' | 'budget' | 'disbursed'
    const [selectedCentre, setSelectedCentre] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedFY, setSelectedFY] = useState('2024-25');
    const [activeIndex, setActiveIndex] = useState(-1);

    const centres = RESEARCH_CENTRES;

    const fyOptions = ['2023-24', '2024-25', '2025-26'];

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Mock data for project statistics - ensure this covers all centres in RESEARCH_CENTRES
    const CENTRE_STATS_MOCK = {
        'Centre for Nano Science and Nanotechnology': { total: 12, active: 8, completed: 3, budget: 35, disbursed: 25, faculty: 15 },
        'Centre of Excellence for Energy Research': { total: 10, active: 7, completed: 2, budget: 28, disbursed: 20, faculty: 12 },
        'Centre for Waste Management': { total: 8, active: 5, completed: 2, budget: 22, disbursed: 16, faculty: 10 },
        'Centre for Climate Studies': { total: 10, active: 6, completed: 3, budget: 25, disbursed: 18, faculty: 11 },
        'Centre for Molecular and Nanomedical Sciences': { total: 7, active: 4, completed: 2, budget: 20, disbursed: 14, faculty: 8 },
        'Centre for Drug Discovery and Development': { total: 8, active: 5, completed: 2, budget: 17, disbursed: 12, faculty: 9 },
        'Centre of Excellence for Additive Manufacturing': { total: 6, active: 4, completed: 1, budget: 15, disbursed: 10, faculty: 7 },
        'Centre for Indian System of Medicine': { total: 5, active: 3, completed: 1, budget: 13, disbursed: 9, faculty: 6 },
        'Centre for Advanced Communication Systems': { total: 9, active: 6, completed: 2, budget: 19, disbursed: 13, faculty: 10 },
        'Centre for Automation and Robotics': { total: 11, active: 8, completed: 2, budget: 24, disbursed: 17, faculty: 12 },
        'Centre for Bio-resource Management': { total: 7, active: 5, completed: 1, budget: 16, disbursed: 11, faculty: 8 },
        'Centre for Data Science and AI': { total: 14, active: 10, completed: 3, budget: 29, disbursed: 21, faculty: 14 }
    };

    // Mock Data for Fund Overview
    const FUNDING_STATS = {
        pfms: {
            sanctioned: 50000000, // 5 Cr
            received: 35000000,   // 3.5 Cr
            consumed: 21000000,   // 2.1 Cr
            balance: 14000000     // 1.4 Cr
        },
        institutional: {
            allocated: 20000000,  // 2 Cr
            utilized: 12000000,   // 1.2 Cr
            balance: 8000000      // 0.8 Cr
        }
    };

    const pfmsChartData = [
        { name: 'Consumed', value: FUNDING_STATS.pfms.consumed, color: '#6366f1' }, // Indigo
        { name: 'Balance', value: FUNDING_STATS.pfms.balance, color: '#22c55e' }    // Green
    ];

    const institutionalChartData = [
        { name: 'Utilized', value: FUNDING_STATS.institutional.utilized, color: '#f59e0b' }, // Amber
        { name: 'Balance', value: FUNDING_STATS.institutional.balance, color: '#0ea5e9' }    // Sky
    ];

    // Single source of truth: Map RESEARCH_CENTRES to their stats
    const centreData = React.useMemo(() => centres.map(name => {
        let stats = CENTRE_STATS_MOCK[name] || { total: 0, active: 0, completed: 0, budget: 0, disbursed: 0, faculty: 0 };

        if (selectedDate) {
            stats = {
                total: Math.max(1, Math.floor(stats.total * 0.1)),
                active: Math.max(1, Math.floor(stats.active * 0.1)),
                completed: 0,
                budget: stats.budget * 0.05,
                disbursed: stats.disbursed * 0.02,
                faculty: stats.faculty
            };
        }
        else if (selectedFY !== '2024-25') {
            const factor = selectedFY === '2025-26' ? 1.2 : 0.8;
            stats = {
                total: Math.floor(stats.total * factor),
                active: Math.floor(stats.active * factor),
                completed: Math.floor(stats.completed * factor),
                budget: stats.budget * factor,
                disbursed: stats.disbursed * factor,
                faculty: stats.faculty
            };
        }

        return {
            centre: name,
            totalProjects: stats.total,
            activeProjects: stats.active,
            completedProjects: stats.completed,
            pendingApproval: Math.max(0, stats.total - stats.active - stats.completed),
            totalBudget: stats.budget * 1000000,
            disbursed: stats.disbursed * 1000000,
            faculty: stats.faculty
        };
    }), [centres, selectedDate, selectedFY]);

    const filteredData = selectedCentre === 'ALL'
        ? centreData
        : centreData.filter(c => c.centre === selectedCentre);

    const totalStats = {
        totalProjects: centreData.reduce((sum, c) => sum + c.totalProjects, 0),
        activeProjects: centreData.reduce((sum, c) => sum + c.activeProjects, 0),
        pendingApprovals: centreData.reduce((sum, c) => sum + c.pendingApproval, 0),
        totalBudget: centreData.reduce((sum, c) => sum + c.totalBudget, 0),
        totalDisbursed: centreData.reduce((sum, c) => sum + c.disbursed, 0),
        totalFaculty: centreData.reduce((sum, c) => sum + c.faculty, 0),
    };

    // Chart Data
    const barChartData = selectedCentre === 'ALL'
        ? centreData.map(c => ({
            name: c.centre.split(' ').map(w => w[0]).join(''),
            fullName: c.centre,
            projects: c.totalProjects,
            budget: c.totalBudget / 1000000,
            disbursed: c.disbursed / 1000000
        }))
        : [
            { name: 'Research', val: filteredData[0].totalProjects, budget: filteredData[0].totalBudget / 1000000, disbursed: filteredData[0].disbursed / 1000000 },
            { name: 'Training', val: Math.floor(filteredData[0].totalProjects * 0.4), budget: filteredData[0].totalBudget * 0.3 / 1000000, disbursed: filteredData[0].disbursed * 0.3 / 1000000 },
            { name: 'Publications', val: Math.floor(filteredData[0].totalProjects * 0.6), budget: filteredData[0].totalBudget * 0.2 / 1000000, disbursed: filteredData[0].disbursed * 0.2 / 1000000 },
        ];

    const pieData = React.useMemo(() => selectedCentre === 'ALL'
        ? centreData.map(c => ({
            name: c.centre,
            value: Number(c.totalProjects) || 0
        }))
        : [
            { name: 'Government Funded', value: Math.max(1, Math.round((filteredData[0]?.totalProjects || 0) * 0.65)) },
            { name: 'Institutional', value: Math.max(0, Math.round((filteredData[0]?.totalProjects || 0) * 0.25)) },
            { name: 'Industry Sponsored', value: Math.max(0, Math.round((filteredData[0]?.totalProjects || 0) * 0.10)) },
        ], [filteredData, selectedCentre]);

    const totalProjectsCurrentView = React.useMemo(() =>
        pieData.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)
        , [pieData]);

    const trendData = React.useMemo(() => {
        if (selectedDate) {
            // Hourly breakdown
            return [
                { month: '9 AM', projects: 2, budget: 1 },
                { month: '11 AM', projects: 5, budget: 2 },
                { month: '1 PM', projects: 3, budget: 1.5 },
                { month: '3 PM', projects: 6, budget: 4 },
                { month: '5 PM', projects: 4, budget: 3 },
            ];
        }

        // Monthly breakdown - Always Jan-Dec
        const baseMultiplier = selectedCentre === 'ALL' ? 1 : 0.4;
        const growth = selectedFY === '2025-26' ? 1.5 : (selectedFY === '2023-24' ? 0.8 : 1);

        return months.map((m, i) => ({
            month: m,
            projects: Math.floor((10 + i * 2) * baseMultiplier * growth),
            budget: Math.floor((15 + i * 3) * baseMultiplier * growth)
        }));
    }, [selectedCentre, selectedDate, selectedFY]);

    const totalProjectsOverall = React.useMemo(() =>
        centreData.reduce((sum, c) => sum + (Number(c.totalProjects) || 0), 0)
        , [centreData]);

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
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 10}
                    fill={fill}
                />
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

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">

            {/* Funds Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                                Live Status
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 z-10 relative">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Metrics */}
                            <div className="flex-1 space-y-4 w-full">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sanctioned Amount</p>
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">₹{(FUNDING_STATS.pfms.sanctioned / 10000000).toFixed(2)} Cr</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rec. in Account</p>
                                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{(FUNDING_STATS.pfms.received / 10000000).toFixed(2)} Cr</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Consumed</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">₹{(FUNDING_STATS.pfms.consumed / 10000000).toFixed(2)} Cr</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(FUNDING_STATS.pfms.consumed / FUNDING_STATS.pfms.received) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Balance</span>
                                            <span className="font-semibold text-green-600 dark:text-green-400">₹{(FUNDING_STATS.pfms.balance / 10000000).toFixed(2)} Cr</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(FUNDING_STATS.pfms.balance / FUNDING_STATS.pfms.received) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="w-32 h-32 flex-shrink-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pfmsChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={55}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pfmsChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => `₹${(value / 10000000).toFixed(2)} Cr`}
                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{((FUNDING_STATS.pfms.consumed / FUNDING_STATS.pfms.received) * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Institutional Funds */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 dark:bg-amber-900/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <CardHeader className="pb-2 border-b border-gray-100 dark:border-slate-800 z-10 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Director's Innovation Fund</CardTitle>
                                    <CardDescription className="text-xs dark:text-gray-400">Institutional Seed Money & Grants</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                FY 2024-25
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 z-10 relative">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Metrics */}
                            <div className="flex-1 space-y-4 w-full">
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocated</p>
                                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">₹{(FUNDING_STATS.institutional.allocated / 10000000).toFixed(2)} Cr</p>
                                </div>

                                <div className="space-y-4 pt-1">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300">Utilized Amount</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">₹{(FUNDING_STATS.institutional.utilized / 10000000).toFixed(2)} Cr</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(FUNDING_STATS.institutional.utilized / FUNDING_STATS.institutional.allocated) * 100}%` }}></div>
                                        </div>
                                        <p className="text-xs text-right mt-1 text-gray-500">{((FUNDING_STATS.institutional.utilized / FUNDING_STATS.institutional.allocated) * 100).toFixed(1)}% Used</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Available</span>
                                        <span className="text-lg font-bold text-sky-600 dark:text-sky-400">₹{(FUNDING_STATS.institutional.balance / 10000000).toFixed(2)} Cr</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="w-32 h-32 flex-shrink-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={institutionalChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={55}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {institutionalChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => `₹${(value / 10000000).toFixed(2)} Cr`}
                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{((FUNDING_STATS.institutional.utilized / FUNDING_STATS.institutional.allocated) * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards - One Single Line on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-stretch">
                {/* Total Projects - Clickable */}
                <Card
                    className={`h-full border-0 bg-maroon-50 dark:bg-maroon-900/20 text-maroon-600 dark:text-maroon-400 transition-all duration-300 hover:shadow-lg cursor-pointer ${activeMetric === 'projects' ? 'ring-2 ring-maroon-500 scale-[1.02]' : ''}`}
                    onClick={() => setActiveMetric('projects')}
                >
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-80">Total Projects</p>
                                <p className="text-3xl font-bold mt-2">{totalStats.totalProjects}</p>
                            </div>
                            <div className="w-12 h-12 bg-maroon-100 dark:bg-maroon-800/30 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">{totalStats.activeProjects} active</p>
                    </CardContent>
                </Card>

                {/* Total Budget - Clickable */}
                <Card
                    className={`h-full border-0 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 transition-all duration-300 hover:shadow-lg cursor-pointer ${activeMetric === 'budget' ? 'ring-2 ring-green-500 scale-[1.02]' : ''}`}
                    onClick={() => setActiveMetric('budget')}
                >
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-80">Total Budget</p>
                                <p className="text-3xl font-bold mt-2">₹{(totalStats.totalBudget / 10000000).toFixed(1)}Cr</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-800/30 rounded-lg flex items-center justify-center">
                                <Banknote className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">Approved funding</p>
                    </CardContent>
                </Card>

                {/* Total Disbursed - Clickable */}
                <Card
                    className={`h-full border-0 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-all duration-300 hover:shadow-lg cursor-pointer ${activeMetric === 'disbursed' ? 'ring-2 ring-indigo-500 scale-[1.02]' : ''}`}
                    onClick={() => setActiveMetric('disbursed')}
                >
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-80">Total Disbursed</p>
                                <p className="text-3xl font-bold mt-2">₹{(totalStats.totalDisbursed / 10000000).toFixed(1)}Cr</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-800/30 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">Utilization: {((totalStats.totalDisbursed / totalStats.totalBudget) * 100).toFixed(0)}%</p>
                    </CardContent>
                </Card>

                {/* Faculty Members - Passive */}
                <Card className="h-full border-0 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-80">Faculty Members</p>
                                <p className="text-3xl font-bold mt-2">{totalStats.totalFaculty}</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/30 rounded-lg flex items-center justify-center">
                                <UserPlus className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs mt-4 opacity-70">Across {filteredData.length} centres</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions - Preserved */}
            <Card className="border-0 shadow-sm mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                    <CardTitle className="text-lg font-semibold dark:text-white">Quick Actions</CardTitle>
                    <CardDescription className="dark:text-gray-400">Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={action.action}
                                    className={`p-6 rounded-lg ${action.color} dark:bg-opacity-10 dark:border-slate-800 hover:shadow-md transition-all text-left border border-gray-200`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`w-12 h-12 ${action.iconBg} dark:bg-opacity-20 rounded-lg flex items-center justify-center`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-base mb-1 dark:text-white">{action.title}</h3>
                                    <p className="text-sm opacity-80 dark:text-gray-400">{action.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>


            {/* Dashboard Filter Bar - Moved Below Stats */}
            <div className="mb-6 mt-8 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm gap-4">
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">Fin. Year</span>
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer py-1 pr-2"
                            value={selectedFY}
                            onChange={(e) => {
                                setSelectedFY(e.target.value);
                                setSelectedDate(null);
                            }}
                            disabled={!!selectedDate}
                        >
                            {fyOptions.map(fy => (
                                <option key={fy} value={fy} className="dark:bg-slate-800">{fy}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">Centre</span>
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer py-1 pr-2 max-w-[150px] truncate"
                            value={selectedCentre}
                            onChange={(e) => setSelectedCentre(e.target.value)}
                        >
                            <option value="ALL" className="dark:bg-slate-800">All Centres</option>
                            {centres.map(c => (
                                <option key={c} value={c} className="dark:bg-slate-800">{c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">Month</span>
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer py-1 pr-2"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="ALL" className="dark:bg-slate-800">All Months</option>
                            {months.map(m => (
                                <option key={m} value={m} className="dark:bg-slate-800">{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                <div className="w-full md:w-64">
                    <DateFilter
                        selectedDate={selectedDate}
                        onChange={(date) => {
                            setSelectedDate(date);
                        }}
                        placeholder="Filter by Specific Date"
                    />
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                    {selectedDate && (
                        <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900 animate-pulse">
                            Daily View Active
                        </Badge>
                    )}
                    {(selectedDate || selectedFY !== '2024-25' || selectedCentre !== 'ALL' || selectedMonth !== 'ALL') && (
                        <button
                            onClick={() => {
                                setSelectedDate(null);
                                setSelectedFY('2024-25');
                                setSelectedCentre('ALL');
                                setSelectedMonth('ALL');
                            }}
                            className="text-xs font-medium text-gray-400 hover:text-maroon-600 dark:hover:text-maroon-400 transition-colors flex items-center"
                        >
                            <Filter className="w-3 h-3 mr-1" />
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            <Card className="border-0 shadow-sm mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold dark:text-white">Research Centre Insights</CardTitle>
                            <CardDescription className="dark:text-gray-400">Data visualization and tabular view for research centres</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-800">
                                <TableHead className="dark:text-gray-400">Research Centre</TableHead>
                                <TableHead className="dark:text-gray-400">Total Projects</TableHead>
                                <TableHead className="dark:text-gray-400">Active</TableHead>
                                <TableHead className="dark:text-gray-400">Completed</TableHead>
                                <TableHead className="dark:text-gray-400">Pending</TableHead>
                                <TableHead className="dark:text-gray-400">Budget</TableHead>
                                <TableHead className="dark:text-gray-400">Disbursed</TableHead>
                                <TableHead className="dark:text-gray-400">Faculty</TableHead>
                                <TableHead className="text-right dark:text-gray-400">Utilization</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((centre, index) => (
                                <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                                    <TableCell className="font-semibold dark:text-gray-200">{centre.centre}</TableCell>
                                    <TableCell>
                                        <Badge variant="default" className="bg-maroon-100 dark:bg-maroon-900/30 text-maroon-700 dark:text-maroon-400 border-0">
                                            {centre.totalProjects}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="success" className="dark:bg-green-900/30 dark:text-green-400 border-0">{centre.activeProjects}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-0">{centre.completedProjects}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="warning" className="dark:bg-amber-900/30 dark:text-amber-400 border-0">{centre.pendingApproval}</Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-green-600 dark:text-green-400">
                                        ₹{(centre.totalBudget / 10000000).toFixed(1)}Cr
                                    </TableCell>
                                    <TableCell className="font-semibold dark:text-gray-300">
                                        ₹{(centre.disbursed / 10000000).toFixed(1)}Cr
                                    </TableCell>
                                    <TableCell className="dark:text-gray-300">{centre.faculty}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-br from-amber-500 to-maroon-600 h-2 rounded-full shadow-sm"
                                                    style={{ width: `${(centre.disbursed / centre.totalBudget) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold dark:text-gray-300">
                                                {((centre.disbursed / centre.totalBudget) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Charts Section - Now below the table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Department Comparison Bar Chart - DYNAMIC BASED ON ACTIVE METRIC */}
                <Card className="border-0 shadow-sm dark:bg-slate-900">
                    <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                        <CardTitle className="text-lg font-semibold dark:text-white">
                            {activeMetric === 'projects' ? 'Project Distribution' :
                                activeMetric === 'budget' ? 'Budget Allocation' :
                                    'Funds Disbursed'}
                        </CardTitle>
                        <CardDescription className="dark:text-gray-400">
                            {selectedCentre === 'ALL' ? `Comparison by Centre (${activeMetric})` : `${selectedCentre} Analysis`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
                                    <XAxis dataKey="name" stroke={chartConfig.text} fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke={chartConfig.text} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: chartConfig.tooltip,
                                            border: `1px solid ${chartConfig.tooltipBorder}`,
                                            borderRadius: '8px'
                                        }}
                                        itemStyle={{ fontSize: '12px', color: isDark ? '#f8fafc' : '#0f172a' }}
                                        labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                                    {/* Dynamic Bar Rendering */}
                                    {activeMetric === 'projects' && (
                                        <Bar dataKey={selectedCentre === 'ALL' ? "projects" : "val"} fill="#881337" radius={[4, 4, 0, 0]} name="Projects" />
                                    )}
                                    {activeMetric === 'budget' && (
                                        <Bar dataKey="budget" fill="#16a34a" radius={[4, 4, 0, 0]} name="Budget (M)" />
                                    )}
                                    {activeMetric === 'disbursed' && (
                                        <Bar dataKey="disbursed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Disbursed (M)" />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Project Distribution Donut Chart */}
                <Card className="border-0 shadow-sm dark:bg-slate-900">
                    <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                        <CardTitle className="text-lg font-semibold dark:text-white">
                            {selectedCentre === 'ALL' ? 'Centre Distribution' : 'Internal Funding Source'}
                        </CardTitle>
                        <CardDescription className="dark:text-gray-400">
                            {selectedCentre === 'ALL' ? 'Project share across research centres' : 'Funding distribution for this centre'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row items-center gap-4">
                            <div className="h-[300px] w-full lg:w-2/3">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            activeIndex={activeIndex}
                                            activeShape={renderActiveShape}
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke={isDark ? '#0f172a' : '#fff'}
                                            strokeWidth={2}
                                            onMouseEnter={onPieEnter}
                                            onMouseLeave={() => setActiveIndex(-1)}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                    opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.6}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl min-w-[200px]">
                                                            <p className="text-sm font-bold dark:text-white mb-2 leading-tight">{data.name}</p>
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-slate-500 dark:text-gray-400">Total Projects:</span>
                                                                    <span className="font-mono font-bold dark:text-slate-200">{data.value}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-slate-500 dark:text-gray-400">Project Share:</span>
                                                                    <span className="font-mono font-bold text-blue-500">
                                                                        {totalProjectsOverall > 0
                                                                            ? Math.round((Number(data.value) / totalProjectsOverall) * 100)
                                                                            : 0}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Custom Scrollable Legend */}
                            <div className="w-full lg:w-1/3 flex flex-col h-[280px]">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Research Centres</div>
                                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                    {pieData.map((entry, index) => (
                                        <div
                                            key={`legend-${index}`}
                                            className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors duration-200 
                                                            ${activeIndex === index ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onMouseLeave={() => setActiveIndex(-1)}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                            <span className={`text-[11px] font-medium truncate flex-1
                                                            ${isDark ? 'text-slate-300' : 'text-slate-600'}
                                                            ${activeIndex === index ? 'text-blue-500 dark:text-blue-400' : ''}`}
                                                title={entry.name}
                                            >
                                                {entry.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {entry.value}
                                            </span>
                                            <span className="text-[9px] text-slate-500 ml-1">
                                                ({totalProjectsOverall > 0 ? Math.round((Number(entry.value) / totalProjectsOverall) * 100) : 0}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Trend Analysis Line Chart */}
            <Card className="border-0 shadow-sm mb-8 dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                    <CardTitle className="text-lg font-semibold dark:text-white">
                        {selectedDate ? 'Hourly Activity Trend' : (selectedCentre === 'ALL' ? 'Institutional Growth Trend' : `${selectedCentre} Growth`)}
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                        {selectedDate ? 'Project and budget updates throughout the day' : `Monthly evolution for ${selectedFY}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
                                <XAxis dataKey="month" stroke={chartConfig.text} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={chartConfig.text} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: chartConfig.tooltip,
                                        border: `1px solid ${chartConfig.tooltipBorder}`,
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a', fontSize: '12px' }}
                                    labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="projects" stroke="#881337" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Current Projects" />
                                <Line type="monotone" dataKey="budget" stroke="#d97706" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Funding (M)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card className="border-0 shadow-sm dark:bg-slate-900">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                    <CardTitle className="text-lg font-semibold dark:text-white">Recent Activities</CardTitle>
                    <CardDescription className="dark:text-gray-400">Latest updates across departments</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-3">
                        {recentActivities.map((activity) => {
                            const Icon = activity.icon;
                            return (
                                <div key={activity.id} className="flex items-start space-x-4 p-4 bg-white dark:bg-slate-800/30 rounded-lg border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(activity.color)} dark:bg-opacity-20`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.message}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminDashboard;
