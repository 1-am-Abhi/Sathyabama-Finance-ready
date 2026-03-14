import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BookOpen, TrendingUp } from 'lucide-react';

const PublicationsGraphs = () => {
    const data = [
        { year: '2020-21', journals: 8, conferences: 5, books: 1 },
        { year: '2021-22', journals: 12, conferences: 8, books: 2 },
        { year: '2022-23', journals: 15, conferences: 10, books: 1 },
        { year: '2023-24', journals: 22, conferences: 12, books: 3 },
        { year: '2024-25', journals: 28, conferences: 15, books: 4 },
    ];

    return (
        <Card className="border-0 shadow-sm bg-white rounded-[2.5rem] overflow-hidden group mb-8">
            <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30 italic">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-indigo-600" />
                            Publication Scholarly Analytics
                        </CardTitle>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Year-wise Academic Output & Impact Distribution</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">+18.5% Growth</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 italic">
                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
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
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: 'none',
                                    borderRadius: '1.25rem',
                                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                                    padding: '1.5rem',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            />
                            <Bar dataKey="journals" name="Journal Articles" stackId="a" fill="#312e81" barSize={45} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="conferences" name="Conference Papers" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="books" name="Books / Chapters" stackId="a" fill="#818cf8" radius={[10, 10, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-12 px-6">
                    <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic mb-2">Cumulative Journals</p>
                        <h4 className="text-3xl font-black tracking-tighter">85</h4>
                    </div>
                    <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic mb-2">Conference Units</p>
                        <h4 className="text-3xl font-black tracking-tighter">48</h4>
                    </div>
                    <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic mb-2">Books Published</p>
                        <h4 className="text-3xl font-black tracking-tighter">11</h4>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PublicationsGraphs;
