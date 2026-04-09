import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
    CheckCircle, Briefcase, TrendingUp, Award, BarChart2, Brain, Sparkles, X, ChevronRight, Calendar,
    Upload, FileCheck, AlertTriangle, Clock, Layers, BookOpen, Plus, Edit2, Building
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import AcademicWorkModal from '../../components/faculty/NewProjectModal';
import AIResultModal from '../../components/shared/AIResultModal';
import { predictResearchImpact, predictGrantSuccess } from '../../services/aiService';
import { usePipeline } from '../../contexts/PipelineContext';
import { formatCurrency } from '../../utils/format';
import apiClient from '../../api/client';
import { toast } from 'sonner';

const FacultyProjects = () => {
    const { setLayout } = useLayout();

    useEffect(() => {
        setLayout("My Academic Portfolio", "Manage research projects, publications, and professional contributions");
    }, [setLayout]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedWork, setSelectedWork] = useState(null);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });
    const [selectedYear, setSelectedYear] = useState('All');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [viewedProject, setViewedProject] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const { projects, isLoading, updateProject } = usePipeline();
    const [localProjects, setLocalProjects] = useState([]);

    useEffect(() => {
        if (projects) {
            setLocalProjects(projects);
        }
    }, [projects]);

    const filteredProjects = useMemo(() => {
        const safeProjects = localProjects || [];
        if (selectedYear === 'All') return safeProjects;
        return safeProjects.filter(p => {
            const year = p.publicationYear || (p.startDate ? new Date(p.startDate).getFullYear() : null) || new Date(p.createdAt).getFullYear();
            return year === Number(selectedYear);
        });
    }, [localProjects, selectedYear]);

    const stats = useMemo(() => {
        const safeProjects = localProjects || [];
        const totalBudgetSum = safeProjects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0);
        return [
            { title: 'Total Works', value: safeProjects.length, icon: Layers, color: 'text-maroon-600', bg: 'bg-maroon-50' },
            { title: 'Active Projects', value: safeProjects.filter(p => ['ACTIVE', 'Active', 'Approved', 'APPROVED'].includes(p.status)).length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { title: 'Publications', value: safeProjects.filter(p => (p.projectType || '').toUpperCase() === 'PUBLICATION' || (p.status || '').toUpperCase() === 'PUBLISHED').length, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { title: 'Total Budget', value: formatCurrency(totalBudgetSum), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' }
        ];
    }, [localProjects]);

    const handleExportExcel = () => {
        const dataToExport = filteredProjects.map(item => ({
            'Project ID': item._id || item.id,
            'Title': item.title,
            'Type': item.projectType,
            'PI': item.pi,
            'Department': item.department,
            'Status': item.status,
            'Funding Source': item.fundingSource,
            'Sanctioned Budget (₹)': item.sanctionedBudget,
            'Released Budget (₹)': item.releasedBudget,
            'Publisher': item.publisher,
            'Publication Year': item.publicationYear
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Academic Portfolio');
        XLSX.writeFile(wb, `Portfolio_${user?.name?.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleWorkSubmit = async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Map fundingSource ensuring DB-valid enum values
            const rawSource = data.fundingSource || 'INSTITUTIONAL';
            const fundingSourceMap = {
                'PFMS': 'PFMS',
                'INSTITUTIONAL': 'INSTITUTIONAL',
                'OTHERS': 'OTHERS',
                // Legacy compatibility
                'DIRECTOR_INNOVATION': 'OTHERS',
                'DIRECTOR_INNOVATION_FUND': 'OTHERS',
                'Director Innovation Fund': 'OTHERS',
                'Director Innovation': 'OTHERS',
            };
            const fundingSource = fundingSourceMap[rawSource] || 'INSTITUTIONAL';

            if (modalMode === 'create') {
                const payload = {
                    title: data.title,
                    description: data.description || 'Research project submission',
                    pi: user?.name || 'Faculty Member',
                    department: user?.department || data.department || 'Research',
                    centre: user?.centre || 'Research Centre',
                    sanctionedBudget: Number(data.amount || data.budget || 0),
                    status: 'PENDING',
                    fundingSource,
                    projectType: (data.mainType || 'PROJECT').toUpperCase(),
                    publisher: data.publisher || null,
                    publicationYear: Number(data.year || new Date().getFullYear()),
                    verificationScreenshot: data.verificationScreenshot || null
                };
                const res = await apiClient.post('/projects', payload);
                if (!res.data.success) throw new Error(res.data.message);
                setLocalProjects(prev => [res.data.data, ...prev]);
                toast.success('Work submitted successfully! Pending admin approval.');
            } else {
                const payload = {
                    title: data.title,
                    description: data.description || 'Updated research project',
                    sanctionedBudget: Number(data.amount || data.budget || 0),
                    fundingSource,
                    projectType: (data.mainType || data.type || 'PROJECT').toUpperCase(),
                    publisher: data.publisher || null,
                    publicationYear: Number(data.year || new Date().getFullYear()),
                    verificationScreenshot: data.verificationScreenshot || null
                };
                const res = await apiClient.put(`/projects/${data._id || data.id}`, payload);
                if (!res.data.success) throw new Error(res.data.message);
                setLocalProjects(prev => prev.map(p => (p._id === (data._id || data.id)) ? res.data.data : p));
                toast.success('Work updated successfully!');
            }
            setIsModalOpen(false);
            setSelectedWork(null);
        } catch (error) {
            const errData = error.response?.data;
            let msg = errData?.message || error.message || 'Failed to save work';
            if (errData?.errors && Array.isArray(errData.errors)) {
                msg = errData.errors.map(e => e.message).join(', ');
            }
            toast.error(`Submission failed: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProofUpload = async (id, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const base64data = reader.result;
                await apiClient.put(`/projects/${id}`, { 
                    proofUploaded: true, 
                    proofData: base64data,
                    proofStatus: 'PENDING'
                });
                setLocalProjects(localProjects.map(p => p._id === id ? { 
                    ...p, 
                    proofUploaded: true, 
                    proofData: base64data,
                    proofStatus: 'PENDING' 
                } : p));
                toast.success('Success: Artifact Uploaded for Verification');
            } catch (err) {
                console.error(err);
                toast.error('Upload failed');
            }
        };
    };

    return (
        <div className="p-6 space-y-8">
            {/* Stats Grid - Admin Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className={`border-0 ${stat.bg} ${stat.color} transition-all duration-300 hover:shadow-lg`}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-80">{stat.title}</p>
                                        <p className="text-3xl font-bold mt-2">{stat.value}</p>
                                    </div>
                                    <div className={`w-12 h-12 ${stat.bg} brightness-95 rounded-lg flex items-center justify-center`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Project Management Table */}
            <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold dark:text-white">Detailed Academic Record</CardTitle>
                        <CardDescription className="dark:text-gray-400">Comprehensive list of your research and academic contributions</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <select 
                            className="bg-gray-50 dark:bg-slate-800 border-0 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-maroon-500"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="All">All Years</option>
                            {[2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Button onClick={handleExportExcel} variant="outline" className="h-10 border-gray-200 text-gray-400 hover:text-maroon-600 font-black text-[10px] uppercase tracking-widest italic">
                            Export Excel
                        </Button>
                        <Button
                            onClick={() => { setModalMode('create'); setSelectedWork(null); setIsModalOpen(true); }}
                            className="bg-maroon-600 hover:bg-maroon-700"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Work
                        </Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-500 font-bold italic">
                                <th className="px-6 py-4">Title & Classification</th>
                                <th className="px-6 py-4">Entity/Agency</th>
                                <th className="px-6 py-4">Financials/Year</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filteredProjects.map((work) => (
                                <tr key={work._id} onClick={() => { setViewedProject(work); setShowDetailsModal(true); }} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tighter italic">{work.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 py-0 border-slate-200 text-slate-400">{work.projectType || 'PROJECT'}</Badge>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-slate-500 italic uppercase">{work.fundingSource || work.publisher || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {work.sanctionedBudget ? (
                                            <p className="text-sm font-bold text-maroon-600 italic">{formatCurrency(work.sanctionedBudget)}</p>
                                        ) : (
                                            <p className="text-sm font-bold text-slate-400 italic">{work.publicationYear || 'N/A'}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Status badge + Impact badge */}
                                        <div className="flex flex-col gap-1.5">
                                            <Badge className={`border-0 text-[10px] font-black italic px-3 py-1 rounded-full w-fit ${
                                            work.status === 'ACTIVE' || work.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 
                                            work.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                            work.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {work.status === 'PENDING' ? 'Pending Approval' : work.status}
                                        </Badge>
                                            {work.sanctionedBudget > 3000000 && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 w-fit">
                                                    <Award className="w-2.5 h-2.5" /> High Impact
                                                </span>
                                            )}
                                            {work.sanctionedBudget >= 1000000 && work.sanctionedBudget <= 3000000 && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 w-fit">
                                                    <BarChart2 className="w-2.5 h-2.5" /> Moderate Impact
                                                </span>
                                            )}
                                            {work.projectType === 'PUBLICATION' && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 border border-sky-200 text-sky-700 w-fit">
                                                    <BookOpen className="w-2.5 h-2.5" /> Emerging Research
                                                </span>
                                            )}
                                            {work.proofStatus === 'VERIFIED' && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 w-fit">
                                                    <FileCheck className="w-2.5 h-2.5" /> Verified
                                                </span>
                                            )}
                                            {work.proofStatus === 'REJECTED' && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-700 w-fit">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Proof Rejected
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 flex-wrap">
                                            {/* Only PI can edit */}
                                            {(work.piId === user?._id || user?.role === 'ADMIN') && (
                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedWork({...work, id: work._id, type: work.projectType, budget: work.sanctionedBudget, year: work.publicationYear }); setModalMode('edit'); setIsModalOpen(true); }} className="text-slate-400 hover:text-maroon-600">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            )}

                                            {(work.projectType === 'PUBLICATION' || work.status === 'PUBLISHED') && !work.proofUploaded && (
                                                <div onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="file"
                                                        id={`work-proof-${work._id}`}
                                                        className="hidden"
                                                        onChange={(e) => handleProofUpload(work._id, e.target.files[0])}
                                                    />
                                                    <Button variant="ghost" size="sm" className="text-amber-500 hover:bg-amber-500/10 p-0 w-8 h-8 rounded-full" asChild>
                                                        <label htmlFor={`work-proof-${work._id}`} className="cursor-pointer flex items-center justify-center">
                                                            <Upload className="w-4 h-4" />
                                                        </label>
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {work.proofUploaded && work.proofStatus !== 'VERIFIED' && (
                                                <div className="w-8 h-8 flex items-center justify-center">
                                                    <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
                                                </div>
                                            )}

                                            {work.projectType === 'PROPOSAL' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-indigo-400 hover:bg-indigo-500/10 text-[10px] h-7 font-black"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setAiModal({ open: true, loading: true, result: null });
                                                            const r = await predictResearchImpact({ title: work.title, department: work.department });
                                                            setAiModal({ open: true, loading: false, result: r });
                                                        }}
                                                    >
                                                        <Brain className="w-3 h-3 mr-1" /> Impact
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-sky-400 hover:bg-sky-500/10 text-[10px] h-7 font-black"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setAiModal({ open: true, loading: true, result: null });
                                                            const r = await predictGrantSuccess({ title: work.title, budget: work.sanctionedBudget });
                                                            setAiModal({ open: true, loading: false, result: r });
                                                        }}
                                                    >
                                                        <Sparkles className="w-3 h-3 mr-1" /> Grant
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AcademicWorkModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedWork(null); }}
                onSubmit={handleWorkSubmit}
                initialData={selectedWork}
                mode={modalMode}
                isSubmitting={isSubmitting}
            />
            {/* AI Result Modal */}
            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />

            {/* Detailed View Modal */}
            {showDetailsModal && viewedProject && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-10 w-full max-w-2xl shadow-2xl mx-auto overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Portfolio Asset Detail</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mt-1">Asset ID: #{ (viewedProject._id || viewedProject.id).substring(0, 12) }</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Title & Classification</p>
                                    <p className="text-sm text-white font-bold italic mb-2 uppercase">{viewedProject.title}</p>
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 font-black italic uppercase text-[10px]">{viewedProject.projectType || 'PROJECT'}</Badge>
                                        <Badge className={`px-3 py-1 font-black italic uppercase text-[10px] border ${
                                            ['ACTIVE', 'PUBLISHED'].includes(viewedProject.status) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                            viewedProject.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            viewedProject.status === 'PENDING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>{viewedProject.status === 'PENDING' ? 'Pending Approval' : viewedProject.status}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Financial Sanction</p>
                                    <p className="text-2xl font-black italic text-maroon-500 tracking-tighter">₹{viewedProject.sanctionedBudget?.toLocaleString() || '0'}</p>
                                    <p className="text-[10px] font-black uppercase text-slate-400 italic mt-1">Released: ₹{viewedProject.releasedBudget?.toLocaleString() || '0'}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Entity Details</p>
                                    <div className="flex items-center gap-2 text-white font-bold italic mt-2">
                                        <Building className="w-4 h-4 text-rose-500" />
                                        <span className="text-xs uppercase">{viewedProject.fundingSource || viewedProject.publisher || 'Internal/NA'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white font-bold italic mt-2">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs uppercase">Cycle/Year: {viewedProject.publicationYear || (viewedProject.startDate ? new Date(viewedProject.startDate).getFullYear() : null) || new Date(viewedProject.createdAt).getFullYear()}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-3">Research Team</p>
                                    <div className="space-y-3">
                                        {viewedProject.members && viewedProject.members.length > 0 ? (
                                            viewedProject.members.sort((a,b) => a.role === 'PI' ? -1 : 1).map((member, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${member.role === 'PI' ? 'bg-maroon-500/20 text-maroon-400 border border-maroon-500/30' : 'bg-slate-700 text-slate-400'}`}>
                                                        {member.role === 'PI' ? 'PI' : 'M'}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-white uppercase italic">{member.user?.name || 'Unknown Faculty'}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase font-black">{member.role === 'PI' ? 'Principal Investigator' : 'Team Member'}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-200 font-bold italic leading-relaxed">{viewedProject.pi || 'Current Faculty'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {viewedProject.description && (
                            <div className="mb-10 p-6 bg-white/5 border border-white/10 rounded-[2rem]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-3 italic">Abstract / Narrative</p>
                                <p className="text-xs text-slate-400 italic leading-relaxed">{viewedProject.description}</p>
                            </div>
                        )}

                        <Button onClick={() => setShowDetailsModal(false)} className="w-full h-16 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic border border-white/10">
                            Relinquish View
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyProjects;
