import React, { useEffect, useState } from 'react';
import { Eye, Clock, CheckCircle, XCircle, Search, Filter, FileText, Plus, Database, ArrowUpRight } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { useLayout } from '../../../contexts/LayoutContext';
import apiClient from '../../../api/client';

const MyRevenueRecords = () => {
    const { setLayout } = useLayout();
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLayout("Revenue Ledger", "Historical audit of consultancy income and industrial training yields");
        
        const fetchRecords = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/revenue/my-records');
                if (response.data.success) {
                    setRecords(response.data.data);
                    setFilteredRecords(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching revenue records:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [setLayout]);

    useEffect(() => {
        let result = records;
        if (searchTerm) {
            result = result.filter(rec =>
                (rec.details && rec.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (rec.revenueSource && rec.revenueSource.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        if (yearFilter !== 'All') result = result.filter(rec => rec.year.toString() === yearFilter);
        if (sourceFilter !== 'All') result = result.filter(rec => rec.revenueSource === sourceFilter);
        setFilteredRecords(result);
    }, [searchTerm, yearFilter, sourceFilter, records]);

    const getAvailableYears = () => {
        const years = [...new Set(records.map(r => r.year))];
        return years.sort((a, b) => b - a);
    };

    return (
        <div className="p-6 space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">Master Record Ledger</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic mt-1">Audit trail for all personal professional income streams</p>
                </div>
                <Button onClick={() => window.location.href = '/faculty/revenue/add'} className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-slate-900/20 hover:scale-105 transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Initialize Revenue Entry
                </Button>
            </div>

            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row gap-4 px-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 font-black italic" />
                    <input
                        type="text"
                        placeholder="EXECUTE SEARCH BY TITLE OR CLIENT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-12 pr-6 bg-white border-0 rounded-2xl shadow-sm text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-maroon-500 transition-all placeholder:text-gray-300"
                    />
                </div>
                <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="h-14 px-6 bg-white border-0 rounded-2xl shadow-sm text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-maroon-500"
                >
                    <option value="All">All Cycles</option>
                    {getAvailableYears().map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="h-14 px-6 bg-white border-0 rounded-2xl shadow-sm text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-maroon-500"
                >
                    <option value="All">All Streams</option>
                    <option value="Consultancy">Consultancy</option>
                    <option value="Events">Events</option>
                    <option value="Projects">Projects</option>
                    <option value="Industry">Industry</option>
                    <option value="Analysis">Analysis</option>
                </select>
            </div>

            {/* Ledger Table - Admin Hub Aesthetic */}
            <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
                        <p className="mt-4 text-xs font-black uppercase tracking-widest italic text-gray-400">Synchronizing Ledger...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-500 font-black italic">
                                <th className="px-8 py-5">Stream Entity</th>
                                <th className="px-8 py-5">Categorization</th>
                                <th className="px-8 py-5">Yield Amount</th>
                                <th className="px-8 py-5">Verification Date</th>
                                <th className="px-8 py-5 text-right">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((rec) => (
                                    <tr key={rec._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-maroon-50 transition-colors">
                                                    <Database className="w-5 h-5 text-gray-300 group-hover:text-maroon-600 transition-colors" />
                                                </div>
                                                <div className="max-w-md">
                                                    <p className="text-xs font-black italic uppercase tracking-tighter text-slate-800 dark:text-white line-clamp-1">{rec.details || 'UNSPECIFIED ACQUISITION'}</p>
                                                    <p className="text-[9px] font-black text-gray-400 italic uppercase mt-0.5">SOURCE REF: {rec._id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge variant="outline" className="border-indigo-100 text-indigo-600 bg-indigo-50/30 text-[9px] font-black italic uppercase px-3 py-1">{rec.revenueSource}</Badge>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black italic text-maroon-600 tracking-tighter">₹{parseFloat(rec.amountGenerated).toLocaleString()}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-bold text-slate-500 italic uppercase">{new Date(rec.submittedDate || rec.createdAt).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl text-maroon-600 font-black text-[9px] uppercase tracking-widest italic hover:bg-maroon-50">
                                                Audit Entry <ArrowUpRight className="w-3 h-3 ml-2" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-20">
                                            <FileText className="w-12 h-12" />
                                            <p className="text-xs font-black uppercase tracking-widest italic">Zero records detected in current stream</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            </Card>
        </div>
    );
};

export default MyRevenueRecords;
