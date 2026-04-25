import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { getCentreName } from '../../constants/centreMap';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, TrendingUp, Activity } from 'lucide-react';
// Recharts for charts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const FacultyAnalytics = () => {
    const [stats, setStats] = useState({ totalFaculty: 0, byCentre: [], growth: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiClient.get('/analytics/faculty-stats');
                if (res.data?.success) {
                    const mappedStats = {
                        ...res.data.data,
                        byCentre: (res.data.data.byCentre || []).map(c => ({
                            ...c,
                            centre: getCentreName(c.centre)
                        }))
                    };
                    setStats(mappedStats);
                }
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Analytics...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase">Total Faculty</p>
                            <p className="text-3xl font-bold mt-1 text-slate-800">{stats.totalFaculty}</p>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-full">
                            <Users className="w-8 h-8 text-indigo-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase">Active Centres</p>
                            <p className="text-3xl font-bold mt-1 text-emerald-600">{stats.byCentre?.length || 0}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-full">
                            <Activity className="w-8 h-8 text-emerald-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase">New Additions</p>
                            <p className="text-3xl font-bold mt-1 text-blue-600">
                                {stats.growth?.length ? stats.growth[stats.growth.length - 1].count : 0}
                            </p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-full">
                            <TrendingUp className="w-8 h-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Faculty by Centre</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.byCentre} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="centre" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Onboarding Growth Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.growth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FacultyAnalytics;
