import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, XCircle, Eye, Calendar, User } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import TopBar from '../../components/shared/TopBar';

const ApproveProjects = () => {
    const [projects, setProjects] = useState([
        {
            id: 1,
            title: 'AI-Powered Medical Diagnosis System',
            faculty: 'Dr. Priya Sharma',
            department: 'Computer Science',
            budget: 5000000,
            submittedDate: '2024-01-15',
            status: 'PENDING'
        },
        {
            id: 2,
            title: 'Renewable Energy Grid Optimization',
            faculty: 'Dr. Bharti',
            department: 'Electrical Engineering',
            budget: 7500000,
            submittedDate: '2024-01-18',
            status: 'PENDING'
        },
        {
            id: 3,
            title: 'Blockchain for Supply Chain Management',
            faculty: 'Dr. Anita Desai',
            department: 'Information Technology',
            budget: 4000000,
            submittedDate: '2024-01-20',
            status: 'PENDING'
        },
        {
            id: 4,
            title: 'Smart Traffic Management System',
            faculty: 'Dr. Vikram Singh',
            department: 'Civil Engineering',
            budget: 6000000,
            submittedDate: '2024-01-10',
            status: 'APPROVED'
        },
    ]);

    const [selectedProject, setSelectedProject] = useState(null);

    const handleApprove = (projectId) => {
        setProjects(projects.map(p =>
            p.id === projectId ? { ...p, status: 'APPROVED' } : p
        ));
        setSelectedProject(null);
    };

    const handleReject = (projectId) => {
        setProjects(projects.map(p =>
            p.id === projectId ? { ...p, status: 'REJECTED' } : p
        ));
        setSelectedProject(null);
    };

    const pendingProjects = projects.filter(p => p.status === 'PENDING');

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />

            <div className="flex-1 ml-64">
                <TopBar title="Approve Projects" subtitle="Review and approve research project proposals" />

                <div className="p-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card className="border-0 bg-orange-50 text-orange-600">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">Pending Approval</p>
                                        <p className="text-3xl font-bold mt-2">{pendingProjects.length}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 bg-green-50 text-green-600">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">Approved</p>
                                        <p className="text-3xl font-bold mt-2">
                                            {projects.filter(p => p.status === 'APPROVED').length}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 bg-red-50 text-red-600">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">Rejected</p>
                                        <p className="text-3xl font-bold mt-2">
                                            {projects.filter(p => p.status === 'REJECTED').length}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                        <XCircle className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Projects Table */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="border-b bg-gray-50">
                            <CardTitle className="text-lg font-semibold">Project Proposals</CardTitle>
                            <CardDescription>Review and take action on submitted projects</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Title</TableHead>
                                        <TableHead>Faculty</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Budget</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.map((project) => (
                                        <TableRow key={project.id} className="hover:bg-gray-50">
                                            <TableCell className="font-semibold">{project.title}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span>{project.faculty}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{project.department}</TableCell>
                                            <TableCell className="font-semibold">₹{(project.budget / 100000).toFixed(1)}L</TableCell>
                                            <TableCell>{new Date(project.submittedDate).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        project.status === 'APPROVED' ? 'success' :
                                                            project.status === 'REJECTED' ? 'destructive' :
                                                                'default'
                                                    }
                                                >
                                                    {project.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedProject(project)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View
                                                    </Button>
                                                    {project.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700"
                                                                onClick={() => handleApprove(project.id)}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleReject(project.id)}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Project Details Modal */}
                    {selectedProject && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <Card className="max-w-2xl w-full border-0 shadow-2xl">
                                <CardHeader>
                                    <CardTitle className="text-2xl">{selectedProject.title}</CardTitle>
                                    <CardDescription>Project Details</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500">Principal Investigator</p>
                                            <p className="text-base font-semibold mt-1">{selectedProject.faculty}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500">Department</p>
                                            <p className="text-base font-semibold mt-1">{selectedProject.department}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500">Budget Requested</p>
                                            <p className="text-base font-semibold mt-1 text-green-600">
                                                ₹{(selectedProject.budget / 100000).toFixed(1)} Lakhs
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500">Submitted On</p>
                                            <p className="text-base font-semibold mt-1">
                                                {new Date(selectedProject.submittedDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-semibold text-gray-500 mb-2">Project Description</p>
                                        <p className="text-sm text-gray-700">
                                            This research project aims to develop innovative solutions in the field of {selectedProject.department}.
                                            The project will span 24 months and involve collaboration with industry partners.
                                        </p>
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-4">
                                        <Button variant="outline" onClick={() => setSelectedProject(null)}>
                                            Close
                                        </Button>
                                        {selectedProject.status === 'PENDING' && (
                                            <>
                                                <Button
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleApprove(selectedProject.id)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Approve Project
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleReject(selectedProject.id)}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Reject Project
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApproveProjects;
