import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Briefcase, Users, Beaker } from 'lucide-react';

const RevenueSummary = () => {
    const [records, setRecords] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [summary, setSummary] = useState({
        total: 0,
        consultancy: 0,
        events: 0,
        projects: 0,
        industry: 0,
        analysis: 0,
        other: 0
    });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const storedRecords = JSON.parse(localStorage.getItem('revenueRecords') || '[]');
        setRecords(storedRecords);
    }, []);

    useEffect(() => {
        // Filter by selected year
        const filtered = records.filter(r => r.year === Number(selectedYear));

        // Calculate Summary
        const newSummary = filtered.reduce((acc, curr) => {
            const amount = Number(curr.amountGenerated);
            acc.total += amount;

            const source = curr.revenueSource.toLowerCase();
            if (source.includes('consultancy')) acc.consultancy += amount;
            else if (source.includes('events')) acc.events += amount;
            else if (source.includes('projects')) acc.projects += amount;
            else if (source.includes('industry')) acc.industry += amount;
            else if (source.includes('analysis')) acc.analysis += amount;
            else acc.other += amount;

            return acc;
        }, { total: 0, consultancy: 0, events: 0, projects: 0, industry: 0, analysis: 0, other: 0 });

        setSummary(newSummary);

        // Prepare Chart Data
        setChartData([
            { name: 'Consultancy', amount: newSummary.consultancy },
            { name: 'Events', amount: newSummary.events },
            { name: 'Projects', amount: newSummary.projects },
            { name: 'Industry', amount: newSummary.industry },
            { name: 'Analysis', amount: newSummary.analysis },
        ]);

    }, [records, selectedYear]);

    const getAvailableYears = () => {
        const years = [...new Set(records.map(r => r.year))];
        if (!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear());
        return years.sort((a, b) => b - a);
    };

    const SummaryCard = ({ title, amount, icon: Icon, color }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-xl font-bold text-gray-800">₹{amount.toLocaleString()}</p>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Revenue Summary</h1>
                    <p className="text-gray-500 text-sm mt-1">Analytical overview of generated revenue</p>
                </div>
                <div className="relative w-40">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none appearance-none bg-white font-medium"
                    >
                        {getAvailableYears().map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-xl shadow-md text-white md:col-span-2 lg:col-span-1">
                    <p className="text-blue-100 text-sm font-medium mb-1">Total Revenue ({selectedYear})</p>
                    <h2 className="text-3xl font-bold">₹{summary.total.toLocaleString()}</h2>
                    <div className="mt-4 flex items-center text-xs text-blue-200 gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Generated so far</span>
                    </div>
                </div>
                <SummaryCard title="Projects" amount={summary.projects} icon={Briefcase} color="bg-purple-600 text-purple-600" />
                <SummaryCard title="Consultancy" amount={summary.consultancy} icon={Users} color="bg-emerald-600 text-emerald-600" />
                <SummaryCard title="Events & Workshops" amount={summary.events} icon={Calendar} color="bg-orange-600 text-orange-600" />
                <SummaryCard title="Industry Training" amount={summary.industry} icon={TrendingUp} color="bg-rose-600 text-rose-600" />
                <SummaryCard title="Analysis & Testing" amount={summary.analysis} icon={Beaker} color="bg-cyan-600 text-cyan-600" />
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Distribution by Source</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} tickFormatter={(value) => `₹${value / 1000}k`} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                cursor={{ fill: '#f3f4f6' }}
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                            />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default RevenueSummary;
