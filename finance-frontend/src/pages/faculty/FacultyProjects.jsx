import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
    FileText, Layers, Clock, Plus, Edit2, 
    Building, Search, Filter, BookOpen, 
    CheckCircle, Briefcase, TrendingUp, Award, BarChart2, Brain, Sparkles
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import AcademicWorkModal from '../../components/faculty/NewProjectModal';
import AIResultModal from '../../components/shared/AIResultModal';
import { predictResearchImpact, predictGrantSuccess } from '../../services/aiService';
import { usePipeline } from '../../contexts/PipelineContext';
import apiClient from '../../api/client';

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
        return [
            { title: 'Total Works', value: safeProjects.length, icon: Layers, color: 'text-maroon-600', bg: 'bg-maroon-50' },
            { title: 'Active Projects', value: safeProjects.filter(p => p.status === 'ACTIVE').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { title: 'Publications', value: safeProjects.filter(p => p.projectType === 'PUBLICATION').length, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { title: 'Total Budget', value: `₹${(safeProjects.reduce((sum, p) => sum + (p.sanctionedBudget || 0), 0) / 100000).toFixed(1)}L`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' }
        ];
    }, [localProjects]);

    const handleWorkSubmit = async (data) => {
        try {
            if (modalMode === 'create') {
                const payload = {
                    title: data.title,
                    description: data.description || 'description not provided',
                    pi: data.pi || 'Current Faculty',
                    department: data.department || 'General',
                    centre: 'General',
                    sanctionedBudget: data.budget || 0,
                    status: data.status === 'Active' ? 'ACTIVE' : data.status === 'Published' ? 'PUBLISHED' : 'PENDING',
                    fundingSource: data.fundingSource || 'INSTITUTIONAL',
                    projectType: data.type || 'PROJECT',
                    publisher: data.publisher,
                    publicationYear: data.year
                };
                const res = await apiClient.post('/projects', payload);
                setLocalProjects([res.data.data, ...localProjects]);
            } else {
                const payload = {
                    title: data.title,
                    description: data.description,
                    sanctionedBudget: data.budget,
                    status: data.status,
                    fundingSource: data.fundingSource,
                    projectType: data.type,
                    publisher: data.publisher,
                    publicationYear: data.year
                };
                const res = await apiClient.put(`/projects/${data.id}`, payload);
                setLocalProjects(localProjects.map(p => p._id === data.id ? res.data.data : p));
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to save work");
        }
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
                        <Button onClick={() => { setModalMode('create'); setIsModalOpen(true); }} className="bg-maroon-600 hover:bg-maroon-700">
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
                                <tr key={work._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
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
                                            <p className="text-sm font-bold text-maroon-600 italic">₹{(work.sanctionedBudget / 100000).toFixed(1)}L</p>
                                        ) : (
                                            <p className="text-sm font-bold text-slate-400 italic">{work.publicationYear || 'N/A'}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Status badge + Impact badge */}
                                        <div className="flex flex-col gap-1.5">
                                            <Badge className={`border-0 text-[10px] font-black italic px-3 py-1 rounded-full w-fit ${
                                                work.status === 'Active' || work.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {work.status}
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
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 flex-wrap">
                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedWork({...work, id: work._id, type: work.projectType, budget: work.sanctionedBudget, year: work.publicationYear }); setModalMode('edit'); setIsModalOpen(true); }} className="text-slate-400 hover:text-maroon-600">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
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
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleWorkSubmit}
                initialData={selectedWork}
                mode={modalMode}
            />
            {/* AI Result Modal */}
            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />
        </div>
    );
};

export default FacultyProjects;
