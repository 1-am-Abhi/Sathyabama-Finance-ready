import React, { useEffect, useState } from 'react';
import { Eye, Clock, CheckCircle, XCircle, Search, Filter, FileText } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const MyRequests = () => {
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        // Load requests from local storage
        const storedRequests = JSON.parse(localStorage.getItem('equipmentRequests') || '[]');
        setRequests(storedRequests);
        setFilteredRequests(storedRequests);
    }, []);

    useEffect(() => {
        let result = requests;

        if (searchTerm) {
            result = result.filter(req =>
                req.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.projectName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'All') {
            result = result.filter(req => req.status === statusFilter);
        }

        setFilteredRequests(result);
    }, [searchTerm, statusFilter, requests]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'Funds Released': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Equipment Requests</h1>
                    <p className="text-gray-500 text-sm mt-1">Track status of your equipment and funding requests</p>
                </div>
                <Button onClick={() => window.location.href = '/faculty/equipment/add'} className="bg-blue-600 hover:bg-blue-700">
                    + New Request
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Equipment or Project..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                </div>
                <div className="relative w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none appearance-none bg-white"
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Funds Released">Funds Released</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Equipment</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Project</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount (₹)</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Request Type</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{req.equipmentName}</div>
                                        <div className="text-xs text-gray-500">Qty: {req.quantity}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{req.projectName}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">Req: ₹{parseInt(req.requestedAmount).toLocaleString()}</div>
                                        {req.approvedAmount && (
                                            <div className="text-xs text-green-600 font-medium">Appr: ₹{parseInt(req.approvedAmount).toLocaleString()}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                                            {req.requestType === 'PURCHASED' ? 'Reimbursement' : 'Funding'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                        {req.adminRemarks && (
                                            <div className="text-xs text-gray-500 mt-1 italic">"{req.adminRemarks}"</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(req.createdAt).toLocaleDateString()}
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
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <FileText className="w-10 h-10 text-gray-300 mb-2" />
                                        <p>No requests found</p>
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

export default MyRequests;
