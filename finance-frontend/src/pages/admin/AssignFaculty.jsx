
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    UserPlus, Users, CheckCircle, Shield, Key,
    AtSign, Building2, UserCircle, PlusCircle, AlertCircle, LayoutGrid, FileText,
    Trash2
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { RESEARCH_CENTRES } from '../../constants/researchCentres';
import apiClient from '../../api/client';

const ManageFaculty = () => {
    const { setLayout } = useLayout();
    const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'projects'

    // Escape key listener for modals
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setIsAssignModalOpen(false);
                setIsPasswordModalOpen(false);
                setIsProjectAssignModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    useEffect(() => {
        setLayout("Manage Faculty", "Overview and administration of research faculty accounts");
    }, [setLayout]);

    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await apiClient.get('/projects');
                if (response.data.success) {
                    const mappedProjects = response.data.projects.map(p => ({
                        id: p._id,
                        title: p.title,
                        status: p.status,
                        assignedFacultyIds: [p.facultyId || p.userId],
                        requestedAmount: p.sanctionedBudget || 0,
                        type: p.fundingSource || 'College'
                    }));
                    setProjects(mappedProjects);
                }
            } catch (err) {
                console.error("Failed to fetch projects", err);
            }
        };
        fetchProjects();
    }, []);

    // Faculty State
    const [faculties, setFaculties] = useState([]);

    useEffect(() => {
        const fetchFaculties = async () => {
            try {
                const response = await apiClient.get('/auth/users');
                if (response.data.success) {
                    const mappedFaculties = response.data.users.map(u => ({
                        id: u._id,
                        name: u.name,
                        username: u.email.split('@')[0],
                        email: u.email,
                        centre: u.centre || 'Not Assigned',
                        status: u.status || 'Active',
                        projectsCount: 0,
                        department: u.department
                    }));
                    setFaculties(mappedFaculties);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchFaculties();
    }, []);

    // UI State
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false); // Assign Project to Faculty (One Fac -> One Proj)
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isProjectAssignModalOpen, setIsProjectAssignModalOpen] = useState(false); // Assign Faculty to Project (One Proj -> Many Fac)
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [newProject, setNewProject] = useState({ title: '', type: 'Agency', budget: '', status: 'APPROVED', agency: '' });

    const [selectedCentre, setSelectedCentre] = useState('All');

    // Multi-select for Project->Faculty assignment
    const [selectedFacultyIds, setSelectedFacultyIds] = useState([]);

    // Form State
    const [newFaculty, setNewFaculty] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        status: 'Active',
        centre: RESEARCH_CENTRES[0]
    });
    const [editFaculty, setEditFaculty] = useState(null);
    const [resetData, setResetData] = useState({
        facultyId: null,
        newPassword: ''
    });

    const handleAddProject = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.post('/projects', {
                title: newProject.title,
                description: `Agency: ${newProject.agency || 'Internal'}`,
                sanctionedBudget: parseInt(newProject.budget) || 0,
                fundingSource: newProject.type === 'Agency' ? 'PFMS' : 'INSTITUTIONAL',
                status: newProject.status,
                projectType: 'PROJECT'
            });

            if (response.data.success) {
                const p = response.data.data;
                setProjects([...projects, {
                    id: p._id,
                    title: p.title,
                    status: p.status,
                    assignedFacultyIds: [p.pi],
                    requestedAmount: p.sanctionedBudget || 0,
                    type: p.fundingSource || 'College'
                }]);
                setIsAddProjectModalOpen(false);
                setNewProject({ title: '', type: 'Agency', budget: '', status: 'APPROVED', agency: '' });
                alert("Project created and saved permanently.");
            }
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project in database.");
        }
    };

    // 1. Assign A Project TO A Faculty
    const handleAssignProjectToFaculty = async () => {
        if (selectedProject && selectedFaculty) {
            try {
                const response = await apiClient.put(`/projects/${selectedProject.id}`, {
                    facultyId: selectedFaculty.id,
                    pi: selectedFaculty.name
                });

                if (response.data.success) {
                    setProjects(projects.map(p => {
                        if (p.id === selectedProject.id) {
                            return { ...p, assignedFacultyIds: [selectedFaculty.id] };
                        }
                        return p;
                    }));

                    setFaculties(faculties.map(f =>
                        f.id === selectedFaculty.id
                            ? { ...f, projectsCount: f.projectsCount + 1 }
                            : f
                    ));

                    setIsAssignModalOpen(false);
                    setSelectedProject(null);
                    setSelectedFaculty(null);
                    alert("Assignment saved permanently.");
                }
            } catch (error) {
                console.error("Error assigning project:", error);
                alert("Failed to save assignment to database.");
            }
        }
    };

    // 2. Assign Multiple Faculty TO A Project
    const handleAssignFacultyToProject = async () => {
        if (selectedProject && selectedFacultyIds.length > 0) {
            try {
                // In this simplified model, we'll just update the project with the first selected faculty as PI
                // Real implementation would support multiple assignees if the model allows
                const response = await apiClient.put(`/projects/${selectedProject.id}`, {
                    facultyId: selectedFacultyIds[0],
                    pi: faculties.find(f => f.id === selectedFacultyIds[0])?.name || 'Assigned PI'
                });

                if (response.data.success) {
                    setProjects(projects.map(p =>
                        p.id === selectedProject.id
                            ? { ...p, assignedFacultyIds: [...p.assignedFacultyIds, ...selectedFacultyIds.filter(id => !p.assignedFacultyIds.includes(id))] }
                            : p
                    ));

                    setFaculties(faculties.map(f =>
                        selectedFacultyIds.includes(f.id)
                            ? { ...f, projectsCount: f.projectsCount + 1 }
                            : f
                    ));

                    setIsProjectAssignModalOpen(false);
                    setSelectedProject(null);
                    setSelectedFacultyIds([]);
                    alert("Team assignment saved permanently.");
                }
            } catch (error) {
                console.error("Error updating team:", error);
                alert("Failed to save team assignment.");
            }
        }
    };

    const handleAddFaculty = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.post('/auth/register', {
                name: newFaculty.name,
                email: newFaculty.email,
                password: newFaculty.password,
                role: 'FACULTY',
                department: 'Research',
                centre: newFaculty.centre
            });
            
            if (response.data.success) {
                const addedUser = response.data.user;
                setFaculties([...faculties, {
                    id: addedUser._id,
                    name: addedUser.name,
                    username: addedUser.email.split('@')[0],
                    email: addedUser.email,
                    centre: addedUser.centre || 'Not Assigned',
                    status: newFaculty.status,
                    projectsCount: 0
                }]);
                setIsAddModalOpen(false);
                setNewFaculty({ name: '', username: '', email: '', password: '', status: 'Active', centre: RESEARCH_CENTRES[0] });
            }
        } catch (error) {
            console.error("Error creating user:", error);
            alert("Failed to create faculty account: " + (error.response?.data?.message || error.message));
        }
    };

    const handleUpdateFaculty = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.put(`/auth/users/${editFaculty.id}`, {
                name: editFaculty.name,
                email: editFaculty.email,
                centre: editFaculty.centre,
                status: editFaculty.status
            });

            if (response.data.success) {
                setFaculties(faculties.map(f =>
                    f.id === editFaculty.id ? { ...editFaculty } : f
                ));
                setIsEditModalOpen(false);
                setEditFaculty(null);
            }
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update faculty profile");
        }
    };

    const handleDeleteFaculty = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this faculty account? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await apiClient.delete(`/auth/users/${id}`);
            if (response.data.success) {
                setFaculties(faculties.filter(f => f.id !== id));
                alert("Faculty account deleted successfully");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete faculty account");
        }
    };

    const handleResetPassword = (e) => {
        e.preventDefault();
        console.log(`Password reset for faculty ${resetData.facultyId} to ${resetData.newPassword}`);
        setIsPasswordModalOpen(false);
        setResetData({ facultyId: null, newPassword: '' });
    };

    // Stats Logic
    const unassignedProjectsCount = projects.filter(p => !p.assignedFacultyIds || p.assignedFacultyIds.length === 0).length;

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-[#7d1935] to-[#a01d45] text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90 text-maroon-100">Total Faculty</p>
                                    <p className="text-3xl font-bold mt-1">{faculties.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90 text-amber-50">Active Projects</p>
                                    <p className="text-3xl font-bold mt-1">{projects.filter(p => ['APPROVED', 'ACTIVE'].includes(p.status)).length}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Shield className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90 text-blue-50">Unassigned Projects</p>
                                    <p className="text-3xl font-bold mt-1">{unassignedProjectsCount}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <PlusCircle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <Card className="border-0 shadow-lg dark:bg-slate-900 mb-8 overflow-hidden">
                    <div className="border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 px-6 pt-4 pb-0">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <CardTitle className="text-xl dark:text-white mb-1">
                                    {activeTab === 'faculty' ? 'Research Faculty Directory' : 'Project Allocations'}
                                </CardTitle>
                                <CardDescription className="dark:text-gray-400">
                                    {activeTab === 'faculty'
                                        ? 'View and manage faculty accounts and security'
                                        : 'Manage project assignments and faculty allocation'}
                                </CardDescription>
                            </div>

                            {/* Tab Switcher */}
                            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center shadow-inner">
                                <button
                                    onClick={() => setActiveTab('faculty')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'faculty'
                                        ? 'bg-white dark:bg-slate-700 text-maroon-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Faculty
                                </button>
                                <button
                                    onClick={() => setActiveTab('projects')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'projects'
                                        ? 'bg-white dark:bg-slate-700 text-maroon-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Projects
                                </button>
                            </div>
                        </div>

                        {/* Actions & Filters Row */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4">
                            <div className="flex items-center gap-4">
                                {activeTab === 'faculty' && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Centre:</span>
                                        <select
                                            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-maroon-500 focus:border-maroon-500 block p-2 w-64"
                                            value={selectedCentre}
                                            onChange={(e) => setSelectedCentre(e.target.value)}
                                        >
                                            <option value="All">All Research Centres</option>
                                            {RESEARCH_CENTRES.map(centre => (
                                                <option key={centre} value={centre}>{centre}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {activeTab === 'faculty' ? (
                                <Button
                                    className="bg-maroon-600 hover:bg-maroon-700 text-white shadow-lg"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add New Faculty
                                </Button>
                            ) : (
                                <Button
                                    className="bg-maroon-600 hover:bg-maroon-700 text-white shadow-lg"
                                    onClick={() => setIsAddProjectModalOpen(true)}
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    Add New Project
                                </Button>
                            )}
                        </div>
                    </div>

                    <CardContent className="p-0">
                        {/* VIEW 1: FACULTY LIST */}
                        {activeTab === 'faculty' && (
                            <Table>
                                <TableHeader>
                                    <TableRow className="dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
                                        <TableHead className="dark:text-gray-400 pl-6">Faculty Details</TableHead>
                                        <TableHead className="dark:text-gray-400">Contact</TableHead>
                                        <TableHead className="dark:text-gray-400">Research Centre</TableHead>
                                        <TableHead className="text-center dark:text-gray-400">Projects</TableHead>
                                        <TableHead className="dark:text-gray-400">Status</TableHead>
                                        <TableHead className="text-right dark:text-gray-400 pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {faculties.filter(f =>
                                        (selectedCentre === 'All' || f.centre === selectedCentre)
                                    ).map((faculty) => (
                                        <TableRow
                                            key={faculty.id}
                                            className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800 transition-opacity duration-200 ${faculty.status === 'Inactive' ? 'opacity-50 grayscale-[0.3]' : ''}`}
                                        >
                                            <TableCell className="pl-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-maroon-100 dark:bg-maroon-900/30 flex items-center justify-center text-maroon-600 dark:text-maroon-400 font-bold">
                                                        {faculty.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold dark:text-gray-200">{faculty.name}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">{faculty.username}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                                    <AtSign className="w-3 h-3 mr-1 opacity-70" />
                                                    {faculty.email}
                                                </div>
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300 max-w-xs truncate text-xs">{faculty.centre}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="default" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0">
                                                    {projects.filter(p => p.assignedFacultyIds?.includes(faculty.id)).length}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={faculty.status === 'Active' ? 'success' : 'secondary'}
                                                    className={`border-0 cursor-help ${faculty.status === 'Active' ? 'dark:bg-green-900/30 dark:text-green-400' : 'opacity-70 text-[10px]'}`}
                                                    title={faculty.status === 'Inactive' ? "Inactive: Faculty account is disabled and cannot log in or receive new project assignments." : "Active: Faculty is currently authorized to access all tools."}
                                                >
                                                    {faculty.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6">
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={faculty.status === 'Inactive'}
                                                        className={`text-[10px] h-7 px-2 dark:border-slate-700 dark:hover:bg-slate-800 ${faculty.status === 'Inactive' ? 'cursor-not-allowed opacity-50 bg-slate-50' : ''}`}
                                                        title={faculty.status === 'Inactive' ? "Activate faculty to assign projects" : "Assign professional projects to this faculty"}
                                                        onClick={() => {
                                                            setSelectedFaculty(faculty);
                                                            setIsAssignModalOpen(true);
                                                        }}
                                                    >
                                                        <PlusCircle className="w-3 h-3 mr-1" />
                                                        Assign
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-[10px] h-7 px-2 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                        onClick={() => {
                                                            setEditFaculty({ ...faculty });
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <UserCircle className="w-3 h-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-[10px] h-7 px-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDeleteFaculty(faculty.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* VIEW 2: PROJECTS LIST (NEW) */}
                        {activeTab === 'projects' && (
                            <Table>
                                <TableHeader>
                                    <TableRow className="dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
                                        <TableHead className="dark:text-gray-400 pl-6">Project Title</TableHead>
                                        <TableHead className="dark:text-gray-400">Type</TableHead>
                                        <TableHead className="dark:text-gray-400">Budget</TableHead>
                                        <TableHead className="dark:text-gray-400">Assigned To</TableHead>
                                        <TableHead className="dark:text-gray-400">Status</TableHead>
                                        <TableHead className="text-right dark:text-gray-400 pr-6">Allocation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.filter(p => ['College', 'Agency'].includes(p.type)).map((project) => (
                                        <TableRow key={project.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                                            <TableCell className="pl-6 font-semibold dark:text-gray-200">
                                                {project.title}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`border-0 ${project.type === 'College' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'}`}>
                                                    {project.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300 font-mono text-xs">₹{(project.requestedAmount / 100000).toFixed(1)}L</TableCell>
                                            <TableCell>
                                                <div className="flex -space-x-2 overflow-hidden">
                                                    {project.assignedFacultyIds && project.assignedFacultyIds.length > 0 ? (
                                                        project.assignedFacultyIds.map((facId, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-maroon-100 flex items-center justify-center text-[9px] font-bold text-maroon-600"
                                                                title={faculties.find(f => f.id === facId)?.name || 'Unknown'}
                                                            >
                                                                <Users className="w-3 h-3" />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                                                    )}
                                                    {project.assignedFacultyIds?.length > 3 && (
                                                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600">
                                                            +{project.assignedFacultyIds.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={project.status === 'APPROVED' ? 'success' : 'secondary'}
                                                    className="border-0"
                                                >
                                                    {project.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button
                                                    size="sm"
                                                    disabled={project.status !== 'APPROVED'}
                                                    className={`h-7 px-3 text-xs ${project.status === 'APPROVED' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        setSelectedFacultyIds(project.assignedFacultyIds || []);
                                                        setIsProjectAssignModalOpen(true);
                                                    }}
                                                >
                                                    <Users className="w-3 h-3 mr-1.5" />
                                                    Manage Team
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Modals Container */}
                <div className="fixed inset-0 pointer-events-none z-50">

                    {/* Add Faculty Modal */}
                    {isAddModalOpen && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-200" onClick={() => setIsAddModalOpen(false)}>
                            <div className="max-w-md w-full" onClick={e => e.stopPropagation()}>
                                <Card className="border-0 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                                    <CardHeader className="border-b dark:border-slate-800 text-center">
                                        <div className="mx-auto w-12 h-12 bg-maroon-100 dark:bg-maroon-900/30 rounded-full flex items-center justify-center text-maroon-600 dark:text-maroon-400 mb-2">
                                            <UserPlus className="w-6 h-6" />
                                        </div>
                                        <CardTitle className="text-2xl dark:text-white font-bold">Register New Faculty</CardTitle>
                                        <CardDescription className="dark:text-gray-400">Initialize a new research faculty account</CardDescription>
                                    </CardHeader>
                                    <form onSubmit={handleAddFaculty}>
                                        <CardContent className="space-y-4 pt-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Official Name</Label>
                                                    <Input required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" value={newFaculty.name} onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Sathyabama ID</Label>
                                                    <Input required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" value={newFaculty.username} onChange={(e) => setNewFaculty({ ...newFaculty, username: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="dark:text-gray-300 text-xs">Official Email</Label>
                                                <Input type="email" required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" value={newFaculty.email} onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Password</Label>
                                                    <Input type="password" required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" value={newFaculty.password} onChange={(e) => setNewFaculty({ ...newFaculty, password: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Status</Label>
                                                    <select className="w-full h-9 px-3 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white rounded-md text-sm outline-none" value={newFaculty.status} onChange={(e) => setNewFaculty({ ...newFaculty, status: e.target.value })}>
                                                        <option value="Active">Active</option>
                                                        <option value="Inactive">Inactive</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="dark:text-gray-300 text-xs">Research Centre</Label>
                                                <select className="w-full h-9 px-3 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white rounded-md text-sm outline-none" value={newFaculty.centre} onChange={(e) => setNewFaculty({ ...newFaculty, centre: e.target.value })}>
                                                    {RESEARCH_CENTRES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </CardContent>
                                        <CardContent className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Discard</Button>
                                            <Button type="submit" size="sm" className="bg-maroon-600 hover:bg-maroon-700 text-white">Create Account</Button>
                                        </CardContent>
                                    </form>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Edit Faculty Modal */}
                    {isEditModalOpen && editFaculty && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-200" onClick={() => setIsEditModalOpen(false)}>
                            <div className="max-w-md w-full" onClick={e => e.stopPropagation()}>
                                <Card className="border-0 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                                    <CardHeader className="border-b dark:border-slate-800 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl dark:text-white font-bold">Edit Faculty Profile</CardTitle>
                                            <p className="text-xs text-slate-500 font-mono">{editFaculty.username}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}><PlusCircle className="w-5 h-5 rotate-45" /></Button>
                                    </CardHeader>
                                    <form onSubmit={handleUpdateFaculty}>
                                        <CardContent className="space-y-4 pt-6 max-h-[60vh] overflow-y-auto">
                                            <div className="space-y-2">
                                                <Label className="dark:text-gray-300 text-xs">Full Name</Label>
                                                <Input required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" value={editFaculty.name} onChange={(e) => setEditFaculty({ ...editFaculty, name: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Email Address</Label>
                                                    <Input type="email" required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9 text-xs" value={editFaculty.email} onChange={(e) => setEditFaculty({ ...editFaculty, email: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Account Status</Label>
                                                    <select className="w-full h-9 px-3 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white rounded-md text-sm outline-none" value={editFaculty.status} onChange={(e) => setEditFaculty({ ...editFaculty, status: e.target.value })}>
                                                        <option value="Active">Active</option>
                                                        <option value="Inactive">Inactive</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="dark:text-gray-300 text-xs">Research Centre</Label>
                                                <select className="w-full h-9 px-3 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white rounded-md text-xs outline-none" value={editFaculty.centre} onChange={(e) => setEditFaculty({ ...editFaculty, centre: e.target.value })}>
                                                    {RESEARCH_CENTRES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>

                                            <div className="pt-4 border-t dark:border-slate-800">
                                                <div className="flex items-center space-x-2 text-amber-600 mb-2">
                                                    <Shield className="w-4 h-4" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest">Security Override</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Reset Password</Label>
                                                    <Input
                                                        type="password"
                                                        placeholder="Leave blank to keep current"
                                                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9 text-xs"
                                                        onChange={(e) => setEditFaculty({ ...editFaculty, password: e.target.value })}
                                                    />
                                                    <p className="text-[10px] text-slate-500 italic">User will be prompted to change this on next login.</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardContent className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                                            <Button type="submit" size="sm" className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold">Update Profile</Button>
                                        </CardContent>
                                    </form>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* MODAL 1: Assign Project TO Faculty (Existing) */}
                    {isAssignModalOpen && selectedFaculty && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-200" onClick={() => setIsAssignModalOpen(false)}>
                            <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                                <Card className="border-0 shadow-2xl dark:bg-slate-900 animate-in slide-in-from-bottom-5 duration-300">
                                    <CardHeader className="border-b dark:border-slate-800 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 rounded-xl bg-maroon-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                                    {selectedFaculty.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xl dark:text-white">{selectedFaculty.name}</CardTitle>
                                                    <p className="text-xs text-slate-500">{selectedFaculty.centre}</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 h-6">
                                                {projects.filter(p => p.assignedFacultyIds?.includes(selectedFaculty.id)).length} Active Projects
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-bold dark:text-white mb-1">Approved Projects Catalog</h4>
                                            <p className="text-xs text-slate-500">Select a project to assign. Labels indicate request status for this faculty.</p>
                                        </div>

                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {projects.filter(p => ['College', 'Agency'].includes(p.type) && p.status === 'APPROVED').map((project) => {
                                                const isAssignedToThisFaculty = project.assignedFacultyIds.includes(selectedFaculty.id);
                                                const isRequestedByMe = project.requestedByIds?.includes(selectedFaculty.id);

                                                return (
                                                    <div
                                                        key={project.id}
                                                        onClick={() => !isAssignedToThisFaculty && setSelectedProject(project)}
                                                        className={`group relative p-4 rounded-xl border-2 transition-all ${selectedProject?.id === project.id
                                                            ? 'border-maroon-600 bg-maroon-50/50 dark:bg-maroon-900/20 shadow-md'
                                                            : isAssignedToThisFaculty
                                                                ? 'border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed'
                                                                : 'border-slate-200 dark:border-slate-800 hover:border-maroon-400 dark:hover:border-maroon-700 cursor-pointer overflow-hidden'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2 mb-1">
                                                                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 border-0 ${project.type === 'College' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                                                        {project.type}
                                                                    </Badge>
                                                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{project.title}</h3>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500">Budget: ₹{(project.requestedAmount / 100000).toFixed(1)}L</p>
                                                            </div>
                                                            {isAssignedToThisFaculty ? (
                                                                <div className="flex items-center text-[10px] text-slate-400 font-medium">
                                                                    <Shield className="w-3 h-3 mr-1" />
                                                                    Already Linked
                                                                </div>
                                                            ) : (
                                                                selectedProject?.id === project.id && <CheckCircle className="w-5 h-5 text-maroon-600 animate-in zoom-in duration-150" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex items-center space-x-4 pt-6 border-t dark:border-slate-800 mt-4">
                                            <Button variant="outline" className="flex-1 dark:border-slate-800 dark:hover:bg-slate-800" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                                            <Button
                                                className={`flex-1 transition-all ${selectedProject ? 'bg-maroon-600 hover:bg-maroon-700 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                disabled={!selectedProject}
                                                onClick={handleAssignProjectToFaculty}
                                            >
                                                {selectedProject ? `Assign Project` : 'Select a project'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                    <CardContent className="pt-0 pb-4 flex justify-center border-t dark:border-slate-800 pt-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-maroon-600 text-[10px]"
                                            onClick={() => setIsAssignModalOpen(false)}
                                        >
                                            Dismiss Workflow
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Add Project Modal */}
                    {isAddProjectModalOpen && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-200" onClick={() => setIsAddProjectModalOpen(false)}>
                            <div className="max-w-md w-full" onClick={e => e.stopPropagation()}>
                                <Card className="border-0 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                                    <CardHeader className="border-b dark:border-slate-800 text-center">
                                        <div className="mx-auto w-12 h-12 bg-maroon-100 dark:bg-maroon-900/30 rounded-full flex items-center justify-center text-maroon-600 dark:text-maroon-400 mb-2">
                                            <PlusCircle className="w-6 h-6" />
                                        </div>
                                        <CardTitle className="text-2xl dark:text-white font-bold">Add New Project</CardTitle>
                                        <CardDescription className="dark:text-gray-400">Register a new project for allocation</CardDescription>
                                    </CardHeader>
                                    <form onSubmit={handleAddProject}>
                                        <CardContent className="space-y-4 pt-6">
                                            <div className="space-y-2">
                                                <Label className="dark:text-gray-300 text-xs">Project Title</Label>
                                                <Input required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Type</Label>
                                                    <select className="w-full h-9 px-3 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white rounded-md text-sm outline-none" value={newProject.type} onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}>
                                                        <option value="Agency">Agency</option>
                                                        <option value="College">College</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Budget (₹)</Label>
                                                    <Input type="number" required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" value={newProject.budget} onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })} />
                                                </div>
                                            </div>
                                            {newProject.type === 'Agency' && (
                                                <div className="space-y-2">
                                                    <Label className="dark:text-gray-300 text-xs">Funding Agency</Label>
                                                    <Input required className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" placeholder="e.g. DST, SERB" value={newProject.agency} onChange={(e) => setNewProject({ ...newProject, agency: e.target.value })} />
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardContent className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddProjectModalOpen(false)}>Discard</Button>
                                            <Button type="submit" size="sm" className="bg-maroon-600 hover:bg-maroon-700 text-white">Create Project</Button>
                                        </CardContent>
                                    </form>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* MODAL 2: Assign Multiple Faculty TO Project (New) */}
                    {isProjectAssignModalOpen && selectedProject && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-200" onClick={() => setIsProjectAssignModalOpen(false)}>
                            <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                                <Card className="border-0 shadow-2xl dark:bg-slate-900 animate-in slide-in-from-bottom-5 duration-300">
                                    <CardHeader className="border-b dark:border-slate-800 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Badge variant="outline" className="mb-2 bg-indigo-50 text-indigo-700 border-0">{selectedProject.type}</Badge>
                                                <CardTitle className="text-xl dark:text-white">{selectedProject.title}</CardTitle>
                                                <p className="text-xs text-slate-500 mt-1">Manage Faculty Allocation</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">Current Team</p>
                                                <p className="text-xl font-bold dark:text-white">{selectedProject.assignedFacultyIds?.length || 0}</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-bold dark:text-white mb-1">Select Researchers</h4>
                                            <p className="text-xs text-slate-500">Choose faculty members to add to this project team.</p>
                                        </div>

                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {faculties.filter(f => f.status === 'Active').map((faculty) => {
                                                const isAssigned = selectedProject.assignedFacultyIds.includes(faculty.id);
                                                const isSelected = selectedFacultyIds.includes(faculty.id);
                                                const isActive = isAssigned || isSelected;

                                                return (
                                                    <div
                                                        key={faculty.id}
                                                        onClick={() => {
                                                            if (isAssigned) return; // Can't remove already assigned in this simple view
                                                            if (isSelected) {
                                                                setSelectedFacultyIds(selectedFacultyIds.filter(id => id !== faculty.id));
                                                            } else {
                                                                setSelectedFacultyIds([...selectedFacultyIds, faculty.id]);
                                                            }
                                                        }}
                                                        className={`group flex items-center p-3 rounded-lg border transition-all cursor-pointer ${isAssigned
                                                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                                            : isActive
                                                                ? 'bg-maroon-50 border-maroon-200 shadow-sm'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${isActive ? 'bg-maroon-600 border-maroon-600' : 'border-gray-300 bg-white'
                                                            }`}>
                                                            {isActive && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className={`text-sm font-medium ${isActive ? 'text-maroon-900' : 'text-gray-900'}`}>{faculty.name}</p>
                                                                {isAssigned && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded">Joined</span>}
                                                            </div>
                                                            <p className="text-xs text-gray-500">{faculty.centre}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex items-center space-x-4 pt-6 border-t dark:border-slate-800 mt-4">
                                            <Button variant="outline" className="flex-1 dark:border-slate-800 dark:hover:bg-slate-800" onClick={() => setIsProjectAssignModalOpen(false)}>Cancel</Button>
                                            <Button
                                                className={`flex-1 transition-all ${selectedFacultyIds.length > 0 ? 'bg-maroon-600 hover:bg-maroon-700 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                disabled={selectedFacultyIds.length === 0}
                                                onClick={handleAssignFacultyToProject}
                                            >
                                                {selectedFacultyIds.length > 0 ? `Add ${selectedFacultyIds.length - selectedProject.assignedFacultyIds.length} Researchers` : 'Select Faculty'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                    <CardContent className="pt-0 pb-4 flex justify-center border-t dark:border-slate-800 pt-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-maroon-600 text-[10px]"
                                            onClick={() => setIsProjectAssignModalOpen(false)}
                                        >
                                            Close
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Reset Password Modal */}
                    {isPasswordModalOpen && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                            <Card className="max-w-md w-full border-0 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                                <form onSubmit={handleResetPassword}>
                                    <CardHeader className="border-b dark:border-slate-800">
                                        <div className="flex items-center space-x-2 text-amber-500 mb-2">
                                            <AlertCircle className="w-5 h-5" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Security Action</span>
                                        </div>
                                        <CardTitle className="text-2xl dark:text-white">Reset Account Key</CardTitle>
                                        <CardDescription className="dark:text-gray-400">
                                            Setting new password for {faculties.find(f => f.id === resetData.facultyId)?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="space-y-2">
                                            <Label className="dark:text-gray-300">New Password</Label>
                                            <Input
                                                required
                                                type="password"
                                                placeholder="Enter new secure password"
                                                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                value={resetData.newPassword}
                                                onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                                            />
                                        </div>
                                        <p className="mt-4 text-xs text-gray-500 flex items-start">
                                            <Shield className="w-3 h-3 mr-1 mt-0.5" />
                                            This action is final and will log the user out of all devices.
                                        </p>
                                    </CardContent>
                                    <CardContent className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="dark:border-slate-700 dark:hover:bg-slate-800"
                                            onClick={() => setIsPasswordModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-amber-600 hover:bg-amber-700 text-white"
                                        >
                                            Reset Password
                                        </Button>
                                    </CardContent>
                                </form>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageFaculty;
