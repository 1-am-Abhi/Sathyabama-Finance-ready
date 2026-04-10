import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useLayout } from '../../contexts/LayoutContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    FileText, Banknote, TrendingUp, Award, Target, ChevronRight, Sparkles, Brain, Users, Lightbulb
} from 'lucide-react';
import AIResultModal from '../../components/shared/AIResultModal';
import { predictFundingSuccess, predictResearchTrends, analyzePersonalResearchMetrics, findMoreCollaborators } from '../../services/aiService';
import { formatCurrency } from '../../utils/format';
import apiClient from '../../api/client';

const FacultyDashboard = () => {
    const { setLayout } = useLayout();
    const navigate = useNavigate();
    const { user } = useAuth();
    const userId = user?.id || user?._id;
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });

    // Real data
    const [projects, setProjects] = useState([]);
    const [events, setEvents] = useState([]);
    const [fundRequests, setFundRequests] = useState([]);
    const [equipmentRequests, setEquipmentRequests] = useState([]);
    const [revenueSummary, setRevenueSummary] = useState({ total: 0 });
    const [statsData, setStatsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLayout("Faculty Dashboard", "Research impact & grant performance monitoring");
        loadData();
    }, [setLayout]);

    if (!userId) return null;

    const loadData = async () => {
        try {
            const currentYear = new Date().getFullYear();
            const [projRes, eventRes, fundRes, eqRes, revRes, statsRes] = await Promise.all([
                apiClient.get('/projects').catch(() => ({ data: { data: [] } })),
                apiClient.get('/event-requests').catch(() => ({ data: { data: [] } })),
                apiClient.get('/fund-requests').catch(() => ({ data: { data: [] } })),
                apiClient.get('/equipment-requests').catch(() => ({ data: { data: [] } })),
                apiClient.get(`/revenue/summary?year=${currentYear}`).catch(() => ({ data: { success: true, data: { summary: { total: 0 } } } })),
                apiClient.get('/projects/faculty-stats').catch(() => ({ data: { success: false } }))
            ]);

            setProjects(projRes.data.data || []);
            setEvents(eventRes.data.data || []);
            setFundRequests(fundRes.data.data || []);
            setEquipmentRequests(eqRes.data.data || []);
            
            if (revRes.data.success) {
                setRevenueSummary(revRes.data.data.summary || { total: 0 });
            }

            if (statsRes.data.success) {
                console.log("Faculty Data Truth:", statsRes.data.stats);
                setStatsData(statsRes.data.stats);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const activeProjectsCount = projects.filter(p => ['active', 'ACTIVE', 'Approved', 'APPROVED'].includes(p.status)).length;
    const activeEquipmentCount = equipmentRequests.filter(e => ['Approved', 'DISBURSED'].includes(e.status)).length;
    const activeStatsCount = activeProjectsCount + activeEquipmentCount;

    const publications = projects.filter(p => 
        (p.projectType || '').toUpperCase() === 'PUBLICATION' || 
        (p.status || '').toUpperCase() === 'PUBLISHED'
    ).length;
    
    const totalProjectFunding = projects.reduce((sum, p) => sum + parseFloat(p.sanctionedBudget || 0), 0);
    const totalEventFunding = events.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + parseFloat(e.approvedAmount || 0), 0);
    const totalFundReqFunding = fundRequests
        .filter(r => ['APPROVED', 'PENDING_DISBURSAL', 'DISBURSED'].includes((r.status || '').toUpperCase()))
        .reduce((sum, r) => sum + parseFloat(r.requestedAmount || 0), 0);
    const totalEquipmentFunding = equipmentRequests.filter(e => ['Approved', 'DISBURSED'].includes(e.status)).reduce((sum, e) => sum + parseFloat(e.approvedAmount || 0), 0);
    
    const totalFunding = totalProjectFunding + totalEventFunding + totalFundReqFunding + totalEquipmentFunding;
    const formattedFunding = formatCurrency(totalFunding);
    const formattedRevenue = formatCurrency(revenueSummary.total || 0);

    const stats = [
        { title: 'Active Projects', value: loading ? '…' : String(statsData?.activeProjects || 0), icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', subtitle: 'Ongoing research' },
        { title: 'Amount Disbursed', value: loading ? '…' : formatCurrency(statsData?.totalDisbursed || 0), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', subtitle: 'Released to projects' },
        { title: 'Total Allocated', value: loading ? '…' : formatCurrency(statsData?.totalAllocated || 0), icon: Banknote, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', subtitle: 'Approved grants' },
        { title: 'Publications', value: String(publications), icon: Award, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', subtitle: 'Research output' }
    ];

    // Build funding trend from real projects (by creation month)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const trendData = monthNames.map(m => ({ month: m, amount: 0, titles: [] }));
    (projects || []).forEach(r => {
        const d = r.createdAt ? new Date(r.createdAt) : null;
        if (d) {
            const mIdx = d.getMonth();
            const amt = parseFloat(r.sanctionedBudget || r.budget || 0) / 100000;
            trendData[mIdx].amount += amt;
            if (amt > 0) trendData[mIdx].titles.push(r.title);
        }
    });
    // Include approved events in funding trend
    (events || []).filter(e => e.status === 'APPROVED').forEach(e => {
        const d = e.createdAt ? new Date(e.createdAt) : null;
        if (d) {
            const mIdx = d.getMonth();
            const amt = parseFloat(e.approvedAmount || 0) / 100000;
            trendData[mIdx].amount += amt;
            if (amt > 0) trendData[mIdx].titles.push(`Event: ${e.eventTitle}`);
        }
    });
    // Also include fund requests that have been approved
    (fundRequests || []).forEach(r => {
        const d = r.createdAt ? new Date(r.createdAt) : null;
        if (d && ['APPROVED', 'PENDING_DISBURSAL', 'DISBURSED'].includes((r.status || '').toUpperCase())) {
            const mIdx = d.getMonth();
            const amt = parseFloat(r.requestedAmount || 0) / 100000;
            trendData[mIdx].amount += amt;
            if (amt > 0) trendData[mIdx].titles.push(`Fund Req: ${r.purpose || r.projectTitle}`);
        }
    });
    // Include equipment requests (sanctioned/disbursed)
    (equipmentRequests || []).forEach(e => {
        const d = e.createdAt ? new Date(e.createdAt) : null;
        if (d && (['Approved', 'DISBURSED'].includes(e.status))) {
            const mIdx = d.getMonth();
            const amt = parseFloat(e.approvedAmount || 0) / 100000;
            trendData[mIdx].amount += amt;
            if (amt > 0) trendData[mIdx].titles.push(`Equip: ${e.assetDescription || e.itemName}`);
        }
    });
    // Round to 2 decimal places
    trendData.forEach(d => { d.amount = Math.round(d.amount * 100) / 100; });

    // Project status breakdown
    const statusMap = { Active: 0, Completed: 0, Pending: 0, Rejected: 0 };
    (projects || []).forEach(p => {
        const s = (p.status || '').toLowerCase();
        if (s === 'active' || s === 'approved') statusMap.Active++;
        else if (s === 'completed') statusMap.Completed++;
        else if (s === 'pending' || s === 'submitted') statusMap.Pending++;
        else if (s === 'rejected') statusMap.Rejected++;
    });
    const projectStatus = [
        { name: 'Active', value: statusMap.Active || 0, color: '#10b981' },
        { name: 'Completed', value: statusMap.Completed || 0, color: '#8b5cf6' },
        { name: 'Pending', value: statusMap.Pending || 0, color: '#f59e0b' },
        { name: 'Rejected', value: statusMap.Rejected || 0, color: '#f43f5e' },
    ].filter(s => s.value > 0);

    const activeProjectList = projects.filter(p => {
        const s = (p.status || '').toLowerCase();
        return s === 'active' || s === 'approved';
    }).slice(0, 3);

    return (
        <div className="p-6 space-y-8 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className={`border ${stat.border} ${stat.bg} ${stat.color}`}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{stat.title}</p>
                                        <p className="text-3xl font-black mt-2 italic tracking-tighter">{stat.value}</p>
                                    </div>
                                    <div className={`w-12 h-12 ${stat.bg} border ${stat.border} rounded-2xl flex items-center justify-center`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 mt-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50 italic">{stat.subtitle}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border border-white/10 bg-slate-800/40 rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-6 border-b border-white/10">
                        <CardTitle className="text-base font-black italic tracking-tighter uppercase text-white">Grant Funding Trend</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Cumulative sanctioned funding — FY 2025-26</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-56 w-full">
                            {trendData.some(d => d.amount > 0) ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="fundGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `₹${v}L`} />
                                        <Tooltip 
                                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc' }}
                                            formatter={(value, name, props) => {
                                                const titles = props.payload?.titles || [];
                                                return [
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-bold">₹{value.toFixed(2)}L</span>
                                                        {titles.length > 0 && (
                                                            <div className="mt-1 border-t border-white/10 pt-1">
                                                                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Projects:</p>
                                                                {titles.slice(0, 2).map((t, i) => (
                                                                    <p key={i} className="text-[9px] truncate max-w-[150px] italic">• {t}</p>
                                                                ))}
                                                                {titles.length > 2 && <p className="text-[8px] text-slate-500 font-bold">+{titles.length - 2} more...</p>}
                                                            </div>
                                                        )}
                                                    </div>,
                                                    'Sanctioned Funding'
                                                ];
                                            }}
                                            labelFormatter={(label) => `Month: ${label}`}
                                        />
                                        <Area type="monotone" dataKey="amount" name="Sanctioned Funding (L)" stroke="#f43f5e" strokeWidth={2} fill="url(#fundGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <TrendingUp className="w-12 h-12 text-slate-400 mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No funding data yet</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 bg-slate-800/40 rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-6 border-b border-white/10">
                        <CardTitle className="text-base font-black italic tracking-tighter uppercase text-white">Project Status</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center">
                        {projectStatus.length > 0 ? (
                            <>
                                <div className="h-40 w-full mb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={projectStatus} cx="50%" cy="50%" outerRadius={60} innerRadius={35} dataKey="value">
                                                {projectStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {projectStatus.map((s, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                            <span className="text-[10px] font-black uppercase text-slate-400">{s.name} ({s.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center opacity-30">
                                <FileText className="w-10 h-10 text-slate-400 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No projects yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-white/10 bg-slate-800/40 overflow-hidden rounded-[2rem]">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-base font-black italic tracking-tighter uppercase text-white">Active Research Projects</h3>
                    <Button variant="ghost" onClick={() => navigate('/faculty/projects')} className="text-amber-400 font-black text-[10px] uppercase tracking-widest italic">
                        View All <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    {activeProjectList.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-400 font-black italic">
                                    <th className="px-6 py-4">Title</th>
                                    <th className="px-6 py-4">Agency</th>
                                    <th className="px-6 py-4">Budget</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeProjectList.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5">
                                        <td className="px-6 py-5 text-xs font-black italic uppercase text-white">{row.title}</td>
                                        <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase">{row.fundingAgency || row.agency || '—'}</td>
                                        <td className="px-6 py-5 text-sm font-black italic text-rose-400">₹{parseInt(row.budget || 0).toLocaleString()}</td>
                                        <td className="px-6 py-5 text-right">
                                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] uppercase">{row.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-16 flex flex-col items-center justify-center opacity-30">
                            <FileText className="w-10 h-10 text-slate-400 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No active projects — add one via My Projects</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* AI Research Assistant Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/20 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black italic uppercase tracking-widest text-indigo-400 flex items-center">
                            <Brain className="w-4 h-4 mr-2" />
                            AI Research Assistant
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-[10px] text-slate-400 font-bold uppercase italic leading-relaxed">
                            Advanced institutional intelligence for proposal optimization and resource discovery.
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 h-8" onClick={() => navigate('/faculty/ai-generator')}>
                                <Sparkles className="w-3 h-3 mr-2 text-indigo-500" /> AI Proposal Generator
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 h-8"
                                onClick={async () => { setAiModal({ open: true, loading: true, result: null }); const r = await analyzePersonalResearchMetrics('Faculty'); setAiModal({ open: true, loading: false, result: r }); }}>
                                <Target className="w-3 h-3 mr-2 text-rose-500" /> Analyze My Performance
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 h-8"
                                onClick={async () => { setAiModal({ open: true, loading: true, result: null }); const r = await predictFundingSuccess({ title: 'My Research Project' }); setAiModal({ open: true, loading: false, result: r }); }}>
                                <Brain className="w-3 h-3 mr-2 text-emerald-500" /> Grant Success Predictor
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 h-8"
                                onClick={async () => { setAiModal({ open: true, loading: true, result: null }); const r = await predictResearchTrends(); setAiModal({ open: true, loading: false, result: r }); }}>
                                <TrendingUp className="w-3 h-3 mr-2 text-amber-500" /> Emerging Research Trends
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-white/5 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black italic uppercase tracking-widest text-emerald-400 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" /> Research Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <p className="text-[10px] text-emerald-500 font-black uppercase mb-1">AI-Powered</p>
                            <p className="text-[11px] text-slate-300 font-bold italic">Click "Full Trend Analysis" to get real-time AI-generated research trend forecasts.</p>
                        </div>
                        <Button variant="outline" size="sm" className="w-full border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase h-8"
                            onClick={async () => { setAiModal({ open: true, loading: true, result: null }); const r = await predictResearchTrends(); setAiModal({ open: true, loading: false, result: r }); }}>
                            <Lightbulb className="w-3 h-3 mr-2" /> Full Trend Analysis
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-white/5 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black italic uppercase tracking-widest text-rose-400 flex items-center">
                            <Users className="w-4 h-4 mr-2" /> Collaboration Finder
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-lg border border-white/5 opacity-50 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Use AI to discover potential research collaborators</p>
                        </div>
                        <Button variant="ghost" className="w-full text-rose-400 text-[10px] font-black uppercase hover:bg-rose-500/5 h-8"
                            onClick={async () => { setAiModal({ open: true, loading: true, result: null }); const r = await findMoreCollaborators(); setAiModal({ open: true, loading: false, result: r }); }}>
                            Find Collaborators via AI
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />
        </div>
    );
};

export default FacultyDashboard;
