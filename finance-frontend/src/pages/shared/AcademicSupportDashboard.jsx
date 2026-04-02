import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, GraduationCap, Users, PenTool, Globe, Award, FileText, Activity, Sparkles, Edit3, X, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const AcademicSupportDashboard = () => {
    const { setLayout } = useLayout();
    const { user } = useAuth();
    const { showToast, ToastPortal } = useToast();
    const [academicData, setAcademicData] = useState(null);
    const [selectedYear, setSelectedYear] = useState('2024-25');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const years = ['2024-25', '2023-24', '2022-23'];

    const emptyData = {
        sectionA: {
            theorySubjects: 0,
            practicalSubjects: 0,
            ugProjects: 0,
            pgProjects: 0,
            internships: 0,
            examDuty: 0,
            phdOngoing: 0,
            phdCompleted: 0
        },
        sectionB: {
            internationalVisit: '',
            fellowship: '',
            coordinators: '',
            grants: ''
        }
    };

    const fetchMetrics = useCallback(async () => {
        const userId = user?.id;
        if (!userId) return;
        try {
            const res = await apiClient.get(`/academic-metrics?cycle=${selectedYear}`);
            if (res.data.data) {
                const d = res.data.data;
                // Map flat DB structure to nested UI structure
                setAcademicData({
                    _id: d._id,
                    status: d.status,
                    sectionA: {
                        theorySubjects: d.theorySubjects || 0,
                        practicalSubjects: d.practicalSubjects || 0,
                        ugProjects: d.ugProjects || 0,
                        pgProjects: d.pgProjects || 0,
                        internships: d.internships || 0,
                        examDuty: d.examDuty || 0,
                        phdOngoing: d.phdOngoing || 0,
                        phdCompleted: d.phdCompleted || 0
                    },
                    sectionB: {
                        internationalVisit: d.internationalVisit || '',
                        fellowship: d.fellowship || '',
                        coordinators: d.coordinators || '',
                        grants: d.grants || ''
                    }
                });
            } else {
                setAcademicData(null);
            }
        } catch (e) {
            console.error('Fetch metrics failed', e);
        }
    }, [selectedYear, user?.id]);

    useEffect(() => {
        setLayout("Academic Intelligence Hub", "Comprehensive oversight of pedagogical contributions and scholarly mentoring");
        fetchMetrics();
    }, [selectedYear, user, setLayout, fetchMetrics]);

    const handleSave = async (newData) => {
        try {
            // Flatten nested UI structure for DB
            const flatData = {
                cycle: selectedYear,
                ...newData.sectionA,
                ...newData.sectionB
            };
            await apiClient.post('/academic-metrics', flatData);
            
            // Re-fetch or update state
            fetchMetrics();
            setIsEditModalOpen(false);
            showToast('Academic metrics submitted for Admin Approval.');
        } catch (e) {
            console.error('Save metrics failed', e);
            showToast('Submission failed: ' + (e.response?.data?.message || e.message), 'error');
        }
    };

    const handleSyncOD = async () => {
        setIsSyncing(true);
        try {
            const res = await apiClient.get('/od-requests');
            const approvedODs = (res.data.data || []).filter(od => od.status === 'APPROVED');
            
            // Derive metrics
            const internationalCount = approvedODs.filter(od => od.odType === 'INTERNATIONAL').length;
            const examDutyCount = approvedODs.filter(od => od.purpose?.toLowerCase().includes('exam') || od.purpose?.toLowerCase().includes('invigilation')).length;
            
            const currentData = academicData || emptyData;
            const updatedData = {
                ...currentData,
                sectionA: {
                    ...currentData.sectionA,
                    examDuty: examDutyCount
                },
                sectionB: {
                    ...currentData.sectionB,
                    internationalVisit: internationalCount > 0 ? `${internationalCount} Approved International Deployment${internationalCount > 1 ? 's' : ''}` : currentData.sectionB.internationalVisit
                }
            };
            
            // Actually SAVE the synced data to backend
            const flatData = {
                cycle: selectedYear,
                ...updatedData.sectionA,
                ...updatedData.sectionB
            };
            await apiClient.post('/academic-metrics', flatData);
            
            fetchMetrics();
            showToast('Academic metrics synced and submitted for Admin Approval.');
        } catch (e) {
            console.error('Sync failed', e);
            showToast('Sync failed: ' + (e.response?.data?.message || e.message), 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const editModal = isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-10 w-full max-w-4xl shadow-2xl mx-auto my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Update Academic Record</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mt-1">Pedagogical Audit Cycle {selectedYear}</p>
                    </div>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const newData = {
                        sectionA: {
                            theorySubjects: Number(fd.get('theory')),
                            practicalSubjects: Number(fd.get('practical')),
                            ugProjects: Number(fd.get('ug')),
                            pgProjects: Number(fd.get('pg')),
                            internships: Number(fd.get('internships')),
                            examDuty: Number(fd.get('exam')),
                            phdOngoing: Number(fd.get('phdong')),
                            phdCompleted: Number(fd.get('phdcomp'))
                        },
                        sectionB: {
                            internationalVisit: fd.get('intl'),
                            fellowship: fd.get('awards'),
                            coordinators: fd.get('coord'),
                            grants: fd.get('grants')
                        }
                    };
                    handleSave(newData);
                }} className="space-y-10">
                    {/* Section A */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-maroon-500 mb-6 italic border-b border-maroon-500/20 pb-2">Quantitative Deliverables</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Theory Subjects', name: 'theory', val: academicData?.sectionA?.theorySubjects },
                                { label: 'Practical Subjects', name: 'practical', val: academicData?.sectionA?.practicalSubjects },
                                { label: 'UG Projects', name: 'ug', val: academicData?.sectionA?.ugProjects },
                                { label: 'PG Projects', name: 'pg', val: academicData?.sectionA?.pgProjects },
                                { label: 'Internships', name: 'internships', val: academicData?.sectionA?.internships },
                                { label: 'Exam Duty Count', name: 'exam', val: academicData?.sectionA?.examDuty },
                                { label: 'PhD Ongoing', name: 'phdong', val: academicData?.sectionA?.phdOngoing },
                                { label: 'PhD Completed', name: 'phdcomp', val: academicData?.sectionA?.phdCompleted },
                            ].map((f, i) => (
                                <div key={i} className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">{f.label}</label>
                                    <input name={f.name} type="number" defaultValue={f.val || 0} className="w-full h-12 px-4 bg-slate-800 border-0 rounded-xl font-bold italic text-white outline-none focus:ring-2 focus:ring-maroon-500" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section B */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-6 italic border-b border-indigo-500/20 pb-2">Qualitative Contributions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { label: 'International Visits', name: 'intl', val: academicData?.sectionB?.internationalVisit, placeholder: 'Details of international visits...' },
                                { label: 'Fellowships / Awards', name: 'awards', val: academicData?.sectionB?.fellowship, placeholder: 'Recognitions received...' },
                                { label: 'Coordination Roles', name: 'coord', val: academicData?.sectionB?.coordinators, placeholder: 'Clubs, cells, event coordination...' },
                                { label: 'Seed Grants / Consultancy', name: 'grants', val: academicData?.sectionB?.grants, placeholder: 'Financial contributions...' },
                            ].map((f, i) => (
                                <div key={i} className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">{f.label}</label>
                                    <textarea name={f.name} defaultValue={f.val || ''} placeholder={f.placeholder} className="w-full p-4 bg-slate-800 border-0 rounded-2xl font-bold italic text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button type="button" onClick={() => setIsEditModalOpen(false)} variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest italic text-slate-400">Cancel</Button>
                        <Button type="submit" className="flex-[2] h-14 bg-maroon-700 hover:bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-maroon-900/40">
                            <Save className="w-4 h-4 mr-3" /> Commit Changes for Approval
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );

    return (
        <div className="p-6 space-y-8 pb-20">
            <ToastPortal />
            {/* Header / Selector */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-white flex items-center gap-3">
                        Pedagogical Audit
                        {academicData?.status === 'PENDING_APPROVAL' && (
                            <Badge className="bg-amber-500 text-white border-0 animate-pulse">Pending Admin Approval</Badge>
                        )}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic mt-1">Real-time tracking of academic deliverables for cycle {selectedYear}</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="h-12 px-6 bg-white dark:bg-slate-800 dark:text-white border-0 rounded-xl shadow-sm text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-maroon-500"
                    >
                        {years.map(year => <option key={year} value={year}>Cycle {year}</option>)}
                    </select>
                    <Button onClick={() => setIsEditModalOpen(true)} className="h-12 bg-maroon-700 hover:bg-maroon-600 text-white rounded-xl font-black text-xs uppercase tracking-widest italic shadow-lg">
                        <Edit3 className="w-4 h-4 mr-2" /> Update Metrics
                    </Button>
                    <Button onClick={handleSyncOD} disabled={isSyncing} variant="outline" className="h-12 border-white/10 bg-white/5 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest italic hover:bg-white/10">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sync OD
                    </Button>
                </div>
            </div>

            {!academicData ? (
                <Card className="border-0 shadow-sm dark:bg-slate-900 rounded-[2rem] p-20 flex flex-col items-center justify-center text-center space-y-6 opacity-40 italic">
                    <FileText className="w-16 h-16 text-gray-300" />
                    <p className="text-sm font-black uppercase tracking-widest dark:text-white">Zero pedagogical artifacts detected in current cycle</p>
                </Card>
            ) : (
                <>
                    {/* Metrics Grid - Admin Style */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Theory Load', value: academicData.sectionA.theorySubjects, icon: BookOpen, color: 'text-maroon-600', bg: 'bg-maroon-50' },
                            { label: 'Practical Load', value: academicData.sectionA.practicalSubjects, icon: PenTool, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'UG Projects', value: academicData.sectionA.ugProjects, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'PG Projects', value: academicData.sectionA.pgProjects, icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
                        ].map((stat, i) => (
                            <Card key={i} className={`border-0 ${stat.bg} ${stat.color} transition-all duration-300 hover:shadow-lg shadow-sm ${academicData.status === 'PENDING_APPROVAL' ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic">{stat.label}</p>
                                            <p className="text-3xl font-black mt-2 italic tracking-tighter">{stat.value}</p>
                                        </div>
                                        <div className={`w-10 h-10 ${stat.bg} brightness-95 rounded-lg flex items-center justify-center`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Secondary Metrics */}
                        <Card className={`border-0 shadow-lg dark:bg-slate-900 rounded-[2.5rem] overflow-hidden bg-white ${academicData.status === 'PENDING_APPROVAL' ? 'opacity-60' : ''}`}>
                            <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-slate-800">Advanced Mentoring</CardTitle>
                                        {academicData.status === 'PENDING_APPROVAL' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 uppercase p-1 px-2 text-[8px] font-black">Audit Pending</Badge>}
                                    </div>
                                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Scholarly supervision and research guidance audit</CardDescription>
                                </div>
                                <Sparkles className="w-6 h-6 text-maroon-600" />
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        { label: 'Internships', value: academicData.sectionA.internships, color: 'text-indigo-600' },
                                        { label: 'Exam Duties', value: academicData.sectionA.examDuty, color: 'text-rose-600' },
                                        { label: 'PhD Ongoing', value: academicData.sectionA.phdOngoing, color: 'text-blue-600' },
                                        { label: 'PhD Completed', value: academicData.sectionA.phdCompleted, color: 'text-emerald-600' },
                                    ].map((m, i) => (
                                        <div key={i} className="p-6 rounded-2xl bg-gray-50/50 border border-gray-100/50">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">{m.label}</p>
                                            <p className={`text-2xl font-black italic tracking-tighter mt-1 ${m.color}`}>{m.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Qualitative Achievements */}
                        <Card className={`border-0 shadow-lg dark:bg-slate-900 rounded-[2.5rem] overflow-hidden bg-white ${academicData.status === 'PENDING_APPROVAL' ? 'opacity-60' : ''}`}>
                            <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-slate-800">Strategic Contributions</CardTitle>
                                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Institutional impact and global professional engagement</CardDescription>
                                </div>
                                <Activity className="w-6 h-6 text-maroon-600" />
                            </CardHeader>
                            <CardContent className="p-0 overflow-y-auto max-h-[400px]">
                                {[
                                    { title: 'Global Visits', icon: Globe, content: academicData.sectionB.internationalVisit, color: 'text-blue-600' },
                                    { title: 'Awards', icon: Award, content: academicData.sectionB.fellowship, color: 'text-amber-600' },
                                    { title: 'Coordination', icon: Users, content: academicData.sectionB.coordinators, color: 'text-indigo-600' },
                                    { title: 'Grants', icon: GraduationCap, content: academicData.sectionB.grants, color: 'text-emerald-600' },
                                ].map((row, i) => row.content ? (
                                    <div key={i} className="p-8 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3 mb-3">
                                            <row.icon className={`w-4 h-4 ${row.color}`} />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 italic">{row.title}</p>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 italic leading-relaxed uppercase tracking-tighter">{row.content}</p>
                                    </div>
                                ) : (
                                    <div key={i} className="p-8 border-b border-gray-50 opacity-20 last:border-0">
                                        <div className="flex items-center gap-3 mb-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">{row.title} (N/A)</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {editModal}
        </div>
    );
};

export default AcademicSupportDashboard;
