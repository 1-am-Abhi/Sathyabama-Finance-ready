import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProjectDetail from './ProjectDetail';
import FacultyDetail from './FacultyDetail';
import apiClient from '../../api/client';
import axios from 'axios';

const ResearchCentreDetail = ({ isOpen, onClose, centreName, isDark }) => {
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [projectDetailOpen, setProjectDetailOpen] = useState(false);
    const [facultyDetailOpen, setFacultyDetailOpen] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState({
        summary: {
            totalProjects: 0, activeProjects: 0, completedProjects: 0,
            totalAllocated: 0, totalDisbursed: 0, fundsUtilized: 0, fundsRemaining: 0, utilizationRate: 0
        },
        projects: [],
        faculty: [],
        publications: {
            journals: 0, proceedings: 0, books: 0, bookChapters: 0, patents: 0
        }
    });

    useEffect(() => {
        if (!isOpen || !centreName) return;
        
        let isMounted = true;
        
        const fetchDetails = async () => {
            try {
                if (isMounted && details.projects.length === 0) setLoading(true);
                
                // Use axios directly with token to avoid the globaltoast-on-404 interceptor
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

                const [projectsRes, usersRes, metricsRes] = await Promise.all([
                    axios.get(`${baseURL}/projects`, { headers }).catch(() => ({ data: { success: true, data: [] } })),
                    axios.get(`${baseURL}/profile/all`, { headers }).catch(() => ({ data: { success: true, data: [] } })),
                    axios.get(`${baseURL}/academic-metrics/all`, { headers }).catch(() => ({ data: { success: true, data: [] } }))
                ]);
                
                if (!isMounted) return;
                
                // Normalize centre name for flexible matching
                const normalizeName = (name) => {
                    if (!name) return '';
                    return name.trim().toLowerCase()
                        .replace(/^centre\s+(for|of\s+excellence\s+for)\s+/i, '');
                };

                let centreProjects = [];
                if (projectsRes.data.success && projectsRes.data.data) {
                    const target = normalizeName(centreName);
                    centreProjects = projectsRes.data.data.filter(p => {
                        const pCentre = normalizeName(p.centre);
                        const pDept = normalizeName(p.department);
                        // Match against both centre AND department fields
                        return pCentre === target || pDept === target ||
                               (pCentre && target && (pCentre.includes(target) || target.includes(pCentre)));
                    });
                }
                
                // Transform to match UI schema
                const uiProjects = centreProjects.map(p => ({
                    id: p._id || p.id,
                    name: p.title,
                    pi: p.pi || p.principalInvestigator || (p.members?.find(m => m.role === 'PI')?.user?.name) || (p.members?.[0]?.user?.name) || 'N/A',
                    status: p.status === 'ACTIVE' ? 'Active' : (p.status === 'COMPLETED' ? 'Completed' : p.status),
                    budget: p.sanctionedBudget || 0,
                    released: p.releasedBudget || 0,
                    utilized: p.utilizedBudget || 0
                }));
                
                let centreFaculty = [];
                let pubStats = { journals: 0, proceedings: 0, books: 0, bookChapters: 0, patents: 0 };
                
                if (usersRes.data && usersRes.data.success) {
                    // Use fuzzy matching for users too
                    const centreUsers = (usersRes.data.data || []).filter(u => {
                        const uCentre = normalizeName(u.centre);
                        const uDept = normalizeName(u.department);
                        const tgt = normalizeName(centreName);
                        return uCentre === tgt || uDept === tgt ||
                               (uCentre && tgt && (uCentre.includes(tgt) || tgt.includes(uCentre)));
                    });

                    centreFaculty = centreUsers.filter(u => u.role === 'FACULTY').map(u => ({
                        id: u._id,
                        name: u.name,
                        role: u.designation || 'Faculty Member',
                        projects: uiProjects.filter(p => p.pi === u.name).length,
                        specialization: u.specialization || 'Research'
                    }));

                    // If no registered faculty found, derive from project PIs
                    if (centreFaculty.length === 0 && uiProjects.length > 0) {
                        const piNames = [...new Set(uiProjects.map(p => p.pi).filter(pi => pi && pi !== 'N/A'))];
                        centreFaculty = piNames.map((name, i) => ({
                            id: `pi-${i}`,
                            name,
                            role: 'Principal Investigator',
                            projects: uiProjects.filter(p => p.pi === name).length,
                            specialization: 'Research'
                        }));
                    }

                    // Aggregate publications for these users
                    if (metricsRes.data && metricsRes.data.success) {
                        const centreUserIds = centreUsers.map(u => u._id);
                        const centreMetrics = metricsRes.data.data.filter(m => centreUserIds.includes(m.facultyId));
                        
                        centreMetrics.forEach(m => {
                            pubStats.journals += (m.journals || 0);
                            pubStats.proceedings += (m.proceedings || 0);
                            pubStats.books += (m.books || 0);
                            pubStats.bookChapters += (m.bookChapters || 0);
                            pubStats.patents += (m.patents || 0);
                        });
                    }
                }

                const totalAllocated = uiProjects.reduce((sum, p) => sum + p.budget, 0);
                const totalDisbursed = uiProjects.reduce((sum, p) => sum + p.released, 0);
                const totalUtilized = uiProjects.reduce((sum, p) => sum + p.utilized, 0);
                const totalRemaining = totalDisbursed - totalUtilized;

                const activeProjects = uiProjects.filter(p => p.status === 'Active' || p.status === 'ACTIVE').length;
                const completedProjects = uiProjects.filter(p => p.status === 'Completed' || p.status === 'COMPLETED').length;

                setDetails({
                    summary: {
                        totalProjects: uiProjects.length,
                        activeProjects,
                        completedProjects,
                        totalAllocated,
                        totalDisbursed,
                        fundsUtilized: totalUtilized,
                        fundsRemaining: totalRemaining,
                        utilizationRate: totalDisbursed > 0 ? ((totalUtilized / totalDisbursed) * 100).toFixed(1) : 0
                    },
                    projects: uiProjects,
                    faculty: centreFaculty,
                    publications: pubStats
                });

            } catch (error) {
                console.error("Error fetching centre details:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDetails();
    }, [isOpen, centreName]);

    if (!isOpen || !centreName) return null;

    // Chart data
    const budgetChartData = [
        { name: 'Utilized', value: details.summary.fundsUtilized, color: '#6366f1' },
        { name: 'Remaining', value: details.summary.fundsRemaining, color: '#22c55e' }
    ];

    const projectBudgetData = details.projects.map(p => ({
        name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
        budget: p.budget / 100000,
        released: p.released / 100000,
        utilized: p.utilized / 100000
    }));

    const formatCurrency = (amount) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        return `₹${amount.toLocaleString()}`;
    };

    const chartConfig = {
        background: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        grid: isDark ? '#334155' : '#e2e8f0',
        tooltip: isDark ? '#334155' : '#ffffff',
        tooltipBorder: isDark ? '#475569' : '#e2e8f0'
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 w-[95vw] md:w-full p-4 md:p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl md:text-2xl font-bold dark:text-white text-left pr-8 break-words leading-tight">
                            {centreName}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total Projects</div>
                                <div className="text-2xl font-bold dark:text-white">{details.summary.totalProjects}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {details.summary.activeProjects} Active, {details.summary.completedProjects} Completed
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total Allocated</div>
                                <div className="text-2xl font-bold dark:text-white">{formatCurrency(details.summary.totalAllocated)}</div>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">Approved Grants</div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Funds Disbursed</div>
                                <div className="text-2xl font-bold dark:text-white">{formatCurrency(details.summary.totalDisbursed)}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {details.summary.totalAllocated > 0 ? ((details.summary.totalDisbursed / details.summary.totalAllocated) * 100).toFixed(1) : 0}% of Allocated
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Utilization Rate</div>
                                <div className="text-2xl font-bold dark:text-white">{details.summary.utilizationRate}%</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatCurrency(details.summary.fundsUtilized)} / {formatCurrency(details.summary.fundsReleased)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabs for different sections */}
                    <Tabs defaultValue="projects" className="mt-6">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="projects">Projects</TabsTrigger>
                            <TabsTrigger value="faculty">Faculty</TabsTrigger>
                            <TabsTrigger value="publications">Publications (Scopus)</TabsTrigger>
                            <TabsTrigger value="financials">Financials</TabsTrigger>
                        </TabsList>

                        {/* Projects Tab */}
                        <TabsContent value="projects" className="mt-4">
                            <Card className="border-0 shadow-sm dark:bg-slate-800">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">Project List</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="dark:border-slate-700">
                                                    <TableHead className="dark:text-gray-300">Project Name</TableHead>
                                                    <TableHead className="dark:text-gray-300">Principal Investigator</TableHead>
                                                    <TableHead className="dark:text-gray-300">Status</TableHead>
                                                    <TableHead className="dark:text-gray-300">Budget</TableHead>
                                                    <TableHead className="dark:text-gray-300">Released</TableHead>
                                                    <TableHead className="dark:text-gray-300">Utilized</TableHead>
                                                    <TableHead className="dark:text-gray-300">Remaining</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400 italic text-sm">Loading projects...</TableCell></TableRow>
                                                ) : details.projects.length === 0 ? (
                                                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400 italic text-sm">No projects found for this research centre yet.</TableCell></TableRow>
                                                ) : details.projects.map((project) => (
                                                    <TableRow
                                                        key={project.id}
                                                        className="dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                                                        onClick={() => {
                                                            setSelectedProject(project);
                                                            setProjectDetailOpen(true);
                                                        }}
                                                    >
                                                        <TableCell className="font-medium dark:text-white whitespace-nowrap">{project.name}</TableCell>
                                                        <TableCell className="dark:text-gray-300 whitespace-nowrap">{project.pi}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={project.status === 'Active' ? 'default' : 'secondary'}>
                                                                {project.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="dark:text-gray-300 whitespace-nowrap">{formatCurrency(project.budget)}</TableCell>
                                                        <TableCell className="dark:text-gray-300 whitespace-nowrap">{formatCurrency(project.released)}</TableCell>
                                                        <TableCell className="dark:text-gray-300 whitespace-nowrap">{formatCurrency(project.utilized)}</TableCell>
                                                        <TableCell className="dark:text-gray-300 whitespace-nowrap">{formatCurrency(project.released - project.utilized)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Faculty Tab */}
                        <TabsContent value="faculty" className="mt-4">
                            <Card className="border-0 shadow-sm dark:bg-slate-800">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">Faculty Members</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {details.faculty.map((member) => (
                                            <Card
                                                key={member.id}
                                                className="border dark:border-slate-700 dark:bg-slate-900 cursor-pointer hover:shadow-lg transition-shadow"
                                                onClick={() => {
                                                    setSelectedFaculty(member);
                                                    setFacultyDetailOpen(true);
                                                }}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-semibold dark:text-white">{member.name}</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{member.role}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{member.specialization}</p>
                                                        </div>
                                                        <Badge variant="outline" className="dark:border-slate-600 dark:text-gray-300">
                                                            {member.projects} {member.projects === 1 ? 'Project' : 'Projects'}
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Publications Tab */}
                        <TabsContent value="publications" className="mt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <Card className="bg-blue-50 dark:bg-blue-900/20 border-0 outline-none">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{details.publications.journals}</div>
                                        <div className="text-sm font-medium text-blue-600 dark:text-blue-500 mt-1">Journals (WoS/Scopus)</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-purple-50 dark:bg-purple-900/20 border-0 outline-none">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">{details.publications.proceedings}</div>
                                        <div className="text-sm font-medium text-purple-600 dark:text-purple-500 mt-1">Proceedings</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-amber-50 dark:bg-amber-900/20 border-0 outline-none">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{details.publications.books + details.publications.bookChapters}</div>
                                        <div className="text-sm font-medium text-amber-600 dark:text-amber-500 mt-1">Books & Chapters</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-0 outline-none">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{details.publications.patents}</div>
                                        <div className="text-sm font-medium text-emerald-600 dark:text-emerald-500 mt-1">Patents</div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 border-dashed">
                                <p className="text-gray-500 text-sm text-center">These metrics are continuously synchronized with the Scopus/Elsevier integration endpoint based on assigned faculty Scopus ID.</p>
                                <Badge variant="outline" className="mt-4 border-orange-200 text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400">Scopus Insights Live</Badge>
                            </div>
                        </TabsContent>

                        {/* Financials Tab */}
                        <TabsContent value="financials" className="mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Budget Utilization Pie Chart */}
                                <Card className="border-0 shadow-sm dark:bg-slate-800">
                                    <CardHeader>
                                        <CardTitle className="dark:text-white">Budget Utilization</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={budgetChartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                        outerRadius={80}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                    >
                                                        {budgetChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: chartConfig.tooltip,
                                                            border: `1px solid ${chartConfig.tooltipBorder}`,
                                                            borderRadius: '8px'
                                                        }}
                                                        formatter={(value) => formatCurrency(value)}
                                                    />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Project-wise Budget Bar Chart */}
                                <Card className="border-0 shadow-sm dark:bg-slate-800">
                                    <CardHeader>
                                        <CardTitle className="dark:text-white">Project-wise Funds (in Lakhs)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={projectBudgetData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} />
                                                    <XAxis dataKey="name" stroke={chartConfig.text} fontSize={10} angle={-45} textAnchor="end" height={80} />
                                                    <YAxis stroke={chartConfig.text} fontSize={12} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: chartConfig.tooltip,
                                                            border: `1px solid ${chartConfig.tooltipBorder}`,
                                                            borderRadius: '8px'
                                                        }}
                                                        formatter={(value) => `₹${value.toFixed(2)}L`}
                                                    />
                                                    <Legend />
                                                    <Bar dataKey="budget" fill="#6366f1" name="Budget" />
                                                    <Bar dataKey="released" fill="#22c55e" name="Released" />
                                                    <Bar dataKey="utilized" fill="#f59e0b" name="Utilized" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Nested Project Detail Modal */}
            <ProjectDetail
                isOpen={projectDetailOpen}
                onClose={() => setProjectDetailOpen(false)}
                project={selectedProject}
                isDark={isDark}
            />

            {/* Nested Faculty Detail Modal */}
            <FacultyDetail
                isOpen={facultyDetailOpen}
                onClose={() => setFacultyDetailOpen(false)}
                faculty={selectedFaculty}
                centreName={centreName}
                isDark={isDark}
            />
        </>
    );
};

export default ResearchCentreDetail;
