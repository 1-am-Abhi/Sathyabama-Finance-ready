import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Activity, Layers, Calendar } from 'lucide-react';

const ResearchProjectsGraphs = () => {
    const yearData = [
        { year: '2020-21', count: 2 },
        { year: '2021-22', count: 4 },
        { year: '2022-23', count: 3 },
        { year: '2023-24', count: 6 },
        { year: '2024-25', count: 5 },
    ];

    const statusData = [
        { name: 'Completed', value: 12, color: '#10b981' },
        { name: 'On-Going', value: 8, color: '#3b82f6' },
        { name: 'Approved', value: 5, color: '#6366f1' },
        { name: 'Under Review', value: 3, color: '#f59e0b' },
    ];

    return (
        <Card className="border-0 shadow-sm bg-white rounded-[2.5rem] overflow-hidden group mb-8">
            <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30 italic">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-2">
                            <Activity className="w-6 h-6 text-blue-600" />
                            Research Projects Analytics
                        </CardTitle>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Investigative Portfolio & Lifecycle Distribution</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">28 Total Units</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 italic">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Year-wise Bar Chart */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Year-wise Project Influx</h4>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic">Institutional Data</span>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={yearData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="year"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40}>
                                        {yearData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === yearData.length - 1 ? '#1e1b4b' : '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Breakdown Circle */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic ml-2">Portfolio Asset Classification</h4>
                        <div className="h-[300px] w-full flex items-center justify-center relative">
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                <p className="text-3xl font-black text-gray-900 tracking-tighter">28</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Grant Stock</p>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '1rem', padding: '1rem' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 px-4 pt-4">
                            {statusData.map((status, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">{status.name}</p>
                                        <p className="text-sm font-black text-gray-900 tracking-tighter">{status.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ResearchProjectsGraphs;
