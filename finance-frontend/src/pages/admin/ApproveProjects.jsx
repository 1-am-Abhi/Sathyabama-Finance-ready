import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, XCircle, Eye, Calendar, User, Clock, Info, ShieldAlert, RefreshCw, Users, Brain, Sparkles, TrendingUp, Download, FileCheck, BookOpen, Edit2 } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLayout } from '../../contexts/LayoutContext';
import { usePipeline } from '../../contexts/PipelineContext';
import DateFilter from '../../components/shared/DateFilter';
import { useCentres } from '../../constants/researchCentres';
import { AGENCIES } from '../../constants/agencies';
import { FACULTY_MEMBERS } from '../../constants/facultyMembers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import AIResultModal from '../../components/shared/AIResultModal';
import { generateProjectSummary, analyzeProjectRisk, detectDuplicateProposal, predictFundingSuccess } from '../../services/aiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const ApproveProjects = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const { projects: pipelineProjects, updateProject, isLoading } = usePipeline();
    const { showToast, ToastPortal } = useToast();
    const { centres: dynamicCentres } = useCentres();
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState('All');
    const [selectedAgency, setSelectedAgency] = useState('All');

    // Map DB fields to UI expected fields
    const projects = (pipelineProjects || []).map(p => ({
        id: p._id || p.id,
        title: p.title,
        faculty: p.pi || p.faculty || 'Unknown',
        facultyId: p.facultyId,
        userId: p.userId,
        centre: p.centre,
        budget: p.sanctionedBudget || p.budget || 0,
        submittedDate: p.createdAt ? p.createdAt.substring(0, 10) : (p.submittedDate || new Date().toISOString().substring(0, 10)),
        status: p.status === 'ACTIVE' ? 'APPROVED' : p.status, // Map ACTIVE to APPROVED for UI
        department: p.department,
        agency: p.fundingSource || p.agency || 'Unknown',
        chequeStatus: p.chequeStatus || 'Pending',
        proofUploaded: p.proofUploaded,
        proofData: p.proofData,
        proofStatus: p.proofStatus,
        proofRemarks: p.proofRemarks
    }));

    const [selectedProject, setSelectedProject] = useState(null);
    const [manageFacultyModal, setManageFacultyModal] = useState({ isOpen: false, project: null, selectedFaculty: '' });
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });
    const [proofRejectModalOpen, setProofRejectModalOpen] = useState(false);
    const [proofRemarks, setProofRemarks] = useState('');

    const [pendingMetrics, setPendingMetrics] = useState([]);
    const [isMetricsLoading, setIsMetricsLoading] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState(null);

    const fetchPendingMetrics = async () => {
        setIsMetricsLoading(true);
        try {
            const res = await apiClient.get('/academic-metrics/pending');
            setPendingMetrics(res.data.data || []);
        } catch (error) {
            console.error('Fetch pending metrics failed', error);
        } finally {
            setIsMetricsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchPendingMetrics();
    }, []);

    const handleApproveMetric = async (id) => {
        try {
            await apiClient.put(`/academic-metrics/${id}/approve`);
            const metric = pendingMetrics.find(m => m._id === id);
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Your Academic Record for cycle ${metric?.cycle} has been APPROVED!`,
                actionUrl: '/faculty/academic-support',
                targetUserId: metric?.facultyId
            });
            fetchPendingMetrics();
            setSelectedMetric(null);
            showToast('Academic Record Approved!');
        } catch (error) {
            console.error(error);
        }
    };

    const handleRejectMetric = async (id, remarks) => {
        try {
            await apiClient.put(`/academic-metrics/${id}/reject`, { remarks });
            const metric = pendingMetrics.find(m => m._id === id);
            addNotification({
                role: 'FACULTY',
                type: 'rejection',
                message: `Your Academic Record for cycle ${metric?.cycle} was REJECTED: ${remarks}`,
                actionUrl: '/faculty/academic-support',
                targetUserId: metric?.facultyId
            });
            fetchPendingMetrics();
            setSelectedMetric(null);
            showToast('Academic Record Rejected.', 'warning');
        } catch (error) {
            console.error(error);
        }
    };

    const handleFacultyAssignment = async () => {
        if (!manageFacultyModal.selectedFaculty) return;
        try {
            await updateProject({
                projectId: manageFacultyModal.project.id,
                updates: { faculty: manageFacultyModal.selectedFaculty }
            });
            setManageFacultyModal({ isOpen: false, project: null, selectedFaculty: '' });
            showToast('Faculty assigned successfully!');
        } catch (error) {
            console.error(error);
        }
    };

    const handleApprove = async (id) => {
        try {
            await updateProject({ projectId: id, updates: { status: 'ACTIVE' }});
            const proj = projects.find(p => p.id === id);
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Project Proposal "${proj?.title}" is now ACTIVE!`,
                actionUrl: '/faculty/projects',
                targetUserId: proj?.facultyId || proj?.userId
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredProjects.map(p => ({
            'Project ID': p.id,
            'Title': p.title,
            'Principal Investigator': p.faculty,
            'Funding Agency': p.agency,
            'Research Centre': p.centre,
            'Budget (₹)': p.budget,
            'Status': p.status,
            'Submitted Date': p.submittedDate
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Projects');
        XLSX.writeFile(wb, `Projects_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleReject = async (id) => {
        try {
            await updateProject({ projectId: id, updates: { status: 'REJECTED' }});
            const proj = projects.find(p => p.id === id);
            addNotification({
                role: 'FACULTY',
                type: 'rejection',
                message: `Project Proposal "${proj?.title}" was REJECTED.`,
                actionUrl: '/faculty/projects',
                targetUserId: proj?.facultyId || proj?.userId
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleVerifyProof = async (id) => {
        try {
            await updateProject({ projectId: id, updates: { proofStatus: 'VERIFIED' } });
            if (selectedProject?.id === id) {
                setSelectedProject({ ...selectedProject, proofStatus: 'VERIFIED' });
            }
            showToast('Proof Verified successfully!');
            const proj = projects.find(p => p.id === id);
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Your research artifact for "${proj?.title}" was VERIFIED.`,
                actionUrl: `/faculty/projects`,
                targetUserId: proj?.facultyId || proj?.userId
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleRejectProof = async () => {
        if (!selectedProject) return;
        try {
            await updateProject({ 
                projectId: selectedProject.id, 
                updates: { 
                    proofStatus: 'REJECTED', 
                    proofRemarks,
                    proofUploaded: false 
                } 
            });
            setProofRejectModalOpen(false);
            setSelectedProject(null);
            showToast('Proof Rejected. Faculty notified for re-upload.', 'warning');
            addNotification({
                role: 'FACULTY',
                type: 'rejection',
                message: `Research proof for "${selectedProject.title}" REJECTED: ${proofRemarks}`,
                actionUrl: `/faculty/projects`,
                targetUserId: selectedProject?.facultyId || selectedProject?.userId
            });
        } catch (error) {
            console.error(error);
        }
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

    if (isLoading) return <div className="p-8 text-center">Loading Projects Data...</div>;

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <ToastPortal />
            <div className="p-8 pt-6">

                {/* Pending Academic Metric Updates */}
                {pendingMetrics.length > 0 && (
                    <Card className="border-0 shadow-lg dark:bg-slate-900 mb-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 ring-1 ring-indigo-500/20">
                        <CardHeader className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">Academic Metric Approvals</CardTitle>
                                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 italic mt-0.5">
                                            {pendingMetrics.length} faculty members have submitted pedagogical audit updates
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest italic h-10 px-6 rounded-xl"
                                    onClick={() => setSelectedMetric(pendingMetrics[0])}
                                >
                                    Review All Updates
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0">
                            <div className="flex flex-wrap gap-3">
                                {pendingMetrics.map(m => (
                                    <div 
                                        key={m._id} 
                                        onClick={() => setSelectedMetric(m)}
                                        className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-indigo-500/10 rounded-xl cursor-pointer hover:bg-indigo-500/10 transition-colors flex items-center gap-3 group"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">{m.facultyName || 'Faculty Member'}</span>
                                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[8px] font-black">{m.cycle}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                                        className="h-9 px-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-md text-xs outline-none"
                                        value={selectedCentre}
                                        onChange={(e) => setSelectedCentre(e.target.value)}
                                    >
                                        <option value="All">All Centres</option>
                                        {dynamicCentres.map(c => <option key={c} value={c}>{c}</option>)}
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
                                <Button
                                    onClick={(e) => { e.stopPropagation(); handleExportExcel(); }}
                                    variant="outline"
                                    className="h-10 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100/50"
                                >
                                    <Download className="w-4 h-4 mr-2" /> Export Excel
                                </Button>
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
                                    <TableHead className="dark:text-gray-400 text-right min-w-[380px]">Actions</TableHead>
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
                                        <TableCell className="text-right">
                                            <div className="actions-cell justify-end">
                                                {project.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs action-btn"
                                                            onClick={(e) => { e.stopPropagation(); handleReject(project.id); }}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs action-btn"
                                                            onClick={(e) => { e.stopPropagation(); handleApprove(project.id); }}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </>
                                                )}
                                                {project.status === 'APPROVED' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 action-btn"
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
                                                        Faculty
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-indigo-400 hover:bg-indigo-500/10 text-[10px] h-7 font-black action-btn"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setAiModal({ open: true, loading: true, result: null });
                                                        const r = await generateProjectSummary(project);
                                                        setAiModal({ open: true, loading: false, result: r });
                                                    }}
                                                >
                                                    <Brain className="w-3 h-3 mr-1" /> AI Summary
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-amber-400 hover:bg-amber-500/10 text-[10px] h-7 font-black action-btn"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setAiModal({ open: true, loading: true, result: null });
                                                        const r = await analyzeProjectRisk(project);
                                                        setAiModal({ open: true, loading: false, result: r });
                                                    }}
                                                >
                                                    <ShieldAlert className="w-3 h-3 mr-1" /> Risk
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-emerald-400 hover:bg-emerald-500/10 text-[10px] h-7 font-black action-btn"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setAiModal({ open: true, loading: true, result: null });
                                                        const r = await detectDuplicateProposal(project);
                                                        setAiModal({ open: true, loading: false, result: r });
                                                    }}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" /> Duplicate
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-fuchsia-400 hover:bg-fuchsia-500/10 text-[10px] h-7 font-black action-btn"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setAiModal({ open: true, loading: true, result: null });
                                                        const r = await predictFundingSuccess(project);
                                                        setAiModal({ open: true, loading: false, result: r });
                                                    }}
                                                >
                                                    <TrendingUp className="w-3 h-3 mr-1" /> Predict
                                                </Button>
                                            </div>
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
                                            ].filter(item => item.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            minAngle={15}
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

                                {selectedProject.proofUploaded && (
                                    <div className="pt-4 border-t dark:border-slate-800">
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Documentary Evidence / Paper</p>
                                        <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/50">
                                            {selectedProject.proofData?.startsWith('data:image') ? (
                                                <img src={selectedProject.proofData} className="max-h-64 mx-auto rounded-lg mb-4" alt="Proof" />
                                            ) : (
                                                <div className="flex flex-col items-center py-6">
                                                   <BookOpen className="w-12 h-12 text-slate-500 mb-2" />
                                                   <p className="text-xs text-slate-400 font-bold uppercase italic">Research Artifact Uploaded (PDF/Doc)</p>
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-center gap-3">
                                                <Button size="sm" variant="outline" className="border-indigo-400 text-indigo-500" onClick={() => window.open(selectedProject.proofData)}>
                                                    <Eye className="w-3 h-3 mr-1" /> View Artifact
                                                </Button>
                                                {selectedProject.proofStatus !== 'VERIFIED' && (
                                                    <div className="flex gap-2 border-l pl-3 ml-1">
                                                        <Button size="sm" variant="destructive" onClick={() => setProofRejectModalOpen(true)}>Reject</Button>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleVerifyProof(selectedProject.id)}>Verify</Button>
                                                    </div>
                                                )}
                                                {selectedProject.proofStatus === 'VERIFIED' && (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">Verified Securely</Badge>
                                                )}
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

            {/* AI Result Modal */}
            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />

            {/* Proof Reject Modal */}
            <Dialog open={proofRejectModalOpen} onOpenChange={setProofRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Research Artifact</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="researchProofRemarks">Reason for Proof Rejection</Label>
                        <Textarea
                            id="researchProofRemarks"
                            placeholder="e.g. Invalid document, poor quality..."
                            className="mt-2"
                            value={proofRemarks}
                            onChange={(e) => setProofRemarks(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProofRejectModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRejectProof} disabled={!proofRemarks.trim()}>Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Academic Metric Detail Modal */}
            {selectedMetric && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 w-full max-w-4xl shadow-2xl mx-auto my-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                                    <BookOpen className="w-7 h-7 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Pedagogical Audit Review</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic mt-0.5">Faculty: {selectedMetric.facultyName || 'Unknown'} • Cycle {selectedMetric.cycle}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMetric(null)} className="p-3 hover:bg-white/10 rounded-2xl text-slate-400 transition-colors">
                                <XCircle className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Quantitative Section */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-maroon-500 italic flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Quantitative Core Metrics
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Theory Load', val: selectedMetric.theorySubjects },
                                        { label: 'Practical Load', val: selectedMetric.practicalSubjects },
                                        { label: 'UG Projects', val: selectedMetric.ugProjects },
                                        { label: 'PG Projects', val: selectedMetric.pgProjects },
                                        { label: 'Internships', val: selectedMetric.internships },
                                        { label: 'Exam Duty', val: selectedMetric.examDuty },
                                        { label: 'PhD Ongoing', val: selectedMetric.phdOngoing },
                                        { label: 'PhD Completed', val: selectedMetric.phdCompleted },
                                    ].map((stat, i) => (
                                        <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">{stat.label}</p>
                                            <p className="text-xl font-black text-white italic tracking-tighter mt-1">{stat.val || 0}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Qualitative Section */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 italic flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Qualitative Strategic Impacts
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { label: 'International Visits', val: selectedMetric.internationalVisit },
                                        { label: 'Fellowships / Awards', val: selectedMetric.fellowship },
                                        { label: 'Coordination Roles', val: selectedMetric.coordinators },
                                        { label: 'Seed Grants / Consultancy', val: selectedMetric.grants },
                                    ].map((f, i) => (
                                        <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic mb-2">{f.label}</p>
                                            <p className="text-xs font-bold text-slate-300 italic leading-relaxed uppercase tracking-tighter">{f.val || 'N/A'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Reviewer Remarks / Feedback</label>
                                <textarea 
                                    className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl font-bold italic text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-none text-sm"
                                    placeholder="Enter feedback for the faculty member..."
                                    id="metricRemarks"
                                />
                            </div>
                            
                            <div className="flex gap-4">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 h-14 border-white/10 text-slate-400 hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest italic"
                                    onClick={() => setSelectedMetric(null)}
                                >
                                    Close Review
                                </Button>
                                <Button 
                                    className="flex-1 h-14 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-rose-900/40"
                                    onClick={() => {
                                        const rem = document.getElementById('metricRemarks').value;
                                        handleRejectMetric(selectedMetric._id, rem);
                                    }}
                                >
                                    <XCircle className="w-4 h-4 mr-3" /> Reject Metrics
                                </Button>
                                <Button 
                                    className="flex-[2] h-14 bg-indigo-700 hover:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-indigo-900/40"
                                    onClick={() => handleApproveMetric(selectedMetric._id)}
                                >
                                    <CheckCircle className="w-4 h-4 mr-3" /> Approve & Integrate
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApproveProjects;
