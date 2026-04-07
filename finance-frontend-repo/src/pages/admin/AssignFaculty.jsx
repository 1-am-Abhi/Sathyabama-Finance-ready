import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { UserPlus, Users, CheckCircle } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';

const AssignFaculty = () => {
    const [projects, setProjects] = useState([
        {
            id: 1,
            title: 'AI-Powered Medical Diagnosis System',
            status: 'APPROVED',
            assignedFaculty: null,
            budget: 5000000
        },
        {
            id: 2,
            title: 'Smart Traffic Management System',
            status: 'APPROVED',
            assignedFaculty: 'Dr. Vikram Singh',
            budget: 6000000
        },
    ]);

    const [availableFaculty] = useState([
        { id: 1, name: 'Dr. Priya Sharma', department: 'Computer Science', projects: 2 },
        { id: 2, name: 'Dr. Bharti', department: 'Electrical Engineering', projects: 3 },
        { id: 3, name: 'Dr. Anita Desai', department: 'Information Technology', projects: 1 },
        { id: 4, name: 'Dr. Vikram Singh', department: 'Civil Engineering', projects: 2 },
        { id: 5, name: 'Dr. Meera Patel', department: 'Mechanical Engineering', projects: 1 },
    ]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedFaculty, setSelectedFaculty] = useState(null);

    const handleAssign = () => {
        if (selectedProject && selectedFaculty) {
            setProjects(projects.map(p =>
                p.id === selectedProject.id
                    ? { ...p, assignedFaculty: selectedFaculty.name }
                    : p
            ));
            setSelectedProject(null);
            setSelectedFaculty(null);
        }
    };

    const unassignedProjects = projects.filter(p => !p.assignedFaculty);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        Assign Faculty
                    </h1>
                    <p className="text-gray-600 mt-2 text-lg">Assign faculty members to approved research projects</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Unassigned Projects</p>
                                    <p className="text-3xl font-bold mt-1">{unassignedProjects.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Available Faculty</p>
                                    <p className="text-3xl font-bold mt-1">{availableFaculty.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Assigned Projects</p>
                                    <p className="text-3xl font-bold mt-1">
                                        {projects.filter(p => p.assignedFaculty).length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Projects List */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl">Approved Projects</CardTitle>
                            <CardDescription>Select a project to assign faculty</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => !project.assignedFaculty && setSelectedProject(project)}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedProject?.id === project.id
                                            ? 'border-purple-500 bg-purple-50'
                                            : project.assignedFaculty
                                                ? 'border-green-200 bg-green-50 cursor-not-allowed'
                                                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900">{project.title}</h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Budget: ₹{(project.budget / 100000).toFixed(1)}L
                                                </p>
                                                {project.assignedFaculty && (
                                                    <div className="mt-2 flex items-center space-x-2">
                                                        <Badge variant="success">Assigned</Badge>
                                                        <span className="text-sm font-semibold text-green-700">
                                                            {project.assignedFaculty}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {!project.assignedFaculty && selectedProject?.id === project.id && (
                                                <CheckCircle className="w-5 h-5 text-purple-600" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Faculty List */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl">Available Faculty</CardTitle>
                            <CardDescription>
                                {selectedProject
                                    ? `Select faculty for: ${selectedProject.title}`
                                    : 'Select a project first'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {availableFaculty.map((faculty) => (
                                    <div
                                        key={faculty.id}
                                        onClick={() => selectedProject && setSelectedFaculty(faculty)}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedFaculty?.id === faculty.id
                                            ? 'border-purple-500 bg-purple-50 cursor-pointer'
                                            : selectedProject
                                                ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer'
                                                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{faculty.name}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{faculty.department}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Current Projects: {faculty.projects}
                                                </p>
                                            </div>
                                            {selectedFaculty?.id === faculty.id && (
                                                <CheckCircle className="w-5 h-5 text-purple-600" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedProject && selectedFaculty && (
                                <Button
                                    className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    onClick={handleAssign}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Assign {selectedFaculty.name} to Project
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AssignFaculty;
