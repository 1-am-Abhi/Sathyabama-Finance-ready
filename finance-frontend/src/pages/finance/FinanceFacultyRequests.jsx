import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { toast } from 'sonner';

const FinanceFacultyRequests = () => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const res = await apiClient.get('/finance/requests');
             setRequests(res.data?.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load approved requests.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleDisburse = async (id) => {
        try {
            setActionLoading(id);
            await apiClient.patch(`/finance/requests/${id}/disburse`);
            toast.success('Funds logged as disbursed successfully!');
            fetchRequests();
        } catch (error) {
            console.error(error);
            toast.error('Failed to disburse funds.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Fund Disbursement Queue</h1>
                <p className="text-gray-500">Process approved requests ready for financial disbursement.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                    No approved requests waiting for disbursement.
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Request Type</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Amount</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Approved Date</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(Array.isArray(requests) ? requests : []).map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{req.requestType || 'N/A'}</td>
                                        <td className="p-4 text-gray-900 font-bold">₹{(req.approvedAmount || req.requestedAmount || 0).toLocaleString('en-IN')}</td>
                                        <td className="p-4 text-gray-600 font-medium">
                                            {req.updatedAt ? new Date(req.updatedAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDisburse(req.id)}
                                                disabled={actionLoading === req.id}
                                                className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                                                    actionLoading === req.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                                }`}
                                            >
                                                {actionLoading === req.id ? 'Processing...' : 'Disburse'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceFacultyRequests;
