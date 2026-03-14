import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProjectDetail from './ProjectDetail';
import FacultyDetail from './FacultyDetail';
import { CENTRE_PROJECTS_MOCK, CENTRE_FACULTY_MOCK } from '../../data/dashboardData';

const ResearchCentreDetail = ({ isOpen, onClose, centreName, isDark }) => {
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [projectDetailOpen, setProjectDetailOpen] = useState(false);
    const [facultyDetailOpen, setFacultyDetailOpen] = useState(false);

    // Mock detailed data for the selected centre
    const getCentreDetails = (name) => {
        const projects = CENTRE_PROJECTS_MOCK[name] || CENTRE_PROJECTS_MOCK['default'];
        const faculty = CENTRE_FACULTY_MOCK[name] || CENTRE_FACULTY_MOCK['default'];

        const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
        const totalReleased = projects.reduce((sum, p) => sum + p.released, 0);
        const totalUtilized = projects.reduce((sum, p) => sum + p.utilized, 0);
        const totalRemaining = totalReleased - totalUtilized;

        const activeProjects = projects.filter(p => p.status === 'Active').length;
        const completedProjects = projects.filter(p => p.status === 'Completed').length;

        return {
            summary: {
                totalProjects: projects.length,
                activeProjects,
                completedProjects,
                totalBudget,
                fundsReleased: totalReleased,
                fundsUtilized: totalUtilized,
                fundsRemaining: totalRemaining,
                utilizationRate: ((totalUtilized / totalReleased) * 100).toFixed(1)
            },
            projects,
            faculty
        };
    };

    if (!centreName) return null;

    const details = getCentreDetails(centreName);

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
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total Budget</div>
                                <div className="text-2xl font-bold dark:text-white">{formatCurrency(details.summary.totalBudget)}</div>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">Allocated</div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Funds Released</div>
                                <div className="text-2xl font-bold dark:text-white">{formatCurrency(details.summary.fundsReleased)}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {((details.summary.fundsReleased / details.summary.totalBudget) * 100).toFixed(1)}% of Budget
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
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="projects">Projects</TabsTrigger>
                            <TabsTrigger value="faculty">Faculty</TabsTrigger>
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
                                                {details.projects.map((project) => (
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
