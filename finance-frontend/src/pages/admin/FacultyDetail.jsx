import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProjectDetail from './ProjectDetail';

const FacultyDetail = ({ isOpen, onClose, faculty, centreName, isDark }) => {
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectDetailOpen, setProjectDetailOpen] = useState(false);

    if (!faculty) return null;

    // Use the real per-faculty project breakdown when the API provides it;
    // otherwise render an empty state instead of fabricated data.
    const projects = Array.isArray(faculty.projectList)
        ? faculty.projectList
        : (Array.isArray(faculty.projects) ? faculty.projects : []);

    const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
    const totalReleased = projects.reduce((sum, p) => sum + Number(p.released || 0), 0);
    const totalUtilized = projects.reduce((sum, p) => sum + Number(p.utilized || 0), 0);
    const pct = (num, den) => (den > 0 ? ((num / den) * 100).toFixed(1) : '0');

    const formatCurrency = (amount) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        return `₹${amount.toLocaleString()}`;
    };

    // Chart data
    const projectBudgetData = projects.map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
        budget: p.budget / 100000,
        utilized: p.utilized / 100000
    }));

    const utilizationData = [
        { name: 'Utilized', value: totalUtilized, color: '#6366f1' },
        { name: 'Remaining', value: totalReleased - totalUtilized, color: '#22c55e' }
    ];

    const chartConfig = {
        background: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        grid: isDark ? '#334155' : '#e2e8f0',
        tooltip: isDark ? '#334155' : '#ffffff',
        tooltipBorder: isDark ? '#475569' : '#e2e8f0'
    };

    const handleProjectClick = (project) => {
        setSelectedProject(project);
        setProjectDetailOpen(true);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold dark:text-white">{faculty.name}</DialogTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{faculty.role} • {faculty.specialization}</p>
                    </DialogHeader>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total Projects</div>
                                <div className="text-2xl font-bold dark:text-white">{projects.length}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">As Principal Investigator</div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total Budget</div>
                                <div className="text-2xl font-bold dark:text-white">{formatCurrency(totalBudget)}</div>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">Allocated</div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Funds Released</div>
                                <div className="text-2xl font-bold dark:text-white">{formatCurrency(totalReleased)}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {pct(totalReleased, totalBudget)}% of Budget
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Utilization Rate</div>
                                <div className="text-2xl font-bold dark:text-white">
                                    {pct(totalUtilized, totalReleased)}%
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatCurrency(totalUtilized)} / {formatCurrency(totalReleased)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Projects Table */}
                    <Card className="border-0 shadow-sm dark:bg-slate-800 mt-6">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Projects</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="dark:border-slate-700">
                                        <TableHead className="dark:text-gray-300">Project Name</TableHead>
                                        <TableHead className="dark:text-gray-300">Role</TableHead>
                                        <TableHead className="dark:text-gray-300">Status</TableHead>
                                        <TableHead className="dark:text-gray-300">Budget</TableHead>
                                        <TableHead className="dark:text-gray-300">Released</TableHead>
                                        <TableHead className="dark:text-gray-300">Utilized</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-gray-400 italic text-sm">
                                                No project data available for this faculty member yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {projects.map((project) => (
                                        <TableRow
                                            key={project.id}
                                            className="dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                                            onClick={() => handleProjectClick(project)}
                                        >
                                            <TableCell className="font-medium dark:text-white">{project.name}</TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Badge variant="outline" className="dark:border-slate-600 dark:text-gray-300">
                                                    {project.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={project.status === 'Active' ? 'default' : 'secondary'}>
                                                    {project.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">{formatCurrency(project.budget)}</TableCell>
                                            <TableCell className="dark:text-gray-300">{formatCurrency(project.released)}</TableCell>
                                            <TableCell className="dark:text-gray-300">{formatCurrency(project.utilized)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        {/* Budget Utilization Pie Chart */}
                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Overall Budget Utilization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={utilizationData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {utilizationData.map((entry, index) => (
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
                                <CardTitle className="dark:text-white">Project-wise Budget (in Lakhs)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height={300}>
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
                                            <Bar dataKey="utilized" fill="#f59e0b" name="Utilized" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Nested Project Detail Modal */}
            <ProjectDetail
                isOpen={projectDetailOpen}
                onClose={() => setProjectDetailOpen(false)}
                project={selectedProject}
                isDark={isDark}
            />
        </>
    );
};

export default FacultyDetail;
