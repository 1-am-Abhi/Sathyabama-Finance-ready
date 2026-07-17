import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import apiClient from '../../api/client';

const ProjectDetail = ({ isOpen, onClose, project, isDark }) => {
    // Fetch full details (dates, derived amounts, installment progress) from the
    // single source of truth so the dialog never shows N/A when data exists — the
    // parent only passes a list item, which lacks the derived fields.
    const [details, setDetails] = React.useState(null);
    React.useEffect(() => {
        const id = project?.id || project?._id;
        if (!isOpen || !id) { setDetails(null); return; }
        let cancelled = false;
        apiClient.get(`/projects/${id}`)
            .then((res) => { if (!cancelled) setDetails(res.data?.data || null); })
            .catch(() => { if (!cancelled) setDetails(null); });
        return () => { cancelled = true; };
    }, [isOpen, project?.id, project?._id]);

    if (!project) return null;

    // Merge fetched details over the passed list item.
    const p = { ...project, ...(details || {}) };

    const fmtDate = (v) => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const description = p.description || '';
    const startDate = fmtDate(p.startDate);
    const endDate = fmtDate(p.endDate);
    const sanctionDate = fmtDate(p.sanctionDate || p.startDate);
    const durationYears = p.duration != null ? p.duration : null;
    const sanctionedAmount = Number(p.sanctionedAmount ?? p.sanctionedBudget ?? 0);
    const releasedAmount = Number(p.releasedAmount ?? p.releasedBudget ?? 0);
    const remainingAmount = Number(p.remainingAmount ?? Math.max(0, sanctionedAmount - releasedAmount));
    const installmentProgress = p.installmentProgress || null;
    const team = Array.isArray(project.team) ? project.team : [];
    const milestones = Array.isArray(project.milestones) ? project.milestones : [];
    const expenditure = Array.isArray(project.expenditure) ? project.expenditure : [];
    const monthlySpend = Array.isArray(project.monthlySpend) ? project.monthlySpend : [];

    const formatCurrency = (amount) => {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount)) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(numericAmount);
    };

    // Chart data — derived from the same source of truth as the summary cards.
    const budgetUtilizationData = [
        { name: 'Released', value: releasedAmount, color: '#6366f1' },
        { name: 'Remaining', value: remainingAmount, color: '#22c55e' }
    ];

    const expenditureData = expenditure.map(e => ({
        category: e.category,
        allocated: Number(e.allocated || 0) / 100000,
        spent: Number(e.spent || 0) / 100000
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
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{duration}</div>
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
                                        <p className="text-gray-600 dark:text-gray-300">{description || 'No description available.'}</p>
                                    </div>

                                    {/* Financial summary — single source of truth from /projects/:id */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3">
                                            <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Sanction Amount</h4>
                                            <p className="text-lg font-bold dark:text-white">{formatCurrency(sanctionedAmount)}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3">
                                            <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Released Amount</h4>
                                            <p className="text-lg font-bold text-emerald-600">{formatCurrency(releasedAmount)}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3">
                                            <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Remaining Amount</h4>
                                            <p className="text-lg font-bold text-indigo-600">{formatCurrency(remainingAmount)}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3">
                                            <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Installment Progress</h4>
                                            <p className="text-lg font-bold dark:text-white">{installmentProgress || '0/0'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <h4 className="font-semibold dark:text-white mb-1">Principal Investigator</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{p.pi || '—'}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold dark:text-white mb-1">Sanction Date</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{sanctionDate || 'Not available'}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold dark:text-white mb-1">Start Date</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{startDate || 'Not available'}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold dark:text-white mb-1">End Date</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{endDate || 'Not available'}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold dark:text-white mb-1">Duration</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{durationYears ? `${durationYears} year${durationYears > 1 ? 's' : ''}` : (startDate && endDate ? `${startDate} to ${endDate}` : 'Not available')}</p>
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
                                        {team.length === 0 ? (
                                            <TableRow className="dark:border-slate-700">
                                                <TableCell colSpan={3} className="text-center py-10 text-gray-400 italic text-sm">
                                                    No team data available for this project.
                                                </TableCell>
                                            </TableRow>
                                        ) : team.map((member, index) => (
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
                                    {milestones.length === 0 && (
                                        <div className="text-center py-10 text-gray-400 italic text-sm">
                                            No milestone data available for this project.
                                        </div>
                                    )}
                                    {milestones.map((milestone) => (
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
                                        <ResponsiveContainer width="100%" height={300}>
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
                                        {expenditureData.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-gray-400 italic text-sm">
                                                No expenditure breakdown available for this project.
                                            </div>
                                        ) : (
                                        <ResponsiveContainer width="100%" height={300}>
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
                                        )}
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
                                        {monthlySpend.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-gray-400 italic text-sm">
                                                No monthly spending data available for this project.
                                            </div>
                                        ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={monthlySpend}>
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
                                        )}
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
