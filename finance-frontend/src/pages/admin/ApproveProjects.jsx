import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, XCircle, Eye, Calendar, User, Clock, Info, ShieldAlert } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import DateFilter from '../../components/shared/DateFilter';
import { RESEARCH_CENTRES } from '../../constants/researchCentres';
import { AGENCIES } from '../../constants/agencies';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

const ApproveProjects = () => {
    const { setLayout } = useLayout();
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState('All');
    const [selectedAgency, setSelectedAgency] = useState('All');
    const [projects] = useState([
        {
            id: 1,
            title: 'AI-Powered Medical Diagnosis System',
            faculty: 'Dr. Priya Sharma',
            centre: 'Centre for Nano Science and Nanotechnology',
            budget: 5000000,
            submittedDate: '2024-01-15',
            status: 'PENDING',
            department: 'CSE',
            agency: 'DST'
        },
        {
            id: 2,
            title: 'Renewable Energy Grid Optimization',
            faculty: 'Dr. Bharti',
            centre: 'Centre of Excellence for Energy Research',
            budget: 7500000,
            submittedDate: '2024-01-18',
            status: 'PENDING',
            department: 'EEE',
            agency: 'ICMR'
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
            agency: 'AICTE'
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
            agency: 'Private Industry'
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
            agency: 'University Fund'
        }
    ]);

    const [selectedProject, setSelectedProject] = useState(null);

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
                                    <TableHead className="dark:text-gray-400 text-right">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProjects.map((project) => (
                                    <TableRow key={project.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:border-slate-800">
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
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="hover:bg-slate-100 dark:hover:bg-slate-800"
                                                onClick={() => setSelectedProject(project)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

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

                                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                                    <Button variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => setSelectedProject(null)}>
                                        Close Details
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
