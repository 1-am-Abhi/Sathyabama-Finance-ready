import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CheckCircle2, Search, GraduationCap, Clock, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const AdminInternship = () => {
    const { setLayout } = useLayout();
    const { showToast, ToastPortal } = useToast();
    const { addNotification } = useNotifications();
    
    // Data State
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal State
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
    const [remarks, setRemarks] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setLayout("Approve Internship Fees", "Verify internship student enrollments before forwarding to Finance");
        fetchInternships();
    }, [setLayout]);

    const fetchInternships = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/finance/admin-internships');
            if (res.data.success) {
                setInternships(res.data.data || []);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to load internship queue', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

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
            const newStatus = actionType === 'approve' ? 'APPROVED' : 'REJECTED';
            const res = await apiClient.put(`/finance/admin-internships/${selectedRecord._id || selectedRecord.id}/approve`, {
                adminStatus: newStatus,
                adminRemarks: remarks
            });

            if (res.data.success) {
                showToast(`Internship record ${actionType}d successfully`, 'success');
                setInternships(internships.map(r => 
                    (r._id === selectedRecord._id || r.id === selectedRecord.id) 
                        ? { ...r, adminStatus: newStatus, adminRemarks: remarks } 
                        : r
                ));
                
                // Notify Finance if approved
                if (actionType === 'approve') {
                    addNotification({
                        role: 'FINANCE_OFFICER',
                        type: 'info',
                        message: `Internship for ${selectedRecord.studentName} has been administratively approved. Pending payment verification.`,
                        actionUrl: '/finance/internships'
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

    const filteredRecords = internships.filter(r => 
        r.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.internshipTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = internships.filter(r => r.adminStatus === 'PENDING').length;

    return (
        <div className="p-8 space-y-6">
            <ToastPortal />
            
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-yellow-600">Pending Approvals</p>
                                <p className="text-3xl font-bold mt-1 text-yellow-900 dark:text-yellow-100">{pendingCount}</p>
                            </div>
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Total Enrolled</p>
                                <p className="text-3xl font-bold mt-1 text-blue-900 dark:text-blue-100">
                                    {internships.length}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <GraduationCap className="w-6 h-6 text-blue-600" />
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
                            <CardTitle>Internship Student Records</CardTitle>
                            <CardDescription>Review and forward student profiles to Finance</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search by name or ID..."
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
                            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No student internship records found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-slate-800">
                                    <TableHead>Student</TableHead>
                                    <TableHead>Internship Title</TableHead>
                                    <TableHead>Fee Amount</TableHead>
                                    <TableHead>Admin Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.map((r) => {
                                    const isPending = r.adminStatus === 'PENDING';
                                    return (
                                        <TableRow key={r._id || r.id} className="dark:border-slate-800">
                                            <TableCell>
                                                <p className="font-semibold">{r.studentName}</p>
                                                <p className="text-xs font-mono text-gray-500">{r.studentId}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium text-gray-900 dark:text-white max-w-[250px] truncate" title={r.internshipTitle}>{r.internshipTitle}</p>
                                            </TableCell>
                                            <TableCell className="font-mono font-semibold">
                                                {formatCurrency(r.feeAmount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        isPending ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                                        r.adminStatus === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-red-100 text-red-800 hover:bg-red-200'
                                                    }
                                                >
                                                    {isPending ? 'PENDING' : r.adminStatus}
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
                        <DialogTitle>{actionType === 'approve' ? 'Approve Student' : 'Reject Student'}</DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve' 
                                ? "Confirming will forward this student to the Finance portal for mandatory fee verification." 
                                : "Please provide a reason for rejecting this enrollment."}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <form onSubmit={submitAction} className="space-y-4 py-2">
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Student:</span>
                                    <span className="font-semibold">{selectedRecord.studentName} ({selectedRecord.studentId})</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-500">Fee:</span>
                                    <span className="font-bold text-green-600">{formatCurrency(selectedRecord.feeAmount)}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Remarks (Optional)</Label>
                                <Input 
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="Add notes..."
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
                                    {actionType === 'approve' ? 'Confirm Forward' : 'Reject Enrollment'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminInternship;
