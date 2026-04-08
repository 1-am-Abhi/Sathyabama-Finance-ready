import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const FinancialAnalytics = ({ data }) => {
    // Transform data for charts — College Funds, PFMS Funds, Other Funds (Director)
    const barChartData = [
        {
            name: 'College Funds',
            allocated: data?.collegeFunds?.totalAllocated || 0,
            used: data?.collegeFunds?.totalUsed || 0,
        },
        {
            name: 'PFMS Funds',
            allocated: data?.pfmsFunds?.totalAllocated || 0,
            used: data?.pfmsFunds?.totalUsed || 0,
        },
        {
            name: 'Other Funds',
            allocated: data?.directorFunds?.totalAllocated || 0,
            used: data?.directorFunds?.totalUsed || 0,
        }
    ];

    const pieChartData = [
        { name: 'College Funds', value: data?.collegeFunds?.totalAllocated || 0 },
        { name: 'PFMS Funds', value: data?.pfmsFunds?.totalAllocated || 0 },
        { name: 'Other Funds', value: data?.directorFunds?.totalAllocated || 0 }
    ].filter(d => d.value > 0); // hide slices with 0 allocation

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981']; // Blue, Purple, Emerald

    // Custom Tooltip for Bar Chart to format currency
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-4 border dark:border-slate-700 rounded shadow-lg">
                    <p className="font-bold mb-2 dark:text-white">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: ₹{entry.value.toLocaleString()}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
        return `₹${value.toLocaleString()}`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Fund Utilization Bar Chart */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">Fund Utilization Overview</CardTitle>
                </CardHeader>
                <CardContent className="overflow-hidden">
                    <div className="h-[300px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" debounce={1}>
                            <BarChart
                                data={barChartData}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-600" />
                                <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-slate-400" />
                                <YAxis tickFormatter={formatCurrency} stroke="#6b7280" className="dark:stroke-slate-400" />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                                <Bar dataKey="allocated" name="Total Allocated" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="used" name="Utilized Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Fund Distribution Pie Chart */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">Total Fund Distribution</CardTitle>
                </CardHeader>
                <CardContent className="overflow-hidden">
                    <div className="h-[300px] w-full min-w-0 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%" debounce={1}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default FinancialAnalytics;
