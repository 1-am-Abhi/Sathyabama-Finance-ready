import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CheckCircle2, FileText, Download, Briefcase, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const EquipmentDisbursements = () => {
    const { setLayout } = useLayout();
    const { showToast, ToastPortal } = useToast();
    const { addNotification } = useNotifications();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
    const [executionData, setExecutionData] = useState({
        transactionId: '',
        bankName: '',
        disbursementDate: new Date().toISOString().split('T')[0],
        remarks: ''
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setLayout("Equipment Disbursements", "Execute payments for admin-approved equipment allocations");
        fetchQueue();
    }, [setLayout]);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/finance/equipment-disbursements');
            if (res.data.success) {
                setQueue(res.data.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to load equipment queue', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteClick = (request) => {
        setSelectedRequest(request);
        setExecutionData({
            transactionId: '',
            bankName: '',
            disbursementDate: new Date().toISOString().split('T')[0],
            remarks: ''
        });
        setIsExecuteModalOpen(true);
    };

    const handleExecuteSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const res = await apiClient.put(`/finance/equipment-disbursements/${selectedRequest._id || selectedRequest.id}/execute`, executionData);

            if (res.data.success) {
                showToast('Equipment payment executed successfully', 'success');
                setQueue(queue.filter(r => (r._id || r.id) !== (selectedRequest._id || selectedRequest.id)));
                
                // Notify Faculty
                addNotification({
                    role: 'FACULTY',
                    type: 'success',
                    message: `Payment of ₹${selectedRequest.approvedAmount} for equipment "${selectedRequest.equipmentName}" has been disbursed.`,
                    actionUrl: '/faculty/equipment/dashboard',
                    targetUserId: selectedRequest.facultyId
                });
            }
        } catch (error) {
            showToast(error.response?.data?.message || 'Execution failed', 'error');
        } finally {
            setProcessing(false);
            setIsExecuteModalOpen(false);
            setSelectedRequest(null);
        }
    };

    const renderBillViewer = (billData) => {
        if (!billData) return null;
        if (billData.startsWith('data:application/pdf')) {
            return <iframe src={billData} title="Bill" className="w-full h-40 rounded-xl border mt-2" />;
        }
        if (billData.startsWith('data:image/')) {
            return <img src={billData} alt="Bill" className="w-full max-h-40 object-contain border rounded-xl mt-2" />;
        }
        return <p className="text-xs text-gray-500 italic">Unsupported bill format</p>;
    };

    return (
        <div className="p-8 space-y-6">
            <ToastPortal />

            <Card className="dark:bg-slate-900 border-0 shadow-sm">
                <CardHeader className="border-b dark:border-slate-800">
                    <CardTitle>Equipment Payment Queue</CardTitle>
                    <CardDescription>Review bills and execute bank transfers for approved equipment</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                            <p>Loading queue...</p>
                        </div>
                    ) : queue.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No pending equipment disbursements.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 dark:bg-slate-800">
                                        <TableHead>Faculty / Project</TableHead>
                                        <TableHead>Equipment</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Verification</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {queue.map((req) => (
                                        <TableRow key={req._id || req.id} className="dark:border-slate-800">
                                            <TableCell>
                                                <p className="font-semibold">{req.facultyName}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]" title={req.projectName}>{req.projectName || 'General Fund'}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">{req.equipmentName}</p>
                                                <p className="text-xs text-gray-500">{req.quantity} Units | {req.requestType}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-mono font-bold text-green-600">
                                                    ₹{parseInt(req.approvedAmount || 0).toLocaleString()}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {renderBillViewer(req.billData)}
                                                {req.billData ? (
                                                    <a href={req.billData} download="equipment_bill" className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-600 hover:underline">
                                                        <Download className="w-3 h-3" /> Download Bill
                                                    </a>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200 bg-yellow-50">No Bill Uploaded</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleExecuteClick(req)}>
                                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Execute Payment
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isExecuteModalOpen} onOpenChange={setIsExecuteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Execute Equipment Disbursement</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <form onSubmit={handleExecuteSubmit} className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700 dark:text-blue-300">Amount to transfer:</span>
                                    <span className="font-bold text-blue-900 dark:text-blue-100">
                                        ₹{parseInt(selectedRequest.approvedAmount || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-blue-700 dark:text-blue-300">Description:</span>
                                    <span className="font-medium text-right max-w-[200px] truncate text-blue-900 dark:text-blue-100">{selectedRequest.equipmentName}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Transaction / Reference ID *</Label>
                                <Input required value={executionData.transactionId} onChange={e => setExecutionData(d => ({ ...d, transactionId: e.target.value }))} className="dark:bg-slate-900" />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Bank Name *</Label>
                                <Input required value={executionData.bankName} onChange={e => setExecutionData(d => ({ ...d, bankName: e.target.value }))} className="dark:bg-slate-900" />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Disbursement Date *</Label>
                                <Input type="date" required value={executionData.disbursementDate} onChange={e => setExecutionData(d => ({ ...d, disbursementDate: e.target.value }))} className="dark:bg-slate-900" />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Remarks (Optional)</Label>
                                <Input value={executionData.remarks} onChange={e => setExecutionData(d => ({ ...d, remarks: e.target.value }))} className="dark:bg-slate-900" />
                            </div>

                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsExecuteModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={processing}>
                                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Set as Disbursed
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EquipmentDisbursements;
