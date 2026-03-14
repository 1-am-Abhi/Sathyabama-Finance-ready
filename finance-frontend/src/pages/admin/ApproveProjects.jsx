import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, XCircle, Eye, Calendar, User, Clock, Info, ShieldAlert, RefreshCw, Users } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLayout } from '../../contexts/LayoutContext';
import DateFilter from '../../components/shared/DateFilter';
import { RESEARCH_CENTRES } from '../../constants/researchCentres';
import { AGENCIES } from '../../constants/agencies';
import { FACULTY_MEMBERS } from '../../constants/facultyMembers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

const ApproveProjects = () => {
    const { setLayout } = useLayout();
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState('All');
    const [selectedAgency, setSelectedAgency] = useState('All');
    const [projects, setProjects] = useState([
        {
            id: 1,
            title: 'AI-Powered Medical Diagnosis System',
            faculty: 'Dr. Priya Sharma',
            centre: 'Centre for Nano Science and Nanotechnology',
            budget: 5000000,
            submittedDate: '2024-01-15',
            status: 'PENDING',
            department: 'CSE',
            agency: 'DST',
            chequeStatus: 'Pending'
        },
        {
            id: 2,
            title: 'Renewable Energy Grid Optimization',
            faculty: 'Dr. Bharathi',
            centre: 'Centre of Excellence for Energy Research',
            budget: 7500000,
            submittedDate: '2024-01-18',
            status: 'PENDING',
            department: 'EEE',
            agency: 'ICMR',
            chequeStatus: 'Pending'
        },
        {
            id: 3,
            title: 'Blockchain for Supply Chain Management',
            faculty: 'Dr. Anita Desai',
            centre: 'Centre for Waste Management',
            budget: 4000000,
            submittedDate: '2024-01-20',
            status: 'PENDING',
            department: 'MECH',
            agency: 'AICTE',
            chequeStatus: 'Pending'
        },
        {
            id: 4,
            title: 'Smart Traffic Management System',
            faculty: 'Dr. Vikram Singh',
            centre: 'Centre for Climate Studies',
            budget: 6000000,
            submittedDate: '2024-01-10',
            status: 'APPROVED',
            department: 'OCEAN',
            agency: 'Private Industry',
            chequeStatus: 'Approved'
        },
        {
            id: 5,
            title: 'Ocean Plastic Cleanup Drone',
            faculty: 'Dr. R. Kumar',
            centre: 'Centre for Ocean Research',
            budget: 3500000,
            submittedDate: '2024-02-01',
            status: 'REJECTED',
            department: 'OCEAN',
            agency: 'University Fund',
            chequeStatus: 'Pending'
        }
    ]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [manageFacultyModal, setManageFacultyModal] = useState({ isOpen: false, project: null, selectedFaculty: '' });

    const handleFacultyAssignment = () => {
        if (!manageFacultyModal.selectedFaculty) return;

        // Update the project's faculty in the projects array
        setProjects(projects.map(p =>
            p.id === manageFacultyModal.project.id
                ? { ...p, faculty: manageFacultyModal.selectedFaculty }
                : p
        ));

        // Close modal and reset
        setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' });
    };

    React.useEffect(() => {
        setLayout(
            "Project Proposals",
            "View status of research project proposals"
        );
    }, [setLayout]);

    const filteredProjects = projects.filter(p => {
        const matchesDate = !selectedDate || p.submittedDate === selectedDate;
        const matchesCentre = selectedCentre === 'All' || p.centre === selectedCentre;
        const matchesAgency = selectedAgency === 'All' || p.agency === selectedAgency;
        return matchesDate && matchesCentre && matchesAgency;
    });

    const pendingProjects = filteredProjects.filter(p => p.status === 'PENDING');

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-8 pt-6">

                {/* Polished Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-0 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Pending Approval</p>
                                    <p className="text-3xl font-bold mt-2">{pendingProjects.length}</p>
                                    <p className="text-[10px] mt-1 opacity-60">Awaiting Agency Decision</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-100/50 dark:bg-amber-800/20 rounded-xl flex items-center justify-center">
                                    <Clock className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Approved Projects</p>
                                    <p className="text-3xl font-bold mt-2">
                                        {filteredProjects.filter(p => p.status === 'APPROVED').length}
                                    </p>
                                    <p className="text-[10px] mt-1 opacity-60">Sanctioned by Agencies</p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-100/50 dark:bg-emerald-800/20 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 ring-1 ring-slate-100 dark:ring-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Rejected Projects</p>
                                    <p className="text-3xl font-bold mt-2">
                                        {filteredProjects.filter(p => p.status === 'REJECTED').length}
                                    </p>
                                    <p className="text-[10px] mt-1 opacity-60">Not Approved</p>
                                </div>
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center">
                                    <XCircle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-0 shadow-sm dark:bg-slate-900">
                    <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-lg font-semibold dark:text-white">Project Proposals</CardTitle>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Projects are approved by Agencies. Admin has view-only access.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <CardDescription className="dark:text-gray-400">View project status and agency details</CardDescription>
                            </div>
                            <div className="flex flex-nowrap items-center gap-2">
                                <div className="w-32">
                                    <select
                                        className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 text-xs rounded-md focus:ring-maroon-500 focus:border-maroon-500 block p-2"
                                        value={selectedAgency}
                                        onChange={(e) => setSelectedAgency(e.target.value)}
                                    >
                                        <option value="All">All Agencies</option>
                                        {AGENCIES.map(agency => (
                                            <option key={agency} value={agency}>{agency}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-32">
                                    <select
                                        className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 text-xs rounded-md focus:ring-maroon-500 focus:border-maroon-500 block p-2"
                                        value={selectedCentre}
                                        onChange={(e) => setSelectedCentre(e.target.value)}
                                    >
                                        <option value="All">All Centres</option>
                                        {RESEARCH_CENTRES.map(centre => (
                                            <option key={centre} value={centre}>{centre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-36 relative">
                                    <DateFilter
                                        selectedDate={selectedDate}
                                        onChange={setSelectedDate}
                                        placeholder="Filter by Date"
                                    />
                                    {selectedDate && (
                                        <button
                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maroon-600"
                                            onClick={() => setSelectedDate(null)}
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-slate-800">
                                    <TableHead className="dark:text-gray-400">Project Title</TableHead>
                                    <TableHead className="dark:text-gray-400">Faculty</TableHead>
                                    <TableHead className="dark:text-gray-400">Agency</TableHead>
                                    <TableHead className="dark:text-gray-400">Budget</TableHead>
                                    <TableHead className="dark:text-gray-400">Submitted</TableHead>
                                    <TableHead className="dark:text-gray-400">Status</TableHead>
                                    <TableHead className="dark:text-gray-400 text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProjects.map((project) => (
                                    <TableRow
                                        key={project.id}
                                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800 cursor-pointer"
                                        onClick={() => setSelectedProject(project)}
                                    >
                                        <TableCell className="font-semibold dark:text-gray-200">{project.title}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="dark:text-gray-300">{project.faculty}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="dark:text-gray-300 dark:border-slate-700">
                                                {project.agency}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold dark:text-gray-200">₹{(project.budget / 100000).toFixed(1)}L</TableCell>
                                        <TableCell className="dark:text-gray-300">{new Date(project.submittedDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    project.status === 'APPROVED' ? 'success' :
                                                        project.status === 'REJECTED' ? 'destructive' :
                                                            'secondary'
                                                }
                                                className="border-0"
                                            >
                                                {project.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {project.status === 'APPROVED' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setManageFacultyModal({
                                                            isOpen: true,
                                                            project: project,
                                                            selectedFaculty: project.faculty
                                                        });
                                                    }}
                                                >
                                                    <Users className="w-4 h-4 mr-1" />
                                                    Manage Faculty
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {/* Projects by Status - Pie Chart */}
                    <Card className="border-0 shadow-sm dark:bg-slate-900">
                        <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                            <CardTitle className="text-lg dark:text-white">Projects by Status</CardTitle>
                            <CardDescription className="dark:text-gray-400">Distribution of project approvals</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Pending', value: filteredProjects.filter(p => p.status === 'PENDING').length, color: '#f59e0b' },
                                                { name: 'Approved', value: filteredProjects.filter(p => p.status === 'APPROVED').length, color: '#10b981' },
                                                { name: 'Rejected', value: filteredProjects.filter(p => p.status === 'REJECTED').length, color: '#64748b' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {[
                                                { name: 'Pending', value: filteredProjects.filter(p => p.status === 'PENDING').length, color: '#f59e0b' },
                                                { name: 'Approved', value: filteredProjects.filter(p => p.status === 'APPROVED').length, color: '#10b981' },
                                                { name: 'Rejected', value: filteredProjects.filter(p => p.status === 'REJECTED').length, color: '#64748b' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: document.documentElement.classList.contains('dark') ? '#334155' : '#ffffff',
                                                border: `1px solid ${document.documentElement.classList.contains('dark') ? '#475569' : '#e2e8f0'}`,
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Projects by Agency - Bar Chart */}
                    <Card className="border-0 shadow-sm dark:bg-slate-900">
                        <CardHeader className="border-b bg-gray-50 dark:bg-slate-800/50 dark:border-slate-800">
                            <CardTitle className="text-lg dark:text-white">Projects by Agency</CardTitle>
                            <CardDescription className="dark:text-gray-400">Funding agency distribution</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={
                                        AGENCIES.map(agency => ({
                                            agency: agency.length > 15 ? agency.substring(0, 12) + '...' : agency,
                                            count: filteredProjects.filter(p => p.agency === agency).length
                                        })).filter(d => d.count > 0)
                                    }>
                                        <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'} />
                                        <XAxis
                                            dataKey="agency"
                                            stroke={document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a'}
                                            fontSize={11}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis stroke={document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a'} fontSize={12} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: document.documentElement.classList.contains('dark') ? '#334155' : '#ffffff',
                                                border: `1px solid ${document.documentElement.classList.contains('dark') ? '#475569' : '#e2e8f0'}`,
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="count" fill="#6366f1" name="Projects" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Project Details Modal */}
                {selectedProject && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <Card className="max-w-2xl w-full border-0 shadow-2xl dark:bg-slate-900">
                            <CardHeader className="border-b dark:border-slate-800">
                                <CardTitle className="text-2xl dark:text-white">{selectedProject.title}</CardTitle>
                                <CardDescription className="dark:text-gray-400">
                                    <span className="flex items-center gap-2 mt-1">
                                        <ShieldAlert className={`w-4 h-4 ${selectedProject.status === 'APPROVED' ? 'text-green-500' : selectedProject.status === 'REJECTED' ? 'text-red-500' : 'text-amber-500'}`} />
                                        Read-Only View • {selectedProject.status === 'APPROVED' ? `Approved by ${selectedProject.agency}` : selectedProject.status === 'REJECTED' ? `Rejected by ${selectedProject.agency}` : `Pending Decision by ${selectedProject.agency}`}
                                    </span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Principal Investigator</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">{selectedProject.faculty}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Funding Agency</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">{selectedProject.agency}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Research Centre</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">{selectedProject.centre}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Budget Requested</p>
                                        <p className="text-base font-semibold mt-1 text-green-600 dark:text-green-400">
                                            ₹{(selectedProject.budget / 100000).toFixed(1)} Lakhs
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Submitted On</p>
                                        <p className="text-base font-semibold mt-1 dark:text-white">
                                            {new Date(selectedProject.submittedDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Current Status</p>
                                        <Badge className="mt-1" variant={selectedProject.status === 'APPROVED' ? 'success' : selectedProject.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                                            {selectedProject.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="pt-4 border-t dark:border-slate-800">
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Project Description</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        This research project aims to develop innovative solutions in the field of {selectedProject.centre}.
                                        The project will span 24 months and involve collaboration with industry partners under the {selectedProject.agency} grant scheme.
                                    </p>
                                </div>

                                {/* Cheque Processing & Disbursal Status */}
                                {selectedProject.status === 'APPROVED' && (
                                    <div className="pt-4 border-t dark:border-slate-800">
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-5 border border-blue-100 dark:border-blue-900/30">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Cheque Processing & Disbursal Status</h3>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs font-medium mb-2">
                                                    <span className="text-green-600 dark:text-green-400">Pending</span>
                                                    <span className={selectedProject.chequeStatus === 'Approved' || selectedProject.chequeStatus === 'Disbursed' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}>Approved</span>
                                                    <span className={selectedProject.chequeStatus === 'Disbursed' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}>Disbursed</span>
                                                </div>
                                                <div className="relative w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="absolute h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 transition-all duration-500"
                                                        style={{
                                                            width: selectedProject.chequeStatus === 'Pending' ? '33%' :
                                                                selectedProject.chequeStatus === 'Approved' ? '66%' : '100%'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Current Status */}
                                            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-blue-200 dark:border-blue-900/40">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Current Cheque Status</p>
                                                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{selectedProject.chequeStatus}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                                    <Button variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => setSelectedProject(null)}>
                                        Close Details
                                    </Button>
                                    {selectedProject.status === 'APPROVED' && (
                                        <Button
                                            variant="outline"
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            onClick={() => {
                                                setManageFacultyModal({
                                                    isOpen: true,
                                                    project: selectedProject,
                                                    selectedFaculty: selectedProject.faculty
                                                });
                                                setSelectedProject(null); // Close detail modal
                                            }}
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Manage Faculty
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Manage Faculty Modal */}
                {manageFacultyModal.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' })}>
                        <Card className="max-w-2xl w-full border-0 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                            <CardHeader className="border-b dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-bold dark:text-white mb-2">Manage Faculty Assignment</CardTitle>
                                        <CardDescription className="dark:text-gray-400">
                                            Assign or reassign Principal Investigator for this project
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' })}
                                        className="dark:hover:bg-slate-800"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {/* Project Info */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Project</p>
                                    <p className="text-lg font-bold mt-1 dark:text-white">{manageFacultyModal.project?.title}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Current PI</p>
                                            <p className="text-sm font-semibold dark:text-gray-300">{manageFacultyModal.project?.faculty}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">₹{(manageFacultyModal.project?.budget / 100000).toFixed(1)}L</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Faculty Selection */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Select New Principal Investigator
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                        value={manageFacultyModal.selectedFaculty}
                                        onChange={(e) => setManageFacultyModal({ ...manageFacultyModal, selectedFaculty: e.target.value })}
                                    >
                                        <option value="">-- Select Faculty --</option>
                                        {FACULTY_MEMBERS.map((faculty) => (
                                            <option key={faculty.id} value={faculty.name}>
                                                {faculty.name} ({faculty.department}) - {faculty.centre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Available Faculty List */}
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Available Faculty Members</p>
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                                        {FACULTY_MEMBERS.map((faculty) => (
                                            <div
                                                key={faculty.id}
                                                className={`p-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${manageFacultyModal.selectedFaculty === faculty.name ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                                                    }`}
                                                onClick={() => setManageFacultyModal({ ...manageFacultyModal, selectedFaculty: faculty.name })}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-sm dark:text-white">{faculty.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{faculty.department} • {faculty.centre}</p>
                                                    </div>
                                                    {manageFacultyModal.selectedFaculty === faculty.name && (
                                                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t dark:border-slate-800">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' })}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                        onClick={handleFacultyAssignment}
                                        disabled={!manageFacultyModal.selectedFaculty || manageFacultyModal.selectedFaculty === manageFacultyModal.project?.faculty}
                                    >
                                        <Users className="w-4 h-4 mr-2" />
                                        Assign Faculty
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>

    );
};

export default ApproveProjects;
