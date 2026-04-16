import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { toast } from 'sonner';

const AdminFacultyRequests = () => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // stores id of request being processed

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const res = await apiClient.get('/admin/requests');
            setRequests(res.data?.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load faculty requests.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id, action) => {
        try {
            setActionLoading(id);
            await apiClient.patch(`/admin/requests/${id}/${action}`);
            toast.success(`Request successfully ${action}d!`);
            fetchRequests();
        } catch (error) {
            console.error(error);
            toast.error(`Failed to ${action} request.`);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Faculty Requests Review</h1>
                <p className="text-gray-500">Review and approve or reject submissions from faculty members.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                    No pending requests to review.
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Request Type</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Faculty Name</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Amount</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Status</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{req.requestType || 'N/A'}</td>
                                        <td className="p-4 text-gray-600">{req.user?.name || 'Unknown Faculty'}</td>
                                        <td className="p-4 text-gray-900 font-semibold">₹{(req.requestedAmount || req.approvedAmount || 0).toLocaleString('en-IN')}</td>
                                        <td className="p-4">
                                            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleAction(req.id, 'approve')}
                                                disabled={actionLoading === req.id}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                                    actionLoading === req.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'reject')}
                                                disabled={actionLoading === req.id}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                                    actionLoading === req.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                                                }`}
                                            >
                                                Reject
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

export default AdminFacultyRequests;
