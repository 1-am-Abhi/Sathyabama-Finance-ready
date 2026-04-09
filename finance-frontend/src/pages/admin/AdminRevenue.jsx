import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CheckCircle2, XCircle, Search, Calendar, FileText, IndianRupee, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const AdminRevenue = () => {
    const { setLayout } = useLayout();
    const { showToast, ToastPortal } = useToast();
    const { addNotification } = useNotifications();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal states
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
    const [remarks, setRemarks] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setLayout("Approve Revenue", "Verify and approve consultancy revenue before finance verification");
        fetchQueue();
    }, [setLayout]);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/revenue/admin-queue');
            if (res.data.success) {
                setRecords(res.data.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to load revenue queue', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = (record, type) => {
        setSelectedRecord(record);
        setActionType(type);
        setRemarks('');
        setIsModalOpen(true);
    };

    const submitAction = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const newStatus = actionType === 'approve' ? 'ADMIN_APPROVED' : 'REJECTED';
            const res = await apiClient.put(`/revenue/${selectedRecord._id || selectedRecord.id}/admin-approve`, {
                status: newStatus,
                remarks
            });

            if (res.data.success) {
                showToast(`Record ${actionType}d successfully`, 'success');
                setRecords(records.map(r => 
                    (r._id === selectedRecord._id || r.id === selectedRecord.id) 
                        ? { ...r, status: newStatus, adminRemarks: remarks } 
                        : r
                ));
                
                // Notify Faculty
                addNotification({
                    role: 'FACULTY',
                    type: actionType === 'approve' ? 'success' : 'alert',
                    message: `Your revenue log for ₹${selectedRecord.amountGenerated} was ${actionType}d by Admin.`,
                    actionUrl: '/faculty/revenue/records',
                    targetUserId: selectedRecord.userId
                });

                // Notify Finance if approved
                if (actionType === 'approve') {
                    addNotification({
                        role: 'FINANCE_OFFICER',
                        type: 'info',
                        message: `New revenue record (₹${selectedRecord.amountGenerated}) approved by Admin. Awaiting finance verification.`,
                        actionUrl: '/finance/revenue-verification'
                    });
                }
            }
        } catch (error) {
            showToast(error.response?.data?.message || 'Action failed', 'error');
        } finally {
            setProcessing(false);
            setIsModalOpen(false);
            setSelectedRecord(null);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const filteredRecords = records.filter(r => 
        r.revenueSource?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.User?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.details?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = records.filter(r => r.status === 'PENDING_ADMIN' || r.status === 'PENDING').length;

    return (
        <div className="p-8 space-y-6">
            <ToastPortal />
            
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Pending Approvals</p>
                                <p className="text-3xl font-bold mt-1 text-blue-900 dark:text-blue-100">{pendingCount}</p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Recently Approved</p>
                                <p className="text-3xl font-bold mt-1 text-green-900 dark:text-green-100">
                                    {records.filter(r => r.status === 'ADMIN_APPROVED').length}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="dark:bg-slate-900 border-0 shadow-sm">
                <CardHeader className="border-b dark:border-slate-800 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Revenue Logs</CardTitle>
                            <CardDescription>Review consultancy records before sending to Finance</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search records..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 dark:bg-slate-800"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                            <p>Loading records...</p>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No revenue records found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-slate-800">
                                    <TableHead>Faculty / Dept</TableHead>
                                    <TableHead>Source Details</TableHead>
                                    <TableHead>Amount Generated</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.map((r) => {
                                    const isPending = r.status === 'PENDING_ADMIN' || r.status === 'PENDING';
                                    return (
                                        <TableRow key={r._id || r.id} className="dark:border-slate-800">
                                            <TableCell>
                                                <p className="font-semibold">{r.User?.name || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{r.User?.department}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium text-gray-900 dark:text-white">{r.revenueSource}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]" title={r.details}>{r.details}</p>
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-green-600">
                                                {formatCurrency(r.amountGenerated)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Calendar className="w-3 h-3 mr-1"/>
                                                    {new Date(r.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        isPending ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                                                        r.status === 'ADMIN_APPROVED' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                                        r.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                                        'bg-red-100 text-red-800 hover:bg-red-200'
                                                    }
                                                >
                                                    {isPending ? 'PENDING' : r.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isPending ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleActionClick(r, 'reject')}>Reject</Button>
                                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleActionClick(r, 'approve')}>Approve</Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Processed</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Action Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionType === 'approve' ? 'Approve Revenue Record' : 'Reject Revenue Record'}</DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve' 
                                ? "Confirming will send this directly to Finance for official payment verification." 
                                : "Please provide a reason for rejecting this record."}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <form onSubmit={submitAction} className="space-y-4 py-2">
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Amount:</span>
                                    <span className="font-bold text-green-600">{formatCurrency(selectedRecord.amountGenerated)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-500">Source:</span>
                                    <span className="font-medium text-right">{selectedRecord.revenueSource}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Admin Remarks (Optional)</Label>
                                <Input 
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="Add notes for Finance or Faculty..."
                                    className="dark:bg-slate-900"
                                />
                            </div>

                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button 
                                    type="submit" 
                                    className={actionType === 'approve' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
                                    disabled={processing}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminRevenue;
