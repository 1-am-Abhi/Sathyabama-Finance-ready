import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BarChart3, Download, FileText, TrendingUp, DollarSign, Users } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';

const AdminReports = () => {
    const [selectedReport, setSelectedReport] = useState('overview');

    const stats = {
        totalProjects: 45,
        activeProjects: 28,
        totalBudget: 125000000,
        disbursedAmount: 87500000,
        totalFaculty: 35,
        pendingApprovals: 7
    };

    const projectsByDepartment = [
        { department: 'Computer Science', projects: 12, budget: 35000000 },
        { department: 'Electrical Engineering', projects: 8, budget: 28000000 },
        { department: 'Mechanical Engineering', projects: 10, budget: 25000000 },
        { department: 'Civil Engineering', projects: 7, budget: 20000000 },
        { department: 'Information Technology', projects: 8, budget: 17000000 },
    ];

    const recentProjects = [
        { id: 1, title: 'AI Medical Diagnosis', faculty: 'Dr. Priya Sharma', budget: 5000000, status: 'ACTIVE', progress: 65 },
        { id: 2, title: 'Smart Traffic System', faculty: 'Dr. Vikram Singh', budget: 6000000, status: 'ACTIVE', progress: 45 },
        { id: 3, title: 'Renewable Energy Grid', faculty: 'Dr. Bharti', budget: 7500000, status: 'ACTIVE', progress: 30 },
        { id: 4, title: 'Blockchain Supply Chain', faculty: 'Dr. Anita Desai', budget: 4000000, status: 'PENDING', progress: 10 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            Reports & Analytics
                        </h1>
                        <p className="text-gray-600 mt-2 text-lg">Comprehensive overview of research and finance data</p>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>

                {/* Report Type Selector */}
                <div className="flex space-x-3 mb-8 overflow-x-auto pb-2">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'projects', label: 'Projects', icon: FileText },
                        { id: 'finance', label: 'Finance', icon: DollarSign },
                        { id: 'faculty', label: 'Faculty', icon: Users },
                    ].map((report) => {
                        const Icon = report.icon;
                        return (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${selectedReport === report.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{report.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Projects</p>
                                    <p className="text-3xl font-bold mt-1">{stats.totalProjects}</p>
                                    <p className="text-xs opacity-80 mt-1">{stats.activeProjects} active</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Budget</p>
                                    <p className="text-3xl font-bold mt-1">₹{(stats.totalBudget / 10000000).toFixed(1)}Cr</p>
                                    <p className="text-xs opacity-80 mt-1">
                                        ₹{(stats.disbursedAmount / 10000000).toFixed(1)}Cr disbursed
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Faculty Members</p>
                                    <p className="text-3xl font-bold mt-1">{stats.totalFaculty}</p>
                                    <p className="text-xs opacity-80 mt-1">Across all departments</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Projects by Department */}
                <Card className="border-0 shadow-lg mb-8">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                            Projects by Department
                        </CardTitle>
                        <CardDescription>Distribution of research projects across departments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Projects</TableHead>
                                    <TableHead>Total Budget</TableHead>
                                    <TableHead>Avg. Budget</TableHead>
                                    <TableHead className="text-right">Share</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projectsByDepartment.map((dept, index) => (
                                    <TableRow key={index} className="hover:bg-gray-50">
                                        <TableCell className="font-semibold">{dept.department}</TableCell>
                                        <TableCell>
                                            <Badge variant="default">{dept.projects}</Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-green-600">
                                            ₹{(dept.budget / 10000000).toFixed(1)}Cr
                                        </TableCell>
                                        <TableCell>₹{(dept.budget / dept.projects / 100000).toFixed(1)}L</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                                                        style={{ width: `${(dept.budget / stats.totalBudget) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-semibold">
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
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                            Recent Projects
                        </CardTitle>
                        <CardDescription>Latest research projects and their progress</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentProjects.map((project) => (
                                <div key={project.id} className="p-5 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{project.title}</h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                PI: {project.faculty} | Budget: ₹{(project.budget / 100000).toFixed(1)}L
                                            </p>
                                        </div>
                                        <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>
                                            {project.status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                            <span>Progress</span>
                                            <span className="font-semibold">{project.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                                                style={{ width: `${project.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminReports;
