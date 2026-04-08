import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { 
    DollarSign, TrendingUp, Briefcase,
    Users, PieChart, Activity
} from 'lucide-react';
import { useLayout } from '../../../contexts/LayoutContext';
import apiClient from '../../../api/client';

const RevenueSummary = () => {
    const { setLayout } = useLayout();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        total: 0, consultancy: 0, events: 0, projects: 0, industry: 0, analysis: 0, other: 0,
        growth: 0, efficiency: 0
    });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        setLayout("Consultancy Revenue", "Analytical oversight of institutional income and professional services");
    }, [setLayout]);

    useEffect(() => {
        let isMounted = true;
        const fetchSummary = async () => {
            try {
                if (isMounted && summary.total === 0) setLoading(true);
                const response = await apiClient.get(`/revenue/summary?year=${selectedYear}`);
                if (isMounted && response.data.success) {
                    const data = response.data.data.summary;
                    // Ensure all values are proper numbers
                    const cleanSummary = {
                        total: Number(data.total) || 0,
                        consultancy: Number(data.consultancy) || 0,
                        events: Number(data.events) || 0,
                        projects: Number(data.projects) || 0,
                        industry: Number(data.industry) || 0,
                        analysis: Number(data.analysis) || 0,
                        other: Number(data.other) || 0,
                        growth: Number(data.growth) || 0,
                        efficiency: Number(data.efficiency) || 0
                    };
                    setSummary(cleanSummary);
                    setChartData([
                        { name: 'Consultancy', value: cleanSummary.consultancy, color: '#f43f5e' },
                        { name: 'Events', value: cleanSummary.events, color: '#8b5cf6' },
                        { name: 'Projects', value: cleanSummary.projects, color: '#10b981' },
                        { name: 'Industry', value: cleanSummary.industry, color: '#f59e0b' },
                        { name: 'Analysis', value: cleanSummary.analysis, color: '#3b82f6' }
                    ]);
                }
            } catch (error) {
                console.error('Error fetching revenue summary:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchSummary();
        // Poll every 60s; pause when tab is hidden
        let intervalId = setInterval(fetchSummary, 60000);
        const handleVis = () => {
            if (document.hidden) { clearInterval(intervalId); }
            else { fetchSummary(); intervalId = setInterval(fetchSummary, 60000); }
        };
        document.addEventListener('visibilitychange', handleVis);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVis);
        };
    }, [selectedYear]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Financial Intelligence</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mt-1">Real-time revenue monitoring for FY {selectedYear}</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="h-12 px-4 bg-slate-800 border border-white/10 text-white rounded-xl text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-rose-500"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: `₹${(summary.total / 100000).toFixed(1)}L`, icon: DollarSign, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                    { label: 'Consultancy', value: `₹${(summary.consultancy / 100000).toFixed(1)}L`, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                    { label: 'Projects', value: `₹${(summary.projects / 100000).toFixed(1)}L`, icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Growth', value: `${summary.growth > 0 ? '+' : ''}${summary.growth}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                ].map((stat, i) => (
                    <Card key={i} className={`border ${stat.border} ${stat.bg} ${stat.color}`}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{stat.label}</p>
                                    <p className="text-3xl font-black mt-2 italic tracking-tighter">{stat.value}</p>
                                </div>
                                <div className={`w-10 h-10 ${stat.bg} border ${stat.border} rounded-xl flex items-center justify-center`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <Card className="lg:col-span-2 border border-white/10 bg-slate-800/40 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/10 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-white">Revenue Distribution</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Financial partitioning across various research streams</CardDescription>
                        </div>
                        <PieChart className="w-6 h-6 text-rose-400" />
                    </CardHeader>
                    <CardContent className="p-8">
                        {summary.total === 0 ? (
                            <div className="h-80 flex flex-col items-center justify-center opacity-40">
                                <TrendingUp className="w-12 h-12 text-slate-400 mb-3" />
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">No revenue records for {selectedYear}</p>
                                <p className="text-[10px] text-slate-500 mt-1 italic">Add records via "Add Revenue Record"</p>
                            </div>
                        ) : (
                        <div className="h-80 w-full font-bold italic">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${v}`} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        contentStyle={{ borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                                        formatter={(val) => [`₹${val >= 100000 ? (val/100000).toFixed(2) + 'L' : val.toLocaleString()}`, 'Revenue']}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.85} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stream Breakdown */}
                <Card className="border border-white/10 bg-slate-800/40 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/10">
                        <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-white">Stream Audit</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Detailed per-stream performance</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {chartData.map((stream, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic">
                                    <span className="text-slate-400">{stream.name}</span>
                                    <span className="text-white">₹{(stream.value / 100000).toFixed(1)}L</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{
                                            backgroundColor: stream.color,
                                            width: `${summary.total > 0 ? (stream.value / summary.total) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="pt-6 border-t border-white/10 mt-4">
                            <div className="bg-slate-700/50 border border-white/10 rounded-2xl p-6 text-white text-center">
                                <Activity className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Yield Efficiency</p>
                                <p className="text-2xl font-black italic tracking-tighter mt-1 text-white">{summary.efficiency}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RevenueSummary;
