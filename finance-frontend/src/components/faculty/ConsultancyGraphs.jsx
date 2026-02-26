import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Zap } from 'lucide-react';

const ConsultancyGraphs = () => {
    const data = [
        { year: '2020-21', revenue: 450000 },
        { year: '2021-22', revenue: 780000 },
        { year: '2022-23', revenue: 620000 },
        { year: '2023-24', revenue: 1250000 },
        { year: '2024-25', revenue: 1850000 },
    ];

    return (
        <Card className="border-0 shadow-sm bg-white rounded-[2.5rem] overflow-hidden group mb-8">
            <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30 italic">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-emerald-600" />
                            Consultancy & Revenue Trends
                        </CardTitle>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Year-wise External Funding & Industrial Engagement</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">₹49.5L Aggregated</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 italic">
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
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
                                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                            />
                            <Tooltip
                                cursor={{ stroke: '#10b981', strokeWidth: 2 }}
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
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue Generated']}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#10b981"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-10 flex items-center justify-center gap-12 border-t border-gray-50 pt-10">
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Peak Performance</p>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tighter italic">₹18.50 L <span className="text-emerald-500 font-bold ml-2">↑</span></h4>
                    </div>
                    <div className="w-px h-10 bg-gray-100"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Average Yield</p>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tighter italic">₹9.90 L</h4>
                    </div>
                    <div className="w-px h-10 bg-gray-100"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Asset Intake</p>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tighter italic">15 Industry Clients</h4>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ConsultancyGraphs;
