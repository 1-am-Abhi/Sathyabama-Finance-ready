import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ProjectDetail = ({ isOpen, onClose, project, isDark }) => {
    if (!project) return null;

    // Mock detailed project data
    const projectDetails = {
        ...project,
        description: `Comprehensive research project focused on ${project.name}. This initiative aims to advance knowledge and practical applications in the field.`,
        startDate: '2024-01-15',
        endDate: '2025-12-31',
        duration: '24 months',
        team: [
            { name: project.pi, role: 'Principal Investigator', allocation: 'Full-time' },
            { name: 'Dr. Co-Investigator', role: 'Co-PI', allocation: 'Internship' },
            { name: 'Research Scholar 1', role: 'PhD Student', allocation: 'Full-time' },
            { name: 'Research Scholar 2', role: 'MSc Student', allocation: 'Full-time' }
        ],
        milestones: [
            { id: 1, title: 'Project Initiation', status: 'Completed', date: '2024-01-15', completion: 100 },
            { id: 2, title: 'Literature Review', status: 'Completed', date: '2024-03-30', completion: 100 },
            { id: 3, title: 'Methodology Development', status: 'Completed', date: '2024-06-15', completion: 100 },
            { id: 4, title: 'Data Collection', status: 'In Progress', date: '2024-12-31', completion: 65 },
            { id: 5, title: 'Analysis & Results', status: 'Pending', date: '2025-06-30', completion: 0 },
            { id: 6, title: 'Final Report', status: 'Pending', date: '2025-12-31', completion: 0 }
        ],
        expenditure: [
            { category: 'Equipment', allocated: project.budget * 0.4, spent: project.utilized * 0.35 },
            { category: 'Consumables', allocated: project.budget * 0.25, spent: project.utilized * 0.30 },
            { category: 'Travel', allocated: project.budget * 0.15, spent: project.utilized * 0.15 },
            { category: 'Manpower', allocated: project.budget * 0.15, spent: project.utilized * 0.15 },
            { category: 'Others', allocated: project.budget * 0.05, spent: project.utilized * 0.05 }
        ],
        monthlySpend: [
            { month: 'Jan', spend: 15000 },
            { month: 'Feb', spend: 18000 },
            { month: 'Mar', spend: 22000 },
            { month: 'Apr', spend: 25000 },
            { month: 'May', spend: 28000 },
            { month: 'Jun', spend: 30000 }
        ]
    };

    const formatCurrency = (amount) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        return `₹${amount.toLocaleString()}`;
    };

    // Chart data
    const budgetUtilizationData = [
        { name: 'Utilized', value: project.utilized, color: '#6366f1' },
        { name: 'Remaining', value: project.released - project.utilized, color: '#22c55e' }
    ];

    const expenditureData = projectDetails.expenditure.map(e => ({
        category: e.category,
        allocated: e.allocated / 100000,
        spent: e.spent / 100000
    }));

    const chartConfig = {
        background: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        grid: isDark ? '#334155' : '#e2e8f0',
        tooltip: isDark ? '#334155' : '#ffffff',
        tooltipBorder: isDark ? '#475569' : '#e2e8f0'
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold dark:text-white">{project.name}</DialogTitle>
                </DialogHeader>

                {/* Project Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <Card className="border-0 shadow-sm dark:bg-slate-800">
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Allocated</div>
                            <div className="text-2xl font-bold dark:text-white">{formatCurrency(project.budget)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Approved Grant</div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm dark:bg-slate-800">
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Funds Disbursed</div>
                            <div className="text-2xl font-bold dark:text-white">{formatCurrency(project.released)}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {((project.released / project.budget) * 100).toFixed(1)}% of Allocated
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm dark:bg-slate-800">
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Utilized</div>
                            <div className="text-2xl font-bold dark:text-white">{formatCurrency(project.utilized)}</div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                {((project.utilized / project.released) * 100).toFixed(1)}% of Released
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm dark:bg-slate-800">
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                            <div className="mt-2">
                                <Badge variant={project.status === 'Active' ? 'default' : 'secondary'} className="text-lg">
                                    {project.status}
                                </Badge>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{projectDetails.duration}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="mt-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="team">Team</TabsTrigger>
                        <TabsTrigger value="milestones">Milestones</TabsTrigger>
                        <TabsTrigger value="financials">Financials</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-4">
                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Project Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold dark:text-white mb-2">Description</h4>
                                        <p className="text-gray-600 dark:text-gray-300">{projectDetails.description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-semibold dark:text-white mb-1">Principal Investigator</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{project.pi}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold dark:text-white mb-1">Duration</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{projectDetails.startDate} to {projectDetails.endDate}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Team Tab */}
                    <TabsContent value="team" className="mt-4">
                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Project Team</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:border-slate-700">
                                            <TableHead className="dark:text-gray-300">Name</TableHead>
                                            <TableHead className="dark:text-gray-300">Role</TableHead>
                                            <TableHead className="dark:text-gray-300">Allocation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {projectDetails.team.map((member, index) => (
                                            <TableRow key={index} className="dark:border-slate-700">
                                                <TableCell className="font-medium dark:text-white">{member.name}</TableCell>
                                                <TableCell className="dark:text-gray-300">{member.role}</TableCell>
                                                <TableCell className="dark:text-gray-300">{member.allocation}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Milestones Tab */}
                    <TabsContent value="milestones" className="mt-4">
                        <Card className="border-0 shadow-sm dark:bg-slate-800">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Project Milestones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {projectDetails.milestones.map((milestone) => (
                                        <div key={milestone.id} className="border dark:border-slate-700 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold dark:text-white">{milestone.title}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Target: {milestone.date}</p>
                                                </div>
                                                <Badge variant={
                                                    milestone.status === 'Completed' ? 'default' :
                                                        milestone.status === 'In Progress' ? 'secondary' : 'outline'
                                                }>
                                                    {milestone.status}
                                                </Badge>
                                            </div>
                                            <div className="mt-2">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                                    <span className="font-semibold dark:text-white">{milestone.completion}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                                                        style={{ width: `${milestone.completion}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
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
                                                    data={budgetUtilizationData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {budgetUtilizationData.map((entry, index) => (
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

                            {/* Category-wise Expenditure */}
                            <Card className="border-0 shadow-sm dark:bg-slate-800">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">Category-wise Expenditure (in Lakhs)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={expenditureData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} />
                                                <XAxis dataKey="category" stroke={chartConfig.text} fontSize={11} />
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
                                                <Bar dataKey="allocated" fill="#6366f1" name="Allocated" />
                                                <Bar dataKey="spent" fill="#f59e0b" name="Spent" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Monthly Spending Trend */}
                            <Card className="border-0 shadow-sm dark:bg-slate-800 lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">Monthly Spending Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={projectDetails.monthlySpend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} />
                                                <XAxis dataKey="month" stroke={chartConfig.text} />
                                                <YAxis stroke={chartConfig.text} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: chartConfig.tooltip,
                                                        border: `1px solid ${chartConfig.tooltipBorder}`,
                                                        borderRadius: '8px'
                                                    }}
                                                    formatter={(value) => formatCurrency(value)}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2} name="Monthly Spend" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default ProjectDetail;
