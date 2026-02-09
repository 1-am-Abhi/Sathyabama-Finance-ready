import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    BarChart3, Download, FileText, TrendingUp, Users,
    PieChart as PieIcon, Activity, Banknote, Wallet, ArrowUpRight,
    FileSpreadsheet, Filter, Search
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import DateFilter from '../../components/shared/DateFilter';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { AGENCIES } from '../../constants/agencies';
import { FUND_SOURCES } from '../../constants/fundSources';

const AdminReports = () => {
    const { setLayout } = useLayout();
    const [selectedReport, setSelectedReport] = useState('overview');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedAgency, setSelectedAgency] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedSource, setSelectedSource] = useState('All');

    useEffect(() => {
        setLayout(
            "Reports & Analytics",
            selectedDate ? `Data for ${new Date(selectedDate).toLocaleDateString()}` : "Comprehensive overview of research and finance data"
        );
    }, [selectedDate, setLayout]);

    // --- Mock Data Constants ---

    // Global Stats (Simulating "Overview")
    const overviewStats = {
        totalProjects: selectedDate ? 5 : 45,
        totalBudget: selectedDate ? 15000000 : 125000000,
        totalFaculty: 35
    };

    // Project Stats
    const projectStats = {
        total: selectedDate ? 5 : 45,
        active: selectedDate ? 3 : 28,
        pending: selectedDate ? 1 : 7
    };

    // Finance Stats
    const financeStats = {
        totalBudget: selectedDate ? 15000000 : 125000000,
        disbursed: selectedDate ? 5000000 : 87500000,
        pending: selectedDate ? 10000000 : 37500000
    };

    // Faculty Stats
    const facultyStats = {
        total: 35,
        active: 28,
        assigned: 20
    };

    const projectsByCentre = [
        { centre: 'Centre for Nano Science and Nanotechnology', projects: selectedDate ? 1 : 12, budget: selectedDate ? 3500000 : 35000000, disbursed: 24500000 },
        { centre: 'Centre of Excellence for Energy Research', projects: selectedDate ? 1 : 8, budget: selectedDate ? 2800000 : 28000000, disbursed: 19600000 },
        { centre: 'Centre for Waste Management', projects: selectedDate ? 1 : 10, budget: selectedDate ? 2500000 : 25000000, disbursed: 17500000 },
        { centre: 'Centre for Climate Studies', projects: selectedDate ? 1 : 7, budget: selectedDate ? 2000000 : 20000000, disbursed: 14000000 },
        { centre: 'Centre for Molecular and Nanomedical Sciences', projects: selectedDate ? 1 : 8, budget: selectedDate ? 1700000 : 17000000, disbursed: 11900000 },
    ];

    const recentProjectsData = [
        {
            id: 1, title: 'AI Medical Diagnosis', faculty: 'Dr. Priya Sharma', budget: 5000000, status: 'ACTIVE', progress: 65, date: '2024-02-01',
            installments: [
                { id: 1, amount: 2000000, date: '2024-02-05', status: 'Released' },
                { id: 2, amount: 1500000, date: '2024-06-10', status: 'Pending' },
                { id: 3, amount: 1500000, date: '2024-10-15', status: 'Scheduled' }
            ]
        },
        {
            id: 2, title: 'Smart Traffic System', faculty: 'Dr. Vikram Singh', budget: 6000000, status: 'ACTIVE', progress: 45, date: '2024-01-28',
            installments: [
                { id: 1, amount: 3000000, date: '2024-02-01', status: 'Released' },
                { id: 2, amount: 3000000, date: '2024-07-01', status: 'Pending' }
            ]
        },
        {
            id: 3, title: 'Renewable Energy Grid', faculty: 'Dr. Bharti', budget: 7500000, status: 'ACTIVE', progress: 30, date: '2024-02-03',
            installments: [
                { id: 1, amount: 2500000, date: '2024-02-10', status: 'Released' },
                { id: 2, amount: 2500000, date: '2024-08-10', status: 'Pending' },
                { id: 3, amount: 2500000, date: '2025-02-10', status: 'Scheduled' }
            ]
        },
        {
            id: 4, title: 'Blockchain Supply Chain', faculty: 'Dr. Anita Desai', budget: 4000000, status: 'PENDING', progress: 10, date: '2024-02-02',
            installments: []
        },
        {
            id: 5, title: 'Nano-Sensors for Agri', faculty: 'Dr. R. Kumar', budget: 3500000, status: 'REJECTED', progress: 0, date: '2024-01-15',
            installments: []
        },
    ];

    const facultyMockData = [
        { id: 1, name: 'Dr. Priya Sharma', centre: 'Centre for Nano Science', projects: 2, grants: 8500000 },
        { id: 2, name: 'Dr. Vikram Singh', centre: 'Centre for Energy Research', projects: 1, grants: 6000000 },
        { id: 3, name: 'Dr. Bharti', centre: 'Centre for Climate Studies', projects: 3, grants: 7500000 },
        { id: 4, name: 'Dr. Anita Desai', centre: 'Centre for Molecular Sciences', projects: 1, grants: 4000000 },
        { id: 5, name: 'Dr. R. Kumar', centre: 'Centre for Waste Management', projects: 2, grants: 5500000 },
    ];

    const recentProjects = selectedDate
        ? recentProjectsData.filter(p => p.date === selectedDate)
        : recentProjectsData;

    // --- Chart Data ---

    // 1. Trend Data (Overview & Finance) - Full Year Cycle
    const trendData = [
        { name: 'Jan', projects: 10, funding: 35000000, disbursed: 20000000 },
        { name: 'Feb', projects: 15, funding: 42000000, disbursed: 25000000 },
        { name: 'Mar', projects: 8, funding: 28000000, disbursed: 15000000 },
        { name: 'Apr', projects: 12, funding: 32000000, disbursed: 22000000 },
        { name: 'May', projects: 20, funding: 55000000, disbursed: 40000000 },
        { name: 'Jun', projects: 18, funding: 48000000, disbursed: 35000000 },
        { name: 'Jul', projects: 25, funding: 60000000, disbursed: 50000000 },
        { name: 'Aug', projects: 12, funding: 45000000, disbursed: 30000000 },
        { name: 'Sep', projects: 19, funding: 62000000, disbursed: 45000000 },
        { name: 'Oct', projects: 15, funding: 58000000, disbursed: 40000000 },
        { name: 'Nov', projects: 22, funding: 85000000, disbursed: 60000000 },
        { name: 'Dec', projects: 28, funding: 92000000, disbursed: 65000000 },
    ];

    // 2. Centre Data (Projects & Faculty)
    const centrePerformanceData = projectsByCentre.map(c => ({
        name: c.centre.split(' ').reduce((acc, word) => acc + (word[0] || ''), '').substring(0, 4),
        fullName: c.centre,
        projects: c.projects,
        funding: c.budget,
        disbursed: c.disbursed,
        faculty: Math.floor(Math.random() * 5) + 3 // Mock faculty count
    }));

    // 3. Status Distributions
    const statusData = [
        { name: 'Approved', value: selectedDate ? 3 : 28, color: '#10b981' },
        { name: 'Pending', value: selectedDate ? 1 : 12, color: '#f59e0b' },
        { name: 'Rejected', value: selectedDate ? 0 : 5, color: '#ef4444' },
    ];

    const facultyActivityData = [
        { name: 'Active', value: 28, color: '#10b981' },
        { name: 'Inactive', value: 7, color: '#94a3b8' },
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-gray-100 dark:border-slate-700 rounded-lg shadow-xl z-50">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-gray-600 dark:text-gray-300">
                                {entry.name}: <span className="font-bold dark:text-white">
                                    {entry.name.toLowerCase().includes('funding') ||
                                        entry.name.toLowerCase().includes('budget') ||
                                        entry.name.toLowerCase().includes('disbursed')
                                        ? `₹${(entry.value / 100000).toFixed(1)}L`
                                        : entry.value}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // --- Render Helpers ---

    const renderKPIs = () => {
        const kpiBaseClass = "border-0 shadow-lg text-white transition-all duration-300 animate-in fade-in zoom-in-95";

        switch (selectedReport) {
            case 'projects':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-blue-600 to-blue-800`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Total Projects</p>
                                        <p className="text-3xl font-bold mt-1">{projectStats.total}</p>
                                        <p className="text-xs opacity-80 mt-1">All time</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-emerald-500 to-emerald-700`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Active Projects</p>
                                        <p className="text-3xl font-bold mt-1">{projectStats.active}</p>
                                        <p className="text-xs opacity-80 mt-1">Currently running</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Activity className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-amber-500 to-orange-600`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Pending Approvals</p>
                                        <p className="text-3xl font-bold mt-1">{projectStats.pending}</p>
                                        <p className="text-xs opacity-80 mt-1">Awaiting review</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'finance':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-purple-600 to-indigo-800`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Total Budget</p>
                                        <p className="text-3xl font-bold mt-1">₹{(financeStats.totalBudget / 10000000).toFixed(2)}Cr</p>
                                        <p className="text-xs opacity-80 mt-1">Approved grants</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Banknote className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-green-600 to-teal-700`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Total Disbursed</p>
                                        <p className="text-3xl font-bold mt-1">₹{(financeStats.disbursed / 10000000).toFixed(2)}Cr</p>
                                        <p className="text-xs opacity-80 mt-1">Released funds</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><ArrowUpRight className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-rose-500 to-pink-600`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Pending Amount</p>
                                        <p className="text-3xl font-bold mt-1">₹{(financeStats.pending / 10000000).toFixed(2)}Cr</p>
                                        <p className="text-xs opacity-80 mt-1">To be released</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Wallet className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'faculty':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-indigo-500 to-blue-600`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Total Faculty</p>
                                        <p className="text-3xl font-bold mt-1">{facultyStats.total}</p>
                                        <p className="text-xs opacity-80 mt-1">Research staff</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Users className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-emerald-500 to-green-600`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Active Researchers</p>
                                        <p className="text-3xl font-bold mt-1">{facultyStats.active}</p>
                                        <p className="text-xs opacity-80 mt-1">With ongoing projects</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Activity className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-amber-500 to-orange-600`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Assigned Projects</p>
                                        <p className="text-3xl font-bold mt-1">{facultyStats.assigned}</p>
                                        <p className="text-xs opacity-80 mt-1">Total assignments</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'overview':
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-maroon-600 to-maroon-800`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Total Projects</p>
                                        <p className="text-3xl font-bold mt-1">{overviewStats.totalProjects}</p>
                                        <p className="text-xs opacity-80 mt-1">All Departments</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-green-500 to-emerald-600`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Total Budget</p>
                                        <p className="text-3xl font-bold mt-1">₹{(overviewStats.totalBudget / 10000000).toFixed(1)}Cr</p>
                                        <p className="text-xs opacity-80 mt-1">Approved funding</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Banknote className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`${kpiBaseClass} bg-gradient-to-br from-amber-500 to-maroon-600`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Faculty Members</p>
                                        <p className="text-3xl font-bold mt-1">{overviewStats.totalFaculty}</p>
                                        <p className="text-xs opacity-80 mt-1">Research active</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Users className="w-6 h-6" /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
        }
    };

    const renderCharts = () => {
        return (
            <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Primary Large Chart */}
                    <Card className="lg:col-span-2 border-0 shadow-sm dark:bg-slate-900">
                        <CardHeader className="border-b dark:border-slate-800 pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center dark:text-white">
                                <Activity className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                {selectedReport === 'finance' ? 'Budget vs Disbursed Trend' :
                                    selectedReport === 'faculty' ? 'Faculty per Research Centre' :
                                        'Research & Funding Trend'}
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">
                                {selectedReport === 'finance' ? 'Financial allocation over time' :
                                    selectedReport === 'faculty' ? 'Distribution of faculty across centres' :
                                        'Monthly performance metrics'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 pl-0">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {selectedReport === 'faculty' ? (
                                        <BarChart data={centrePerformanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="faculty" name="Faculty Count" fill="#800000" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    ) : (
                                        <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#800000" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#800000" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorSec" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={selectedReport === 'finance' ? '#10b981' : '#d97706'} stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor={selectedReport === 'finance' ? '#10b981' : '#d97706'} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }}
                                                tickFormatter={(value) => selectedReport === 'finance' ? `₹${(value / 10000000).toFixed(0)}Cr` : value}
                                            />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }}
                                                tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Area
                                                yAxisId={selectedReport === 'finance' ? "left" : "left"}
                                                type="monotone"
                                                dataKey={selectedReport === 'finance' ? "funding" : "projects"}
                                                name={selectedReport === 'finance' ? "Total Budget" : "Total Projects"}
                                                stroke="#800000" fillOpacity={1} fill="url(#colorMain)" strokeWidth={2}
                                            />
                                            <Area
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey={selectedReport === 'finance' ? "disbursed" : "funding"}
                                                name={selectedReport === 'finance' ? "Disbursed Amount" : "Approved Funding"}
                                                stroke={selectedReport === 'finance' ? "#10b981" : "#d97706"}
                                                fillOpacity={1} fill="url(#colorSec)" strokeWidth={2}
                                            />
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Donut Chart (Status) */}
                    <Card className="border-0 shadow-sm dark:bg-slate-900">
                        <CardHeader className="border-b dark:border-slate-800 pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center dark:text-white">
                                <PieIcon className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                {selectedReport === 'faculty' ? 'Faculty Activity' : 'Status Distribution'}
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">
                                {selectedReport === 'faculty' ? 'Active vs Inactive' : 'Current request breakdown'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[300px] w-full flex justify-center items-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={selectedReport === 'faculty' ? facultyActivityData : statusData}
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                                        >
                                            {(selectedReport === 'faculty' ? facultyActivityData : statusData).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-6">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Total</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {selectedReport === 'faculty' ? facultyStats.total : stats.totalProjects}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Secondary Bar Chart (Only for Projects, Finance, Faculty) */}
                {selectedReport !== 'overview' && (
                    <Card className="border-0 shadow-sm dark:bg-slate-900">
                        <CardHeader className="border-b dark:border-slate-800 pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center dark:text-white">
                                <BarChart3 className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                {selectedReport === 'projects' ? 'Centre-wise Project Count' :
                                    selectedReport === 'finance' ? 'Centre-wise Funding Allocation' :
                                        'Projects per Faculty (Top 5)'}
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">Performance metrics breakdown</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 pl-0">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={selectedReport === 'faculty' ? facultyMockData : centrePerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                                        <XAxis dataKey={selectedReport === 'faculty' ? "name" : "name"} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                        <YAxis orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                        {selectedReport === 'finance' &&
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`} />
                                        }
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar
                                            yAxisId="left"
                                            dataKey={selectedReport === 'faculty' ? "projects" : "projects"}
                                            name={selectedReport === 'faculty' ? "Assigned Projects" : "Projects"}
                                            fill="#800000" radius={[4, 4, 0, 0]} barSize={30}
                                        />
                                        {(selectedReport === 'finance' || selectedReport === 'faculty') && (
                                            <Bar
                                                yAxisId={selectedReport === 'finance' ? "right" : "left"}
                                                dataKey={selectedReport === 'faculty' ? "grants" : "funding"}
                                                name={selectedReport === 'faculty' ? "Grants Managed" : "Allocation"}
                                                fill="#10b981" radius={[4, 4, 0, 0]} barSize={30}
                                            />
                                        )}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    // Need a unified stats object for legacy references in Overview mode
    const stats = overviewStats;

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6">

                {/* Global Filters */}
                {/* Global Filters - Single Line Alignment */}
                {/* Global Filters - Responsive Layout */}
                <div className="mb-6 flex flex-col xl:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm gap-4">

                    {/* Filters Grid - 2 Lines on Laptop, 1 Line on Large Screens */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-auto flex-1">
                        <div className="w-full">
                            <DateFilter
                                selectedDate={selectedDate}
                                onChange={setSelectedDate}
                                placeholder="Filter by Date"
                            />
                        </div>

                        <select
                            className="h-10 w-full rounded-md border border-input bg-background dark:bg-slate-800 dark:border-slate-700 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500"
                            value={selectedAgency}
                            onChange={(e) => setSelectedAgency(e.target.value)}
                        >
                            <option value="All">All Agencies</option>
                            {AGENCIES.map(agency => (
                                <option key={agency} value={agency}>{agency}</option>
                            ))}
                        </select>

                        <select
                            className="h-10 w-full rounded-md border border-input bg-background dark:bg-slate-800 dark:border-slate-700 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="Pending">Pending</option>
                        </select>

                        <select
                            className="h-10 w-full rounded-md border border-input bg-background dark:bg-slate-800 dark:border-slate-700 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500"
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                        >
                            <option value="All">All Sources</option>
                            {FUND_SOURCES.map(source => (
                                <option key={source} value={source}>{source}</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions - ResetRight */}
                    <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-10 px-4 whitespace-nowrap">
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export Excel
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 hover:text-maroon-600 h-10 px-3 whitespace-nowrap"
                            onClick={() => {
                                setSelectedDate(null);
                                setSelectedAgency('All');
                                setSelectedStatus('All');
                                setSelectedSource('All');
                            }}
                        >
                            <Filter className="w-3 h-3 mr-1" />
                            Reset
                        </Button>
                    </div>
                </div>

                {/* Report Type Selector */}
                {/* Report Type Selector - Full Width Horizontal Tabs */}
                <div className="grid grid-cols-4 gap-2 mb-6 w-full bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'projects', label: 'Projects', icon: FileText },
                        { id: 'finance', label: 'Finance', icon: Banknote },
                        { id: 'faculty', label: 'Faculty', icon: Users },
                    ].map((report) => {
                        const Icon = report.icon;
                        const isActive = selectedReport === report.id;
                        return (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive
                                    ? 'bg-white dark:bg-slate-700 text-maroon-600 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-slate-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-maroon-600 dark:text-white' : 'text-gray-400'}`} />
                                <span className="hidden sm:inline">{report.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Dynamic KPIs */}
                {renderKPIs()}

                {/* Dynamic Charts */}
                {renderCharts()}

                {/* --- Conditional Tables Based on Report Type --- */}

                {/* OVERVIEW MODE: Show Both Tables */}
                {selectedReport === 'overview' && (
                    <>
                        {/* Projects by Research Centre */}
                        <Card className="border-0 shadow-lg mb-8 dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-5">
                            <CardHeader className="border-b dark:border-slate-800">
                                <CardTitle className="text-xl flex items-center dark:text-white">
                                    <TrendingUp className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                    Projects by Research Centre
                                </CardTitle>
                                <CardDescription className="dark:text-gray-400">Distribution of research projects across centres</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:border-slate-800">
                                            <TableHead className="dark:text-gray-400">Research Centre</TableHead>
                                            <TableHead className="dark:text-gray-400">Projects</TableHead>
                                            <TableHead className="dark:text-gray-400">Total Budget</TableHead>
                                            <TableHead className="dark:text-gray-400">Avg. Budget</TableHead>
                                            <TableHead className="text-right dark:text-gray-400">Share</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {projectsByCentre.map((dept, index) => (
                                            <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                                                <TableCell className="font-semibold dark:text-gray-200">{dept.centre}</TableCell>
                                                <TableCell>
                                                    <Badge variant="default" className="dark:bg-slate-800 dark:text-gray-300 border-0">{dept.projects}</Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold text-green-600 dark:text-green-400">
                                                    ₹{(dept.budget / 10000000).toFixed(1)}Cr
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">₹{(dept.budget / dept.projects / 100000).toFixed(1)}L</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                            <div
                                                                className="bg-gradient-to-r from-maroon-500 to-maroon-700 h-2 rounded-full"
                                                                style={{ width: `${(dept.budget / stats.totalBudget) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-semibold dark:text-gray-300">
                                                            {((dept.budget / stats.totalBudget) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Recent Projects */}
                        <Card className="border-0 shadow-lg dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-6">
                            <CardHeader className="border-b dark:border-slate-800">
                                <CardTitle className="text-xl flex items-center dark:text-white">
                                    <FileText className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                    Recent Projects
                                </CardTitle>
                                <CardDescription className="dark:text-gray-400">Latest research projects and their progress</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentProjects.map((project) => (
                                        <div
                                            key={project.id}
                                            onClick={() => setSelectedProject(project)}
                                            className="p-5 bg-gradient-to-r from-white to-gray-50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer hover:scale-[1.01] group"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-maroon-600 dark:group-hover:text-maroon-400 transition-colors">
                                                        {project.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        PI: {project.faculty} | Budget: ₹{(project.budget / 100000).toFixed(1)}L
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={project.status === 'ACTIVE' ? 'success' : 'default'}
                                                    className={project.status === 'PENDING' ? 'dark:bg-slate-800 dark:text-gray-300 border-0' : 'border-0'}
                                                >
                                                    {project.status}
                                                </Badge>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                    <span>Progress</span>
                                                    <span className="font-semibold">{project.progress}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-maroon-500 to-maroon-700 h-2 rounded-full transition-all"
                                                        style={{ width: `${project.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* PROJECTS MODE */}
                {selectedReport === 'projects' && (
                    <Card className="border-0 shadow-lg dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-5">
                        <CardHeader className="border-b dark:border-slate-800">
                            <CardTitle className="text-xl flex items-center dark:text-white">
                                <FileText className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                All Projects
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">Detailed list of all research projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Title</TableHead>
                                        <TableHead>Principal Investigator</TableHead>
                                        <TableHead>Budget</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Progress</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentProjectsData.map((project) => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">{project.title}</TableCell>
                                            <TableCell>{project.faculty}</TableCell>
                                            <TableCell>₹{(project.budget / 100000).toFixed(1)}L</TableCell>
                                            <TableCell>
                                                <Badge variant={project.status === 'ACTIVE' ? 'success' : 'secondary'}>{project.status}</Badge>
                                            </TableCell>
                                            <TableCell>{project.progress}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* FINANCE MODE */}
                {selectedReport === 'finance' && (
                    <Card className="border-0 shadow-lg dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-5">
                        <CardHeader className="border-b dark:border-slate-800">
                            <CardTitle className="text-xl flex items-center dark:text-white">
                                <Banknote className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                Financial Overview by Centre
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">Detailed financial breakdown</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Research Centre</TableHead>
                                        <TableHead>Total Grants</TableHead>
                                        <TableHead>Disbursed</TableHead>
                                        <TableHead>Utilization</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectsByCentre.map((dept, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{dept.centre}</TableCell>
                                            <TableCell className="text-green-600 font-bold">₹{(dept.budget / 10000000).toFixed(2)}Cr</TableCell>
                                            <TableCell>₹{(dept.disbursed / 10000000).toFixed(2)}Cr</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-100 rounded-full">
                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(dept.disbursed / dept.budget) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-xs text-gray-500">{((dept.disbursed / dept.budget) * 100).toFixed(0)}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* FACULTY MODE */}
                {selectedReport === 'faculty' && (
                    <Card className="border-0 shadow-lg dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-5">
                        <CardHeader className="border-b dark:border-slate-800">
                            <CardTitle className="text-xl flex items-center dark:text-white">
                                <Users className="w-5 h-5 mr-2 text-maroon-600 dark:text-maroon-400" />
                                Faculty Research Performance
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">Active faculty members and their grant contributions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Faculty Name</TableHead>
                                        <TableHead>Department/Centre</TableHead>
                                        <TableHead>Active Projects</TableHead>
                                        <TableHead>Total Grants Managed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {facultyMockData.map((fac) => (
                                        <TableRow key={fac.id}>
                                            <TableCell className="font-medium">{fac.name}</TableCell>
                                            <TableCell className="text-sm text-gray-500">{fac.centre}</TableCell>
                                            <TableCell>{fac.projects}</TableCell>
                                            <TableCell className="text-green-600">₹{(fac.grants / 100000).toFixed(1)}L</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
