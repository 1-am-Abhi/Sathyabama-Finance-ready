import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import {
    FileText, DollarSign, CheckCircle, Clock, TrendingUp, AlertCircle,
    UserPlus, BarChart3, Filter, ArrowRight
} from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import TopBar from '../../components/shared/TopBar';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [selectedDepartment, setSelectedDepartment] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState('ALL');

    const departments = [
        'Computer Science & Engineering',
        'Electronics & Communication Engineering',
        'Electrical & Electronics Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'Information Technology',
        'Biotechnology',
        'Chemical Engineering'
    ];

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const departmentData = [
        {
            department: 'Computer Science & Engineering',
            totalProjects: 12,
            activeProjects: 8,
            completedProjects: 3,
            pendingApproval: 1,
            totalBudget: 35000000,
            disbursed: 25000000,
            faculty: 15
        },
        {
            department: 'Electronics & Communication Engineering',
            totalProjects: 10,
            activeProjects: 7,
            completedProjects: 2,
            pendingApproval: 1,
            totalBudget: 28000000,
            disbursed: 20000000,
            faculty: 12
        },
        {
            department: 'Electrical & Electronics Engineering',
            totalProjects: 8,
            activeProjects: 5,
            completedProjects: 2,
            pendingApproval: 1,
            totalBudget: 22000000,
            disbursed: 16000000,
            faculty: 10
        },
        {
            department: 'Mechanical Engineering',
            totalProjects: 10,
            activeProjects: 6,
            completedProjects: 3,
            pendingApproval: 1,
            totalBudget: 25000000,
            disbursed: 18000000,
            faculty: 11
        },
        {
            department: 'Civil Engineering',
            totalProjects: 7,
            activeProjects: 4,
            completedProjects: 2,
            pendingApproval: 1,
            totalBudget: 20000000,
            disbursed: 14000000,
            faculty: 8
        },
        {
            department: 'Information Technology',
            totalProjects: 8,
            activeProjects: 5,
            completedProjects: 2,
            pendingApproval: 1,
            totalBudget: 17000000,
            disbursed: 12000000,
            faculty: 9
        },
        {
            department: 'Biotechnology',
            totalProjects: 6,
            activeProjects: 4,
            completedProjects: 1,
            pendingApproval: 1,
            totalBudget: 15000000,
            disbursed: 10000000,
            faculty: 7
        },
        {
            department: 'Chemical Engineering',
            totalProjects: 5,
            activeProjects: 3,
            completedProjects: 1,
            pendingApproval: 1,
            totalBudget: 13000000,
            disbursed: 9000000,
            faculty: 6
        },
    ];

    const filteredData = selectedDepartment === 'ALL'
        ? departmentData
        : departmentData.filter(d => d.department === selectedDepartment);

    const totalStats = {
        totalProjects: departmentData.reduce((sum, d) => sum + d.totalProjects, 0),
        activeProjects: departmentData.reduce((sum, d) => sum + d.activeProjects, 0),
        pendingApprovals: departmentData.reduce((sum, d) => sum + d.pendingApproval, 0),
        totalBudget: departmentData.reduce((sum, d) => sum + d.totalBudget, 0),
        totalDisbursed: departmentData.reduce((sum, d) => sum + d.disbursed, 0),
    };

    const recentActivities = [
        { id: 1, type: 'project', message: 'New project "AI Research Lab" submitted - CSE', time: '2 hours ago', icon: FileText, color: 'blue' },
        { id: 2, type: 'fund', message: 'Fund request approved for Smart Grid - EEE', time: '5 hours ago', icon: DollarSign, color: 'green' },
        { id: 3, type: 'approval', message: 'Robotics project approved - Mechanical', time: '1 day ago', icon: CheckCircle, color: 'purple' },
    ];

    const quickActions = [
        {
            title: 'Approve Projects',
            description: `${totalStats.pendingApprovals} projects pending`,
            icon: CheckCircle,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100',
            action: () => navigate('/admin/approve-projects')
        },
        {
            title: 'Assign Faculty',
            description: 'Assign faculty to projects',
            icon: UserPlus,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100',
            action: () => navigate('/admin/assign-faculty')
        },
        {
            title: 'Fund Requests',
            description: 'Review funding requests',
            icon: DollarSign,
            color: 'bg-green-50 text-green-600',
            iconBg: 'bg-green-100',
            action: () => navigate('/admin/fund-requests')
        },
        {
            title: 'View Reports',
            description: 'Analytics and insights',
            icon: BarChart3,
            color: 'bg-cyan-50 text-cyan-600',
            iconBg: 'bg-cyan-100',
            action: () => navigate('/admin/reports')
        },
    ];

    const getIconColor = (color) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            purple: 'bg-purple-100 text-purple-600'
        };
        return colors[color] || 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />

            <div className="flex-1 ml-64">
                <TopBar title="Admin Dashboard" subtitle="Research & Finance Management Overview" />

                <div className="p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="border-0 bg-blue-50 text-blue-600">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">Total Projects</p>
                                        <p className="text-3xl font-bold mt-2">{totalStats.totalProjects}</p>
                                        <p className="text-xs mt-1 opacity-70">{totalStats.activeProjects} active</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 bg-orange-50 text-orange-600">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">Pending Approvals</p>
                                        <p className="text-3xl font-bold mt-2">{totalStats.pendingApprovals}</p>
                                        <p className="text-xs mt-1 opacity-70">Across all departments</p>
                                    </div>
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 bg-green-50 text-green-600">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">Total Budget</p>
                                        <p className="text-3xl font-bold mt-2">₹{(totalStats.totalBudget / 10000000).toFixed(1)}Cr</p>
                                        <p className="text-xs mt-1 opacity-70">₹{(totalStats.totalDisbursed / 10000000).toFixed(1)}Cr disbursed</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 bg-purple-50 text-purple-600">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">Departments</p>
                                        <p className="text-3xl font-bold mt-2">{departments.length}</p>
                                        <p className="text-xs mt-1 opacity-70">Research departments</p>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <BarChart3 className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card className="border-0 shadow-sm mb-8">
                        <CardHeader className="border-b bg-gray-50">
                            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                            <CardDescription>Common administrative tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {quickActions.map((action, index) => {
                                    const Icon = action.icon;
                                    return (
                                        <button
                                            key={index}
                                            onClick={action.action}
                                            className={`p-6 rounded-lg ${action.color} hover:shadow-md transition-all text-left border border-gray-200`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className={`w-12 h-12 ${action.iconBg} rounded-lg flex items-center justify-center`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-base mb-1">{action.title}</h3>
                                            <p className="text-sm opacity-80">{action.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Department-wise Projects */}
                    <Card className="border-0 shadow-sm mb-8">
                        <CardHeader className="border-b bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Department-wise Projects</CardTitle>
                                    <CardDescription>Research projects across all departments</CardDescription>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                        <Filter className="w-4 h-4 text-gray-500" />
                                        <select
                                            value={selectedDepartment}
                                            onChange={(e) => setSelectedDepartment(e.target.value)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="ALL">All Departments</option>
                                            {departments.map((dept) => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="ALL">All Months</option>
                                        {months.map((month) => (
                                            <option key={month} value={month}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Total Projects</TableHead>
                                        <TableHead>Active</TableHead>
                                        <TableHead>Completed</TableHead>
                                        <TableHead>Pending</TableHead>
                                        <TableHead>Budget</TableHead>
                                        <TableHead>Disbursed</TableHead>
                                        <TableHead>Faculty</TableHead>
                                        <TableHead className="text-right">Utilization</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((dept, index) => (
                                        <TableRow key={index} className="hover:bg-gray-50">
                                            <TableCell className="font-semibold">{dept.department}</TableCell>
                                            <TableCell>
                                                <Badge variant="default" className="bg-blue-100 text-blue-700">
                                                    {dept.totalProjects}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="success">{dept.activeProjects}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-100 text-green-700">{dept.completedProjects}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="warning">{dept.pendingApproval}</Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold text-green-600">
                                                ₹{(dept.totalBudget / 10000000).toFixed(1)}Cr
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                ₹{(dept.disbursed / 10000000).toFixed(1)}Cr
                                            </TableCell>
                                            <TableCell>{dept.faculty}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                                                            style={{ width: `${(dept.disbursed / dept.totalBudget) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-semibold">
                                                        {((dept.disbursed / dept.totalBudget) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Recent Activities */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="border-b bg-gray-50">
                            <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
                            <CardDescription>Latest updates across departments</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                {recentActivities.map((activity) => {
                                    const Icon = activity.icon;
                                    return (
                                        <div key={activity.id} className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(activity.color)}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900">{activity.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
