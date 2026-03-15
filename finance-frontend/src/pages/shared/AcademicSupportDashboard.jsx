import React, { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, Users, PenTool, Globe, Award, FileText, ChevronDown, Activity, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const AcademicSupportDashboard = () => {
    const { setLayout } = useLayout();
    const { user } = useAuth();
    const [academicData, setAcademicData] = useState(null);
    const [selectedYear, setSelectedYear] = useState('2024-25');
    
    const years = ['2024-25', '2023-24', '2022-23'];

    useEffect(() => {
        setLayout("Academic Intelligence Hub", "Comprehensive oversight of pedagogical contributions and scholarly mentoring");
        const storedData = JSON.parse(localStorage.getItem('academicSupportData') || '{}');
        const userId = user?.id || '1';
        const key = `${userId}_${selectedYear}`;
        setAcademicData(storedData[key] || null);
    }, [selectedYear, user, setLayout]);

    return (
        <div className="p-6 space-y-8 pb-20">
            {/* Header / Selector */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">Pedagogical Audit</h2>
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
                            <Card key={i} className={`border-0 ${stat.bg} ${stat.color} transition-all duration-300 hover:shadow-lg shadow-sm`}>
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
                        <Card className="border-0 shadow-lg dark:bg-slate-900 rounded-[2.5rem] overflow-hidden bg-white">
                            <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-slate-800">Advanced Mentoring</CardTitle>
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
                        <Card className="border-0 shadow-lg dark:bg-slate-900 rounded-[2.5rem] overflow-hidden bg-white">
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
                                ) : null)}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

export default AcademicSupportDashboard;
