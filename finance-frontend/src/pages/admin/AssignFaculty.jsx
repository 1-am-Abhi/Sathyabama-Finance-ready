
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
    Trash2, Sparkles
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useCentres } from '../../constants/researchCentres';
import apiClient from '../../api/client';

const ManageFaculty = () => {
    const { setLayout } = useLayout();
    const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'projects' | 'events'

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
    const [events, setEvents] = useState([]);
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await apiClient.get('/projects');
                if (response.data.success) {
                    const projectsArray = response.data.data || response.data.projects || [];
                    const mappedProjects = projectsArray.map(p => ({
                        id: p._id,
                        title: p.title,
                        status: p.status,
                        assignedFacultyIds: (p.members || []).map(m => m.userId),
                        piId: (p.members || []).find(m => m.role === 'PI')?.userId,
                        requestedAmount: p.sanctionedBudget || 0,
                        type: p.fundingSource || 'College'
                    }));
                    setProjects(mappedProjects);
                }
            } catch (err) {
                console.error("Failed to fetch projects", err);
            }
        };
        const fetchEvents = async () => {
            try {
                const response = await apiClient.get('/event-requests');
                if (response.data.success) {
                    const eventsArray = response.data.data || [];
                    const mappedEvents = eventsArray.filter(e => e.status === 'APPROVED').map(e => ({
                        id: e._id,
                        title: e.eventTitle,
                        status: e.status,
                        assignedFacultyIds: (e.members || []).map(m => m.userId),
                        piId: (e.members || []).find(m => m.role === 'PI')?.userId || e.facultyId,
                        requestedAmount: e.approvedAmount || 0,
                        type: e.fundingType || 'College Funded'
                    }));
                    setEvents(mappedEvents);
                }
            } catch (err) {
                console.error("Failed to fetch events", err);
            }
        };

        fetchProjects();
        fetchEvents();
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
                        projectsCount: (u.projectsCount || 0) + (u.eventsCount || 0),
                        department: u.department,
                        role: u.role
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
    const [newProject, setNewProject] = useState({ title: '', type: 'Agency', budget: '', status: 'ACTIVE', agency: '', assignedFacultyId: '' });

    const [selectedCentre, setSelectedCentre] = useState('All');

    // Multi-select for Project->Faculty assignment
    const [selectedFacultyIds, setSelectedFacultyIds] = useState([]);
    const [selectedPiId, setSelectedPiId] = useState(null);

    // Form State
    const { centres: dynamicCentres } = useCentres();

    const [newFaculty, setNewFaculty] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'FACULTY',
        status: 'Active',
        centre: dynamicCentres[0]
    });
    const [editFaculty, setEditFaculty] = useState(null);
    const [resetData, setResetData] = useState({
        facultyId: null,
        newPassword: ''
    });

    const handleAddProject = async (e) => {
        e.preventDefault();
        try {
            const assignedFaculty = faculties.find(f => f.id === newProject.assignedFacultyId);
            const response = await apiClient.post('/projects', {
                title: newProject.title,
                description: `Agency: ${newProject.agency || 'Internal'}`,
                sanctionedBudget: parseInt(newProject.budget) || 0,
                fundingSource: newProject.type === 'Agency' ? 'PFMS' : 'INSTITUTIONAL',
                status: 'ACTIVE', // Admin-created projects are auto-approved
                projectType: 'PROJECT',
                facultyId: assignedFaculty?.id || null,
                pi: assignedFaculty?.name || 'Admin Created'
            });

            if (response.data.success) {
                const p = response.data.data;
                setProjects([...projects, {
                    id: p._id,
                    title: p.title,
                    status: p.status,
                    assignedFacultyIds: [p.facultyId || p.userId].filter(Boolean),
                    requestedAmount: p.sanctionedBudget || 0,
                    type: newProject.type
                }]);
                setIsAddProjectModalOpen(false);
                setNewProject({ title: '', type: 'Agency', budget: '', status: 'ACTIVE', agency: '', assignedFacultyId: '' });
                showToast('Project created and assigned successfully.');
            }
        } catch (error) {
            console.error("Error creating project:", error);
            showToast('Failed to create project. Please try again.', 'error');
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
                    showToast('Faculty assigned to project successfully.');
                }
            } catch (error) {
                console.error("Error assigning project:", error);
                showToast('Failed to save assignment.', 'error');
            }
        }
    };

    // 2. Assign Multiple Faculty TO A Project
    const handleAssignFacultyToProject = async () => {
        if (selectedProject && (selectedPiId || selectedFacultyIds.length > 0)) {
            try {
                const isEvent = !!events.find(e => e.id === selectedProject.id);
                const endpoint = isEvent ? `/event-requests/${selectedProject.id}/members` : `/projects/${selectedProject.id}/members`;
                
                const response = await apiClient.put(endpoint, {
                    piId: selectedPiId,
                    memberIds: selectedFacultyIds
                });

                if (response.data.success) {
                    const updatedMembers = response.data.data;
                    const updateList = (list) => list.map(p =>
                        p.id === selectedProject.id
                            ? { 
                                ...p, 
                                assignedFacultyIds: updatedMembers.map(m => m.userId),
                                piId: updatedMembers.find(m => m.role === 'PI')?.userId
                              }
                            : p
                    );

                    if (isEvent) setEvents(updateList(events));
                    else setProjects(updateList(projects));

                    setIsProjectAssignModalOpen(false);
                    setSelectedProject(null);
                    setSelectedFacultyIds([]);
                    setSelectedPiId(null);
                    showToast('Project team updated successfully.');
                }
            } catch (error) {
                console.error("Error updating team:", error);
                showToast('Failed to save team assignment.', 'error');
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
                role: newFaculty.role,
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
                    projectsCount: 0,
                    role: addedUser.role
                }]);
                setIsAddModalOpen(false);
                setNewFaculty({ name: '', username: '', email: '', password: '', role: 'FACULTY', status: 'Active', centre: dynamicCentres[0] });
            }
        } catch (error) {
            console.error("Error creating user:", error);
            showToast('Failed to create faculty account: ' + (error.response?.data?.message || error.message), 'error');
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
            showToast('Failed to update faculty profile.', 'error');
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
                showToast('Faculty account deleted successfully.');
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            showToast('Failed to delete faculty account.', 'error');
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
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold animate-in slide-in-from-top-2 duration-300 ${
                    toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                }`}>
                    {toast.type === 'error' ? '✕' : '✓'} {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100 text-base leading-none">&times;</button>
                </div>
            )}
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
                                    {activeTab === 'faculty' ? 'Research Faculty Directory' : activeTab === 'projects' ? 'Project Allocations' : 'Event Allocations'}
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
                                <button
                                    onClick={() => setActiveTab('events')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'events'
                                        ? 'bg-white dark:bg-slate-700 text-maroon-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Events
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
                                            {dynamicCentres.map(centre => (
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
                            ) : activeTab === 'projects' ? (
                                <Button
                                    className="bg-maroon-600 hover:bg-maroon-700 text-white shadow-lg"
                                    onClick={() => setIsAddProjectModalOpen(true)}
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    Add New Project
                                </Button>
                            ) : activeTab === 'events' ? (
                                <Button
                                    className="bg-maroon-600 hover:bg-maroon-700 text-white shadow-lg opacity-50 cursor-not-allowed"
                                    disabled
                                    title="Events must be requested by faculty and approved via Event Requests"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Institutional Events
                                </Button>
                            ) : null}
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
                                                        <div className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase font-black opacity-80">{faculty.role}</div>
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
                                                    {faculty.projectsCount}
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
                                    {projects.map((project) => (
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
                                                    disabled={project.status !== 'APPROVED' && project.status !== 'ACTIVE'}
                                                    className={`h-7 px-3 text-xs ${(project.status === 'APPROVED' || project.status === 'ACTIVE') ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        setSelectedFacultyIds(project.assignedFacultyIds || []);
                                                        setSelectedPiId(project.piId || null);
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

                        {/* VIEW 3: EVENTS LIST (NEW) */}
                        {activeTab === 'events' && (
                            <Table>
                                <TableHeader>
                                    <TableRow className="dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
                                        <TableHead className="dark:text-gray-400 pl-6">Event Title</TableHead>
                                        <TableHead className="dark:text-gray-400">Funding</TableHead>
                                        <TableHead className="dark:text-gray-400">Approved Fund</TableHead>
                                        <TableHead className="dark:text-gray-400">Assigned Team</TableHead>
                                        <TableHead className="dark:text-gray-400">Status</TableHead>
                                        <TableHead className="text-right dark:text-gray-400 pr-6">Allocation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.map((event) => (
                                        <TableRow key={event.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                                            <TableCell className="pl-6 font-semibold dark:text-gray-200">
                                                {event.title}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`border-0 ${event.type === 'College Funded' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                                    {event.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="dark:text-green-400 font-bold text-xs italic">
                                                {event.requestedAmount > 0 ? `₹${event.requestedAmount.toLocaleString()}` : <span className="opacity-40">N/A</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex -space-x-2 overflow-hidden">
                                                    {event.assignedFacultyIds && event.assignedFacultyIds.length > 0 ? (
                                                        event.assignedFacultyIds.map((facId, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-emerald-100 flex items-center justify-center text-[9px] font-bold text-emerald-600"
                                                                title={faculties.find(f => f.id === facId)?.name || 'Unknown'}
                                                            >
                                                                <Users className="w-3 h-3" />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-0">APPROVED</Badge>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button
                                                    size="sm"
                                                    className="h-7 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800"
                                                    onClick={() => {
                                                        setSelectedProject(event);
                                                        setSelectedFacultyIds(event.assignedFacultyIds || []);
                                                        setSelectedPiId(event.piId || null);
                                                        setIsProjectAssignModalOpen(true);
                                                    }}
                                                >
                                                    <Users className="w-3 h-3 mr-1.5" />
                                                    Manage Team
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {events.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic text-sm">
                                                No approved events available for team allocation.
                                            </TableCell>
                                        </TableRow>
                                    )}
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
                                        <CardTitle className="text-2xl dark:text-white font-bold">Register User</CardTitle>
                                        <CardDescription className="dark:text-gray-400">Initialize a new administrative or research account</CardDescription>
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
                                                    <Label className="dark:text-gray-300 text-xs">Role</Label>
                                                    <select className="w-full h-9 px-3 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white rounded-md text-sm outline-none" value={newFaculty.role} onChange={(e) => setNewFaculty({ ...newFaculty, role: e.target.value })}>
                                                        <option value="FACULTY">Faculty</option>
                                                        <option value="ADMIN">Admin</option>
                                                        <option value="FINANCE_OFFICER">Finance Officer</option>
                                                    </select>
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
                                                    {dynamicCentres.map(c => <option key={c} value={c}>{c}</option>)}
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
                                                    {dynamicCentres.map(c => <option key={c} value={c}>{c}</option>)}
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
                                                    <Input className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9" placeholder="e.g. DST, SERB" value={newProject.agency} onChange={(e) => setNewProject({ ...newProject, agency: e.target.value })} />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Label className="dark:text-gray-300 text-xs">Assign Faculty (Principal Investigator)</Label>
                                                <select
                                                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white rounded-md text-sm outline-none"
                                                    value={newProject.assignedFacultyId}
                                                    onChange={(e) => setNewProject({ ...newProject, assignedFacultyId: e.target.value })}
                                                >
                                                    <option value="">— Select Faculty (Optional) —</option>
                                                    {faculties.filter(f => f.status === 'Active' && f.name !== 'Dr. Bharathi').map(f => (
                                                        <option key={f.id} value={f.id}>{f.name} — {f.centre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                                ✓ Admin-created projects are <strong>automatically approved</strong> — no review needed.
                                            </div>
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
                                                const isPi = selectedPiId === faculty.id;
                                                const isMember = selectedFacultyIds.includes(faculty.id) && !isPi;
                                                const isActive = isPi || isMember;

                                                return (
                                                    <div
                                                        key={faculty.id}
                                                        className={`group flex items-center p-3 rounded-lg border transition-all cursor-pointer ${
                                                            isActive
                                                                ? 'bg-maroon-50 border-maroon-200 shadow-sm'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <div 
                                                            className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${isActive ? 'bg-maroon-600 border-maroon-600' : 'border-gray-300 bg-white'}`}
                                                            onClick={() => {
                                                                if (selectedFacultyIds.includes(faculty.id)) {
                                                                    setSelectedFacultyIds(selectedFacultyIds.filter(id => id !== faculty.id));
                                                                    if (selectedPiId === faculty.id) setSelectedPiId(null);
                                                                } else {
                                                                    setSelectedFacultyIds([...selectedFacultyIds, faculty.id]);
                                                                }
                                                            }}
                                                        >
                                                            {isActive && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                        </div>
                                                        <div className="flex-1" onClick={() => {
                                                            if (!selectedFacultyIds.includes(faculty.id)) {
                                                                setSelectedFacultyIds([...selectedFacultyIds, faculty.id]);
                                                            }
                                                        }}>
                                                            <div className="flex items-center justify-between">
                                                                <p className={`text-sm font-medium ${isActive ? 'text-maroon-900' : 'text-gray-900'}`}>{faculty.name}</p>
                                                                <div className="flex items-center space-x-2">
                                                                    {isActive && (
                                                                        <Button
                                                                            variant={isPi ? "default" : "outline"}
                                                                            size="sm"
                                                                            className={`h-6 text-[10px] px-2 ${isPi ? 'bg-maroon-600 text-white' : 'text-slate-500'}`}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isPi) setSelectedPiId(null);
                                                                                else setSelectedPiId(faculty.id);
                                                                            }}
                                                                        >
                                                                            {isPi ? 'Principal Investigator' : 'Make PI'}
                                                                        </Button>
                                                                    )}
                                                                    {!isPi && isMember && (
                                                                        <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-700">Team Member</Badge>
                                                                    )}
                                                                </div>
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
