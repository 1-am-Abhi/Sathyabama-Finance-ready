import React, { useEffect, useState } from 'react';
import { Eye, Clock, CheckCircle, XCircle, Search, Filter, FileText } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const MyRevenueRecords = () => {
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');

    useEffect(() => {
        // Load records from local storage
        const storedRecords = JSON.parse(localStorage.getItem('revenueRecords') || '[]');
        setRecords(storedRecords);
        setFilteredRecords(storedRecords);
    }, []);

    useEffect(() => {
        let result = records;

        if (searchTerm) {
            result = result.filter(rec =>
                rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (rec.clientName && rec.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (yearFilter !== 'All') {
            result = result.filter(rec => rec.year.toString() === yearFilter);
        }

        if (sourceFilter !== 'All') {
            result = result.filter(rec => rec.revenueSource === sourceFilter);
        }

        setFilteredRecords(result);
    }, [searchTerm, yearFilter, sourceFilter, records]);

    const getAvailableYears = () => {
        const years = [...new Set(records.map(r => r.year))];
        return years.sort((a, b) => b - a);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Revenue Records</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your consultancy and revenue generation activities</p>
                </div>
                <Button onClick={() => window.location.href = '/faculty/revenue/add'} className="bg-blue-600 hover:bg-blue-700">
                    + Add New Record
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Title or Client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                </div>
                <div className="relative w-40">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none appearance-none bg-white"
                    >
                        <option value="All">All Years</option>
                        {getAvailableYears().map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="relative w-48">
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                    >
                        <option value="All">All Sources</option>
                        <option value="Consultancy">Consultancy</option>
                        <option value="Events">Events</option>
                        <option value="Projects">Projects</option>
                        <option value="Industry">Industry</option>
                        <option value="Analysis">Analysis</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Title & Client</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue Source</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount Generated (₹)</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredRecords.length > 0 ? (
                            filteredRecords.map((rec) => (
                                <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{rec.title}</div>
                                        {rec.clientName && <div className="text-xs text-gray-500">Client: {rec.clientName}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                            {rec.revenueSource}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-gray-800">
                                        ₹{parseInt(rec.amountGenerated).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(rec.revenueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                            View Doc
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <FileText className="w-10 h-10 text-gray-300 mb-2" />
                                        <p>No revenue records found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyRevenueRecords;
