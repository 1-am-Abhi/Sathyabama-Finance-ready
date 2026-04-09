import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    BarChart3, Download, FileText, TrendingUp, Users,
    PieChart as PieIcon, Activity, Banknote, Wallet, ArrowUpRight,
    FileSpreadsheet, Filter, Brain, CheckCircle, Clock
} from 'lucide-react';
import { summarizeResearchProposal } from '../../services/aiService';
import { useLayout } from '../../contexts/LayoutContext';
import DateFilter from '../../components/shared/DateFilter';
import AIResultModal from '../../components/shared/AIResultModal';
import { formatCurrency } from '../../utils/format';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { AGENCIES } from '../../constants/agencies';
import { FUND_SOURCES } from '../../constants/fundSources';
import { useProjects } from '../../contexts/ProjectContext';
import { FACULTY_MEMBERS } from '../../constants/facultyMembers';
import ResearchCentreDetail from './ResearchCentreDetail';
import * as XLSX from 'xlsx';
import apiClient from '../../api/client';

const AdminReports = () => {
    const { setLayout } = useLayout();
    const { updateProjectStatus } = useProjects();
    const [selectedReport, setSelectedReport] = useState('overview');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedCentreDetail, setSelectedCentreDetail] = useState(null);
    const [selectedAgency, setSelectedAgency] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedSource, setSelectedSource] = useState('All');
    const [manageFacultyModal, setManageFacultyModal] = useState({ isOpen: false, project: null, selectedFaculty: '' });
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });
    const [stats, setStats] = useState({
        totalProjects: 0,
        activeProjects: 0,
        pendingProjects: 0,
        totalBudget: 0,
        totalDisbursed: 0,
        totalFaculty: 0,
        centres: []
    });
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);


    // Derive active project from context data to ensure updates are reflected
    const activeProject = selectedProject ? allRequests.find(p => p._id === selectedProject._id || p.id === selectedProject.id) : null;

    const handleFacultyAssignment = () => {
        if (!manageFacultyModal.selectedFaculty) return;

        // Update happens in local state for demo
        // In a real app, this would trigger an API call
        console.log('Assigning faculty:', manageFacultyModal.selectedFaculty, 'to project:', manageFacultyModal.project?.projectTitle);

        // Close modal and reset
        setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' });
    };

    const handleExport = () => {
        const dataToExport = allRequests.map(req => ({
            'ID': req._id || req.id || "N/A",
            'Project Title': req.projectTitle,
            'Principal Investigator': req.faculty,
            'Amount (₹)': req.requestedAmount,
            'Status': req.status,
            'Cheque Status': req.chequeStatus || "Pending",
            'Submitted Date': req.submittedDate || "N/A"
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Projects Report');
        XLSX.writeFile(wb, `Admin_Projects_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                const [statsRes, requestsRes] = await Promise.all([
                    apiClient.get('/projects/stats'),
                    apiClient.get('/fund-requests')
                ]);

                if (statsRes.data?.success) {
                    const s = statsRes.data.stats;
                    setStats({
                        totalProjects: s.totalProjects || 0,
                        activeProjects: s.activeProjects || 0,
                        pendingProjects: s.pendingApprovals || 0,
                        totalBudget: s.totalBudget || 0,
                        totalDisbursed: s.totalDisbursed || 0,
                        totalFaculty: s.totalFaculty || 0,
                        centres: (statsRes.data.centres || []).map(c => ({
                            centre: c.name,
                            totalProjects: c.count || 0,
                            totalBudget: 0,
                            disbursed: 0
                        }))
                    });
                }
                if (requestsRes.data?.success) {
                    setAllRequests(requestsRes.data.data);
                }
            } catch (err) {
                console.error("Error fetching report data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();

        setLayout(
            "Reports & Analytics",
            selectedDate ? `Data for ${new Date(selectedDate).toLocaleDateString()}` : "Comprehensive overview of research and finance data"
        );
    }, [selectedDate, setLayout]);

    // --- Live Data Mappings ---

    // Global Stats (Simulating "Overview")
    const overviewStats = {
        totalProjects: stats.totalProjects,
        totalBudget: stats.totalBudget,
        totalFaculty: stats.totalFaculty
    };

    // Project Stats
    const projectStats = {
        total: stats.totalProjects,
        active: stats.activeProjects,
        pending: stats.pendingProjects
    };

    // Finance Stats
    const financeStats = {
        totalBudget: stats.totalBudget,
        disbursed: stats.totalDisbursed,
        pending: stats.totalBudget - stats.totalDisbursed
    };

    // Faculty Stats
    const facultyStats = {
        total: stats.totalFaculty,
        active: Math.round(stats.totalFaculty * 0.8), // Heuristic if not explicitly in stats
        assigned: stats.activeProjects
    };

    const projectsByCentre = (stats.centres || []).map(c => ({
        centre: c.centre,
        projects: c.totalProjects,
        budget: c.totalBudget,
        disbursed: c.disbursed
    }));


    const facultyMockData = [
        { id: 1, name: 'Dr. Priya Sharma', centre: 'Centre for Nano Science', projects: 2, grants: 8500000 },
        { id: 2, name: 'Dr. Vikram Singh', centre: 'Centre for Energy Research', projects: 1, grants: 6000000 },
        { id: 3, name: 'Dr. Bharathi', centre: 'Centre for Climate Studies', projects: 3, grants: 7500000 },
        { id: 4, name: 'Dr. Anita Desai', centre: 'Centre for Molecular Sciences', projects: 1, grants: 4000000 },
        { id: 5, name: 'Dr. R. Kumar', centre: 'Centre for Waste Management', projects: 2, grants: 5500000 },
    ];

    // --- Chart Data ---

    // 1. Trend Data - Using live baseline if history API is unavailable
    const trendData = [
        { name: 'Jan', projects: Math.round(stats.totalProjects * 0.2), funding: stats.totalBudget * 0.2, disbursed: stats.totalDisbursed * 0.2 },
        { name: 'Feb', projects: Math.round(stats.totalProjects * 0.3), funding: stats.totalBudget * 0.4, disbursed: stats.totalDisbursed * 0.3 },
        { name: 'Mar', projects: stats.totalProjects, funding: stats.totalBudget, disbursed: stats.totalDisbursed },
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
        { name: 'Approved', value: stats.activeProjects, color: '#10b981' },
        { name: 'Pending', value: stats.pendingProjects, color: '#f59e0b' },
        { name: 'Rejected', value: 0, color: '#ef4444' }, // Status rejected not in current stats aggregation
    ];

    const facultyActivityData = [
        { name: 'Active', value: Math.round(stats.totalFaculty * 0.8), color: '#10b981' },
        { name: 'Inactive', value: Math.round(stats.totalFaculty * 0.2), color: '#94a3b8' },
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
                                        ? formatCurrency(entry.value)
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
                                        <p className="text-3xl font-bold mt-1">{formatCurrency(financeStats.totalBudget)}</p>
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
                                        <p className="text-3xl font-bold mt-1">{formatCurrency(financeStats.disbursed)}</p>
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
                                        <p className="text-3xl font-bold mt-1">{formatCurrency(financeStats.pending)}</p>
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
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-70">Total Sanctioned</p>
                                        <p className="text-3xl font-bold mt-1">{formatCurrency(overviewStats.totalBudget)}</p>
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
                                                tickFormatter={(value) => selectedReport === 'finance' ? formatCurrency(value) : value}
                                            />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }}
                                                tickFormatter={(value) => formatCurrency(value)}
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
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => formatCurrency(value)} />
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
    // Use the live stats state throughout the component

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
                                <option key={source} value={source === 'Others' ? 'OTHERS' : source.toUpperCase() === 'INSTITUTIONAL' ? 'INSTITUTIONAL' : source}>
                                    {source === 'Others' ? "Other's" : source}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Actions - ResetRight */}
                    <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                        <Button onClick={handleExport} size="sm" className="bg-green-600 hover:bg-green-700 text-white h-10 px-4 whitespace-nowrap">
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
                                            <TableRow
                                                key={index}
                                                className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800 cursor-pointer"
                                                onClick={() => setSelectedCentreDetail(dept.centre)}
                                            >
                                                <TableCell className="font-semibold dark:text-gray-200">{dept.centre}</TableCell>
                                                <TableCell>
                                                    <Badge variant="default" className="dark:bg-slate-800 dark:text-gray-300 border-0">{dept.projects}</Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold text-green-600 dark:text-green-400">
                                                    {formatCurrency(dept.budget)}
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">{formatCurrency(dept.budget / dept.projects)}</TableCell>
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
                                    {allRequests.slice(0, 5).map((project) => (
                                        <div
                                            key={project._id || project.id}
                                            onClick={() => setSelectedProject(project)}
                                            className="p-5 bg-gradient-to-r from-white to-gray-50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer hover:scale-[1.01] group"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-maroon-600 dark:group-hover:text-maroon-400 transition-colors">
                                                        {project.projectTitle}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        PI: {project.faculty} | Amount: {formatCurrency(project.requestedAmount)}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={project.status === 'APPROVED' ? 'success' : 'default'}
                                                    className={`${project.status === 'PENDING' ? 'dark:bg-slate-800 dark:text-gray-300 border-0 bg-yellow-100 text-yellow-700' : 'border-0'} ${project.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}`}
                                                >
                                                    {project.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Cheque:</span>
                                                    <span className={`font-medium
                                                        ${project.chequeStatus === 'Disbursed' ? 'text-green-600 dark:text-green-400' : ''}
                                                        ${project.chequeStatus === 'Approved' ? 'text-blue-600 dark:text-blue-400' : ''}
                                                        ${project.chequeStatus === 'Pending' ? 'text-gray-500 dark:text-gray-400' : ''}
                                                    `}>
                                                        {project.chequeStatus}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(project.submittedDate || project.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
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
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Cheque Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allRequests.map((project) => (
                                        <TableRow
                                            key={project._id || project.id}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
                                            onClick={() => setSelectedProject(project)}
                                        >
                                            <TableCell className="font-medium">{project.projectTitle}</TableCell>
                                            <TableCell className="text-slate-400 font-bold italic tracking-tighter uppercase">{project.projectType}</TableCell>
                                            <TableCell>{formatCurrency(project.requestedAmount)}</TableCell>
                                            <TableCell className="dark:text-gray-300">{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={project.status === 'APPROVED' ? 'success' : 'secondary'}
                                                    className={project.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                                                    {project.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-sm font-medium
                                                    ${project.chequeStatus === 'Disbursed' ? 'text-green-600 dark:text-green-400' : ''}
                                                    ${project.chequeStatus === 'Approved' ? 'text-blue-600 dark:text-blue-400' : ''}
                                                    ${project.chequeStatus === 'Pending' ? 'text-gray-500 dark:text-gray-400' : ''}
                                                `}>
                                                    {project.chequeStatus}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                                    {(project.status === 'PENDING' || project.status === 'REJECTED') && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={() => updateProjectStatus(project.id, 'APPROVED')}
                                                        >
                                                            Approve
                                                        </Button>
                                                    )}
                                                    {(project.status === 'PENDING' || project.status === 'APPROVED') && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => updateProjectStatus(project.id, 'REJECTED')}
                                                        >
                                                            Reject
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* FINANCE MODE */}
                {selectedReport === 'finance' && (<>
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
                                        <TableRow
                                            key={index}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
                                            onClick={() => setSelectedCentreDetail(dept.centre)}
                                        >
                                            <TableCell className="font-medium">{dept.centre}</TableCell>
                                            <TableCell className="text-green-600 font-bold">{formatCurrency(dept.budget)}</TableCell>
                                            <TableCell>{formatCurrency(dept.disbursed)}</TableCell>
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

                    {/* Check Disbursal Status Table */}
                    <Card className="border-0 shadow-lg dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-6 mt-8">
                        <CardHeader className="border-b dark:border-slate-800">
                            <CardTitle className="text-xl flex items-center dark:text-white">
                                <FileText className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                Recent Cheque Disbursals & Fund Requests
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">Status of recent fund requests and cheque processing</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Title</TableHead>
                                        <TableHead>Principal Investigator</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Approval Status</TableHead>
                                        <TableHead>Cheque Status</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allRequests.map((request) => (
                                        <TableRow
                                            key={request._id || request.id}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
                                            onClick={() => setSelectedProject(request)}
                                        >
                                            <TableCell className="font-medium max-w-[200px] truncate" title={request.projectTitle}>
                                                {request.projectTitle}
                                            </TableCell>
                                            <TableCell className="text-slate-500 font-bold italic tracking-tighter uppercase">{request.projectTitle}</TableCell>
                                            <TableCell className="font-semibold">{formatCurrency(request.requestedAmount)}</TableCell>
                                            <TableCell>
                                                <Badge variant={request.status === 'APPROVED' ? 'success' : 'secondary'}
                                                    className={request.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                                                    {request.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-sm font-medium
                                                    ${request.chequeStatus === 'Disbursed' ? 'text-green-600 dark:text-green-400' : ''}
                                                    ${request.chequeStatus === 'Approved' ? 'text-blue-600 dark:text-blue-400' : ''}
                                                    ${request.chequeStatus === 'Pending' ? 'text-gray-500 dark:text-gray-400' : ''}
                                                `}>
                                                        {request.chequeStatus}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">{request.source}</TableCell>
                                            <TableCell className="text-center">
                                                {request.status === 'APPROVED' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setManageFacultyModal({
                                                                isOpen: true,
                                                                project: request,
                                                                selectedFaculty: request.faculty
                                                            });
                                                        }}
                                                    >
                                                        <Users className="w-4 h-4 mr-1" />
                                                        Manage Faculty
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 h-7 text-xs flex items-center gap-1 mt-1 mx-auto"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setAiModal({ open: true, loading: true, result: null });
                                                        const r = await summarizeResearchProposal({ title: request.projectTitle, faculty: request.faculty, budget: request.requestedAmount });
                                                        setAiModal({ open: true, loading: false, result: r });
                                                    }}
                                                >
                                                    <Brain className="w-3 h-3" /> AI
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>)}

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
                                            <TableCell className="dark:text-gray-300 font-black italic uppercase tracking-tighter">{fac.name}</TableCell>
                                            <TableCell className="dark:text-gray-400">{fac.centre}</TableCell>
                                            <TableCell className="text-blue-600 font-black italic tracking-tighter">{fac.projects}</TableCell>
                                            <TableCell className="text-green-600">{formatCurrency(fac.grants)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Project Detail Modal */}
            {
                activeProject && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedProject(null)}>
                        <Card className="max-w-3xl w-full border-0 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                            <CardHeader className="border-b dark:border-slate-800 bg-gradient-to-r from-maroon-50 to-gray-50 dark:from-maroon-900/20 dark:to-slate-800">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-bold dark:text-white mb-2">{activeProject.projectTitle}</CardTitle>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <Badge variant="outline" className={`${activeProject.source === 'PFMS' ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/30' : 'text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/30'}`}>
                                                {activeProject.source}
                                            </Badge>
                                            <Badge
                                                variant={activeProject.status === 'APPROVED' ? 'success' : activeProject.status === 'REJECTED' ? 'destructive' : 'secondary'}
                                                className={`
                                                ${activeProject.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                                                ${activeProject.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                                                ${activeProject.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                                            `}
                                            >
                                                {activeProject.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)} className="dark:hover:bg-slate-800">
                                        ✕
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {/* Project Information Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Principal Investigator</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">{activeProject.faculty}</p>
                                        <p className="text-xs text-gray-400">{activeProject.department}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Research Centre</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white truncate" title={activeProject.centre}>{activeProject.centre}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Requested Amount</p>
                                        <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">₹{(activeProject.requestedAmount / 100000).toFixed(1)}L</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Submitted Date</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">
                                            {new Date(activeProject.submittedDate || activeProject.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Purpose */}
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Purpose</p>
                                    <p className="text-sm dark:text-gray-300 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg">{activeProject.purpose}</p>
                                </div>

                                {/* Cheque Information */}
                                {activeProject.status === 'APPROVED' && (
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center">
                                            <Banknote className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                            Cheque Processing &amp; Disbursal Status
                                        </h4>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`flex-1 h-2.5 rounded-full transition-all ${activeProject.chequeStatus ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                                                <div className={`flex-1 h-2.5 rounded-full transition-all ${activeProject.chequeStatus === 'Approved' || activeProject.chequeStatus === 'Disbursed' ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                                                <div className={`flex-1 h-2.5 rounded-full transition-all ${activeProject.chequeStatus === 'Disbursed' ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 px-1">
                                                <span className={activeProject.chequeStatus ? 'font-semibold text-green-600 dark:text-green-400' : ''}>Pending</span>
                                                <span className={activeProject.chequeStatus === 'Approved' || activeProject.chequeStatus === 'Disbursed' ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}>Approved</span>
                                                <span className={activeProject.chequeStatus === 'Disbursed' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}>Disbursed</span>
                                            </div>
                                        </div>

                                        {/* Current Status */}
                                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-100 dark:border-slate-700">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    {activeProject.chequeStatus === 'Disbursed' && <CheckCircle className="w-6 h-6 text-green-500" />}
                                                    {activeProject.chequeStatus === 'Approved' && <Clock className="w-6 h-6 text-blue-500" />}
                                                    {activeProject.chequeStatus === 'Pending' && <Clock className="w-6 h-6 text-gray-400" />}
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Current Cheque Status</p>
                                                        <p className={`text-lg font-bold
                                                        ${activeProject.chequeStatus === 'Disbursed' ? 'text-green-600 dark:text-green-400' : ''}
                                                        ${activeProject.chequeStatus === 'Approved' ? 'text-blue-600 dark:text-blue-400' : ''}
                                                        ${activeProject.chequeStatus === 'Pending' ? 'text-gray-500 dark:text-gray-400' : ''}
                                                    `}>
                                                            {activeProject.chequeStatus || 'Pending'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {activeProject.chequeStatus === 'Disbursed' && (
                                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        ✓ Complete
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-between items-center pt-4 border-t dark:border-slate-800">
                                    <div className="flex space-x-2">
                                        {(activeProject.status === 'PENDING' || activeProject.status === 'REJECTED') && (
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => updateProjectStatus(activeProject.id, 'APPROVED')}
                                            >
                                                Approve
                                            </Button>
                                        )}
                                        {(activeProject.status === 'PENDING' || activeProject.status === 'APPROVED') && (
                                            <Button
                                                variant="destructive"
                                                onClick={() => updateProjectStatus(activeProject.id, 'REJECTED')}
                                            >
                                                Reject
                                            </Button>
                                        )}
                                    </div>
                                    <Button variant="outline" onClick={() => setSelectedProject(null)} className="dark:border-slate-700 dark:hover:bg-slate-800">
                                        Close
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Manage Faculty Modal */}
            {
                manageFacultyModal.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' })}>
                        <Card className="max-w-2xl w-full border-0 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                            <CardHeader className="border-b dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-bold dark:text-white mb-2">Manage Faculty Assignment</CardTitle>
                                        <CardDescription className="dark:text-gray-400">
                                            Assign or reassign Principal Investigator for this project
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' })}
                                        className="dark:hover:bg-slate-800"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {/* Project Info */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Project</p>
                                    <p className="text-lg font-bold mt-1 dark:text-white">{manageFacultyModal.project?.projectTitle}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Current PI</p>
                                            <p className="text-sm font-semibold dark:text-gray-300">{manageFacultyModal.project?.faculty}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">₹{(manageFacultyModal.project?.requestedAmount / 100000).toFixed(1)}L</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Faculty Selection */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Select New Principal Investigator
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                        value={manageFacultyModal.selectedFaculty}
                                        onChange={(e) => setManageFacultyModal({ ...manageFacultyModal, selectedFaculty: e.target.value })}
                                    >
                                        <option value="">-- Select Faculty --</option>
                                        {FACULTY_MEMBERS.map((faculty) => (
                                            <option key={faculty.id} value={faculty.name}>
                                                {faculty.name} ({faculty.department}) - {faculty.centre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Available Faculty List */}
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Available Faculty Members</p>
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                                        {FACULTY_MEMBERS.map((faculty) => (
                                            <div
                                                key={faculty.id}
                                                className={`p-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${manageFacultyModal.selectedFaculty === faculty.name ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                                                    }`}
                                                onClick={() => setManageFacultyModal({ ...manageFacultyModal, selectedFaculty: faculty.name })}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-sm dark:text-white">{faculty.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{faculty.department} • {faculty.centre}</p>
                                                    </div>
                                                    {manageFacultyModal.selectedFaculty === faculty.name && (
                                                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t dark:border-slate-800">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' })}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                        onClick={handleFacultyAssignment}
                                        disabled={!manageFacultyModal.selectedFaculty || manageFacultyModal.selectedFaculty === manageFacultyModal.project?.faculty}
                                    >
                                        <Users className="w-4 h-4 mr-2" />
                                        Assign Faculty
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Research Centre Detail Modal */}
            <ResearchCentreDetail
                isOpen={!!selectedCentreDetail}
                onClose={() => setSelectedCentreDetail(null)}
                centreName={selectedCentreDetail}
                isDark={document.documentElement.classList.contains('dark')}
            />


            {/* AI Result Modal */}
            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />
        </div>
    );
};

export default AdminReports;
