import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { CheckCircle, XCircle, Hammer, Search, Download, Eye, Clock, FileText, User, Layers, IndianRupee, Package } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import apiClient from '../../api/client';
import * as XLSX from 'xlsx';

const ApproveEquipment = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const [allRequests, setAllRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        setLayout("Equipment Approvals", "Audit and sanction infrastructure and asset allocations");
        fetchRequests();
    }, [setLayout]);

    const fetchRequests = async () => {
        try {
            const res = await apiClient.get('/equipment-requests');
            setAllRequests(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch equipment requests', err);
        }
    };

    const handleAction = async (id, newStatus) => {
        const targetReq = allRequests.find(r => (r._id || r.id) === id);
        try {
            await apiClient.put(`/equipment-requests/${id}/status`, {
                status: newStatus,
                approvedAmount: newStatus === 'Approved' ? targetReq?.requestedAmount : null,
                adminRemarks: newStatus === 'Approved' ? 'Verified and approved by Admin' : 'Rejected by Admin'
            });
            setAllRequests(prev => prev.map(r => (r._id || r.id) === id ? { ...r, status: newStatus } : r));
            setSelectedRequest(null);

            if (targetReq) {
                addNotification({
                    role: 'FACULTY',
                    type: newStatus === 'Approved' ? 'success' : 'rejection',
                    message: `Your Equipment Request for "${targetReq.equipmentName}" has been ${newStatus.toUpperCase()}.`,
                    actionUrl: '/faculty/equipment/dashboard',
                    targetUserId: targetReq.facultyId
                });
                
                if (newStatus === 'Approved') {
                    addNotification({
                        role: 'FINANCE_OFFICER',
                        type: 'info',
                        message: `New Equipment Request for "${targetReq.equipmentName}" has been approved by Admin and requires disbursement.`,
                        actionUrl: '/finance/equipment-disbursements'
                    });
                }
            }
        } catch (err) {
            console.error('Action failed', err);
        }
    };

    const exportExcel = () => {
        const rows = filtered.map((req, i) => ({
            'S.No': i + 1,
            'Request ID': (req._id || req.id || '').substring(0, 8),
            'Faculty': req.facultyName || '-',
            'Equipment / Asset': req.equipmentName,
            'Quantity': req.quantity,
            'Request Type': req.requestType,
            'Requested Amount (₹)': req.requestedAmount,
            'Approved Amount (₹)': req.approvedAmount || '-',
            'Project': req.projectName || '-',
            'Justification': req.justification || '-',
            'Status': req.status,
            'Admin Remarks': req.adminRemarks || '-',
            'Submitted On': new Date(req.createdAt).toLocaleDateString('en-IN'),
            'Bill Attached': req.billData ? 'Yes' : 'No'
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Equipment Requests');
        XLSX.writeFile(wb, `Equipment_Requests_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const statusOptions = ['All', 'Pending', 'Approved', 'Rejected'];
    const filtered = allRequests.filter(r => {
        const matchSearch = !searchTerm || r.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()) || r.facultyName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const counts = {
        Pending: allRequests.filter(r => r.status === 'Pending').length,
        Approved: allRequests.filter(r => r.status === 'Approved').length,
        Rejected: allRequests.filter(r => r.status === 'Rejected').length,
    };

    const renderBillViewer = (billData) => {
        if (!billData || typeof billData !== 'string' || billData.length < 50) return null;
        if (billData.startsWith('data:application/pdf')) {
            return <iframe src={billData} title="Bill" className="w-full h-72 rounded-xl border-0 mt-3" />;
        }
        if (billData.startsWith('data:image/')) {
            return <img src={billData} alt="Bill" className="w-full max-h-72 object-contain rounded-xl mt-3 border" />;
        }
        return null;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending', count: counts.Pending, icon: Clock, colors: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', filter: 'Pending' },
                    { label: 'Approved', count: counts.Approved, icon: CheckCircle, colors: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', filter: 'Approved' },
                    { label: 'Rejected', count: counts.Rejected, icon: XCircle, colors: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400', filter: 'Rejected' },
                ].map(stat => (
                    <button key={stat.label} onClick={() => setStatusFilter(stat.filter)}
                        className={`text-left p-6 rounded-2xl shadow-sm transition-all hover:scale-[1.02] ${stat.colors} ${statusFilter === stat.filter ? 'ring-2 ring-offset-2 ring-current' : ''}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic">{stat.label}</p>
                                <p className="text-4xl font-black mt-1">{stat.count}</p>
                            </div>
                            <stat.icon className="w-8 h-8 opacity-60" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search assets or faculty..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 pr-6 bg-white dark:bg-slate-900 border-0 rounded-xl shadow-sm focus:ring-2 focus:ring-maroon-500 font-semibold text-sm"
                    />
                </div>
                <div className="flex gap-3">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="h-12 px-4 bg-white dark:bg-slate-900 border-0 rounded-xl shadow-sm font-semibold text-sm outline-none dark:text-white">
                        {statusOptions.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <Button onClick={exportExcel} variant="outline" className="h-12 px-6 font-bold text-xs uppercase tracking-widest rounded-xl border-gray-200 hover:bg-gray-50">
                        <Download className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm overflow-hidden dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-500 font-black italic">
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4">Faculty</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Bill</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filtered.map(req => (
                                <tr key={req._id || req.id} onClick={() => setSelectedRequest(req)}
                                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Hammer className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm dark:text-white">{req.equipmentName}</p>
                                                <p className="text-[10px] font-black uppercase text-gray-400">{req.quantity} Units • {req.requestType}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold dark:text-white">{req.facultyName || '—'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 line-clamp-1">{req.projectName || '—'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-maroon-600">₹{parseInt(req.requestedAmount || 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.billData ? (
                                            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Attached</span>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-gray-400">None</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="outline" className={`border-0 text-[10px] font-black italic uppercase tracking-widest px-3 py-1
                                            ${req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                              req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                              'bg-amber-100 text-amber-700'}`}>
                                            {req.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                                            className="text-xs font-bold">
                                            <Eye className="w-4 h-4 mr-1" /> View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-400 font-bold text-sm">No equipment requests found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Detail Modal */}
            {selectedRequest && (
                <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                    <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[2rem] border-0 shadow-2xl">
                        <div className="bg-slate-900 dark:bg-slate-800 p-6 text-white">
                            <DialogTitle className="text-lg font-black italic tracking-tighter uppercase">{selectedRequest.equipmentName}</DialogTitle>
                            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">{selectedRequest.requestType} • {selectedRequest.quantity} Units</p>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: User, label: 'Faculty', value: selectedRequest.facultyName },
                                    { icon: Layers, label: 'Project', value: selectedRequest.projectName || 'N/A' },
                                    { icon: IndianRupee, label: 'Requested', value: `₹${parseInt(selectedRequest.requestedAmount || 0).toLocaleString()}` },
                                    { icon: IndianRupee, label: 'Approved', value: selectedRequest.approvedAmount ? `₹${parseInt(selectedRequest.approvedAmount).toLocaleString()}` : 'Pending' },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 flex items-start gap-3">
                                        <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                                            <p className="font-bold text-sm dark:text-white mt-0.5">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedRequest.justification && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Justification</p>
                                    <p className="text-sm dark:text-blue-200">{selectedRequest.justification}</p>
                                </div>
                            )}

                            {/* Bill / Image Viewer */}
                            {selectedRequest.billData ? (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Attached Bill / Proof</p>
                                    {renderBillViewer(selectedRequest.billData)}
                                    <a href={selectedRequest.billData} download="equipment_bill" className="inline-flex items-center gap-2 mt-3 text-xs font-bold text-maroon-600 hover:underline">
                                        <Download className="w-3 h-3" /> Download Bill
                                    </a>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center text-gray-400 text-xs font-bold italic">No bill attached</div>
                            )}

                            {selectedRequest.adminRemarks && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Admin Remarks</p>
                                    <p className="text-sm dark:text-amber-200">{selectedRequest.adminRemarks}</p>
                                </div>
                            )}

                            {/* Status badge */}
                            <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
                                <Badge className={`text-[10px] font-black italic uppercase tracking-widest px-4 py-2 border-0
                                    ${selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                      selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-amber-100 text-amber-700'}`}>
                                    {selectedRequest.status}
                                </Badge>
                                <p className="text-[10px] text-gray-400 font-bold">{new Date(selectedRequest.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>

                            {selectedRequest.status === 'Pending' && (
                                <div className="flex gap-3 pt-2">
                                    <Button className="flex-1 h-12 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-xs uppercase tracking-widest"
                                        onClick={() => handleAction(selectedRequest._id || selectedRequest.id, 'Approved')}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve Request
                                    </Button>
                                    <Button className="flex-1 h-12 bg-red-500 text-white hover:bg-red-600 rounded-xl font-black text-xs uppercase tracking-widest"
                                        onClick={() => handleAction(selectedRequest._id || selectedRequest.id, 'Rejected')}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject Request
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default ApproveEquipment;
