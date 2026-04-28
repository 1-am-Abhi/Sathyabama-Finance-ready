import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, FileText, User } from 'lucide-react';

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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case 'PARTIALLY_DISBURSED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'DISBURSED': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Faculty Requests Review</h1>
                <p className="text-gray-500 dark:text-gray-400">Review and approve or reject submissions from faculty members.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center text-gray-500 dark:text-gray-400">
                    No pending requests to review.
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-1">
                                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{req.requestType || 'N/A'}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <User className="w-4 h-4" />
                                        <span>{String(req.user?.name || 'Unknown Faculty')}</span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-200">
                                        Amount: <span className="text-green-600 dark:text-green-400">₹{(req.requestedAmount || req.approvedAmount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(req.computedStatus || req.status)}`}>
                                    {req.computedStatus || req.status}
                                </span>
                                
                                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    <button
                                        onClick={() => handleAction(req.id, 'approve')}
                                        disabled={actionLoading === req.id}
                                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-1 ${
                                            actionLoading === req.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                    >
                                        <CheckCircle className="w-4 h-4" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'reject')}
                                        disabled={actionLoading === req.id}
                                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-1 ${
                                            actionLoading === req.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                                        }`}
                                    >
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminFacultyRequests;

