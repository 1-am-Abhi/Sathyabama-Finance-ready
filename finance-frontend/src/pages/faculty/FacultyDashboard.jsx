import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { FileText, DollarSign, Clock, TrendingUp, Upload, ArrowRight } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

const FacultyDashboard = () => {
    const { setLayout } = useLayout();

    React.useEffect(() => {
        setLayout("Faculty Dashboard", "Manage your research projects and funding");
    }, [setLayout]);
    const stats = [
        {
            title: 'My Projects',
            value: '3',
            subtitle: '2 active, 1 completed',
            icon: FileText,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100'
        },
        {
            title: 'Total Funding',
            value: '₹45L',
            subtitle: 'Across all projects',
            icon: DollarSign,
            color: 'bg-green-50 text-green-600',
            iconBg: 'bg-green-100'
        },
        {
            title: 'Pending Requests',
            value: '2',
            subtitle: 'Fund requests awaiting',
            icon: Clock,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100'
        },
        {
            title: 'Utilization',
            value: '68%',
            subtitle: 'Budget utilized',
            icon: TrendingUp,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100'
        },
    ];

    const myProjects = [
        {
            id: 1,
            title: 'AI-Powered Healthcare Diagnostics System',
            department: 'Computer Science & Engineering',
            budget: 5000000,
            utilized: 3400000,
            status: 'ACTIVE',
            progress: 68,
            startDate: '15 Jan 2024'
        },
        {
            id: 2,
            title: 'Machine Learning for Predictive Analytics',
            department: 'Computer Science & Engineering',
            budget: 3500000,
            utilized: 2100000,
            status: 'ACTIVE',
            progress: 60,
            startDate: '10 Feb 2024'
        },
        {
            id: 3,
            title: 'IoT-Based Smart Campus System',
            department: 'Computer Science & Engineering',
            budget: 4000000,
            utilized: 4000000,
            status: 'COMPLETED',
            progress: 100,
            startDate: '05 Dec 2023'
        },
    ];

    const fundRequests = [
        { id: 1, project: 'AI Healthcare Diagnostics', amount: 150000, purpose: 'Equipment purchase', status: 'PENDING' },
        { id: 2, project: 'ML Predictive Analytics', amount: 200000, purpose: 'Software licenses', status: 'PENDING' },
        { id: 3, project: 'AI Healthcare Diagnostics', amount: 100000, purpose: 'Research materials', status: 'APPROVED' },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            <div className="flex-1">

                <div className="p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <Card key={index} className={`border-0 ${stat.color}`}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium opacity-80">{stat.title}</p>
                                                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                                                <p className="text-xs mt-1 opacity-70">{stat.subtitle}</p>
                                            </div>
                                            <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* My Projects */}
                        <div className="lg:col-span-2">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-semibold flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                            My Projects
                                        </CardTitle>
                                        <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                                            View All <ArrowRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Your active and completed research projects</p>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {myProjects.map((project) => (
                                            <div key={project.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-900">{project.title}</h3>
                                                        <p className="text-sm text-gray-600 mt-1">{project.department}</p>
                                                        <p className="text-xs text-gray-500 mt-1">Started: {project.startDate}</p>
                                                    </div>
                                                    <Badge className={
                                                        project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                            project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-700'
                                                    }>
                                                        {project.status}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Total Budget</p>
                                                        <p className="text-sm font-bold text-gray-900">₹{(project.budget / 100000).toFixed(1)}L</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Utilized</p>
                                                        <p className="text-sm font-bold text-green-600">₹{(project.utilized / 100000).toFixed(1)}L</p>
                                                    </div>
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

                                                <div className="flex space-x-2 mt-4">
                                                    <Button size="sm" variant="outline" className="flex-1">
                                                        View Details
                                                    </Button>
                                                    {project.status === 'ACTIVE' && (
                                                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                                                            Request Funds
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Fund Requests Sidebar */}
                        <div>
                            <Card className="border-0 shadow-sm mb-6">
                                <CardHeader className="border-b bg-green-50">
                                    <CardTitle className="text-lg font-semibold flex items-center">
                                        <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                                        Fund Requests
                                    </CardTitle>
                                    <p className="text-xs text-gray-600 mt-1">Your funding requests status</p>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        {fundRequests.map((request) => (
                                            <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm text-gray-900">{request.project}</p>
                                                        <p className="text-xs text-gray-600 mt-1">{request.purpose}</p>
                                                        <p className="text-sm font-bold text-green-600 mt-1">₹{(request.amount / 1000).toFixed(0)}K</p>
                                                    </div>
                                                </div>
                                                <Badge className={
                                                    request.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                }>
                                                    {request.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                    <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        New Fund Request
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Documents */}
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="border-b bg-blue-50">
                                    <CardTitle className="text-lg font-semibold flex items-center">
                                        <Upload className="w-5 h-5 mr-2 text-blue-600" />
                                        Documents
                                    </CardTitle>
                                    <p className="text-xs text-gray-600 mt-1">Upload project documents</p>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="text-center py-6">
                                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-sm text-gray-600 mb-4">Upload project reports, invoices, and other documents</p>
                                        <Button variant="outline" className="w-full">
                                            Upload Document
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;
