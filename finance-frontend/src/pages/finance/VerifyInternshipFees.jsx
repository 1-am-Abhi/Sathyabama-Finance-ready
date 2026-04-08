import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useLayout } from '../../contexts/LayoutContext';
import apiClient from '../../api/client';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { AlertCircle, Plus, Trash2, CheckCircle2, Loader2, RefreshCw, GraduationCap, X } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────
const getId = (obj) => obj?._id || obj?.id || null;

// ─── component ────────────────────────────────────────────────────────────
const VerifyInternshipFees = () => {
    const { setLayout } = useLayout();

    /* list state */
    const [internships, setInternships]   = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);

    /* selection / verify form */
    const [selected, setSelected]         = useState(null);
    const [verifying, setVerifying]       = useState(false);
    const [paymentData, setPaymentData]   = useState({ paymentMode: '', receiptNumber: '', paymentDate: '' });
    const [verifyError, setVerifyError]   = useState(null);

    /* add-new modal */
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm]           = useState({ studentName: '', studentId: '', internshipTitle: '', feeAmount: '' });
    const [adding, setAdding]             = useState(false);
    const [addError, setAddError]         = useState(null);

    /* delete confirm */
    const [deleteId, setDeleteId]         = useState(null);
    const [deleting, setDeleting]         = useState(false);

    useEffect(() => {
        setLayout('Internship Fees', 'Verify and approve student internship payment records');
    }, [setLayout]);

    // ── FETCH ──────────────────────────────────────────────────────────────
    const fetchInternships = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/finance/internship-fees');
            if (res.data.success) {
                setInternships(res.data.data || []);
            } else {
                throw new Error(res.data.message || 'API returned unsuccessful');
            }
        } catch (err) {
            console.error('[InternshipFees] fetch error:', err);
            setError(err?.response?.data?.message || err.message || 'Failed to load internship records');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInternships(); }, [fetchInternships]);

    // ── ADD NEW ────────────────────────────────────────────────────────────
    const handleAdd = async (e) => {
        e.preventDefault();
        setAdding(true);
        setAddError(null);
        try {
            const res = await apiClient.post('/finance/internship-fees', {
                studentName:    addForm.studentName.trim(),
                studentId:      addForm.studentId.trim().toUpperCase(),
                internshipTitle: addForm.internshipTitle.trim(),
                feeAmount:      Number(addForm.feeAmount),
            });
            if (res.data.success) {
                setInternships(prev => [res.data.data, ...prev]);
                setShowAddModal(false);
                setAddForm({ studentName: '', studentId: '', internshipTitle: '', feeAmount: '' });
            } else {
                throw new Error(res.data.message);
            }
        } catch (err) {
            setAddError(err?.response?.data?.message || err.message || 'Failed to add record');
        } finally {
            setAdding(false);
        }
    };

    // ── VERIFY PAYMENT ─────────────────────────────────────────────────────
    const handleSelectVerify = (internship) => {
        setSelected(internship);
        setVerifyError(null);
        if (internship.paymentStatus === 'PAID') {
            setPaymentData({
                paymentMode:   internship.paymentMode   || '',
                receiptNumber: internship.receiptNumber || '',
                paymentDate:   internship.paymentDate   || '',
            });
        } else {
            setPaymentData({ paymentMode: '', receiptNumber: '', paymentDate: '' });
        }
    };

    const handleVerifySubmit = async (e) => {
        e.preventDefault();
        setVerifying(true);
        setVerifyError(null);
        try {
            const id = getId(selected);
            const res = await apiClient.put(`/finance/internship-fees/${id}`, {
                ...paymentData,
                paymentStatus: 'PAID',
            });
            if (res.data.success) {
                setInternships(prev =>
                    prev.map(item =>
                        getId(item) === id
                            ? { ...item, ...paymentData, paymentStatus: 'PAID' }
                            : item
                    )
                );
                setSelected(null);
                setPaymentData({ paymentMode: '', receiptNumber: '', paymentDate: '' });
            } else {
                throw new Error(res.data.message);
            }
        } catch (err) {
            setVerifyError(err?.response?.data?.message || err.message || 'Failed to verify payment');
        } finally {
            setVerifying(false);
        }
    };

    // ── DELETE ─────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await apiClient.delete(`/finance/internship-fees/${deleteId}`);
            if (res.data.success) {
                setInternships(prev => prev.filter(item => getId(item) !== deleteId));
                if (getId(selected) === deleteId) setSelected(null);
                setDeleteId(null);
            }
        } catch (err) {
            console.error('[InternshipFees] delete error:', err);
        } finally {
            setDeleting(false);
        }
    };

    const pendingCount = internships.filter(i => i.paymentStatus === 'PENDING').length;

    // ── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="p-4 sm:p-8 min-h-screen dark:bg-slate-950">

            {/* ── Top action bar ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold dark:text-white">Internship Fee Records</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {loading ? 'Loading…' : `${internships.length} record${internships.length !== 1 ? 's' : ''} in database`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchInternships}
                        disabled={loading}
                        className="dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => { setShowAddModal(true); setAddError(null); }}
                        className="bg-maroon-700 hover:bg-maroon-800 text-white"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Record
                    </Button>
                </div>
            </div>

            {/* ── Pending alert ── */}
            {!loading && !error && pendingCount > 0 && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                                    {pendingCount} internship{pendingCount > 1 ? 's' : ''} blocked from approval
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                    These internships cannot be approved until fee payment is verified and marked as "Paid"
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Loading ── */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-maroon-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fetching internship records from database…</p>
                </div>
            )}

            {/* ── API Error ── */}
            {!loading && error && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 mb-6">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-900 dark:text-red-300">Failed to load data</p>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
                                <Button size="sm" variant="outline" onClick={fetchInternships} className="mt-3 border-red-200 text-red-600">
                                    Retry
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Main content ── */}
            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left: table ── */}
                    <div className="lg:col-span-2">
                        <Card className="dark:bg-slate-900 border-0 shadow-sm">
                            <CardHeader className="border-b dark:border-slate-800 px-4 sm:px-6">
                                <CardTitle className="text-base sm:text-lg dark:text-white">Internships</CardTitle>
                                <CardDescription className="dark:text-gray-400">
                                    All internship applications and their payment status
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {internships.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
                                        <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                        <div>
                                            <p className="font-semibold text-gray-600 dark:text-gray-300">No internship records found</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                Click <strong>Add Record</strong> to register real student internship data
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => { setShowAddModal(true); setAddError(null); }}
                                            className="bg-maroon-700 hover:bg-maroon-800 text-white"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Add First Record
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table className="min-w-[540px]">
                                            <TableHeader>
                                                <TableRow className="dark:border-slate-800">
                                                    <TableHead className="pl-4 sm:pl-6">Student</TableHead>
                                                    <TableHead>Internship</TableHead>
                                                    <TableHead>Fee Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right pr-4">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {internships.map((internship) => {
                                                    const id = getId(internship);
                                                    const isPending = internship.paymentStatus === 'PENDING';
                                                    return (
                                                        <TableRow
                                                            key={id}
                                                            className={`dark:border-slate-800 transition-colors ${
                                                                isPending ? 'dark:bg-yellow-900/5 bg-yellow-50/50' : ''
                                                            } ${getId(selected) === id ? 'ring-1 ring-inset ring-maroon-300 dark:ring-maroon-700' : ''}`}
                                                        >
                                                            <TableCell className="pl-4 sm:pl-6">
                                                                <div className="font-semibold text-sm dark:text-white">{internship.studentName}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{internship.studentId}</div>
                                                            </TableCell>
                                                            <TableCell className="text-sm dark:text-gray-300">{internship.internshipTitle}</TableCell>
                                                            <TableCell className="font-mono text-sm font-semibold dark:text-gray-200">
                                                                ₹{Number(internship.feeAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col gap-1">
                                                                    <Badge
                                                                        className={isPending
                                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0 w-fit'
                                                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 w-fit'
                                                                        }
                                                                    >
                                                                        {isPending ? '⏳ PENDING' : '✅ PAID'}
                                                                    </Badge>
                                                                    {isPending && (
                                                                        <span className="text-[10px] text-red-500 dark:text-red-400">🔒 Approval blocked</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-4">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant={getId(selected) === id ? 'default' : 'outline'}
                                                                        className={getId(selected) === id
                                                                            ? 'bg-maroon-700 hover:bg-maroon-800 text-white border-0'
                                                                            : 'dark:border-slate-700 dark:hover:bg-slate-800 dark:text-gray-300'
                                                                        }
                                                                        onClick={() => handleSelectVerify(internship)}
                                                                    >
                                                                        {internship.paymentStatus === 'PAID' ? 'View' : 'Verify'}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2"
                                                                        onClick={() => setDeleteId(id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Right: verify panel ── */}
                    <div>
                        {selected ? (
                            <Card className="dark:bg-slate-900 border-0 shadow-sm">
                                <CardHeader className="border-b dark:border-slate-800">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-base dark:text-white">Payment Verification</CardTitle>
                                            <CardDescription className="dark:text-gray-400 mt-1">{selected.studentName}</CardDescription>
                                        </div>
                                        <button
                                            onClick={() => setSelected(null)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-5">
                                    <form onSubmit={handleVerifySubmit} className="space-y-4">
                                        <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">Student ID</span>
                                                <span className="font-mono font-semibold dark:text-white">{selected.studentId}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">Internship</span>
                                                <span className="font-semibold dark:text-white text-right max-w-[160px]">{selected.internshipTitle}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">Fee Amount</span>
                                                <span className="font-mono font-bold text-green-600 dark:text-green-400">
                                                    ₹{Number(selected.feeAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        {selected.paymentStatus === 'PAID' && (
                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold">Payment Verified</p>
                                                    <p className="text-[10px] opacity-80">{selected.paymentMode} · {selected.receiptNumber}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <Label className="text-xs font-medium dark:text-gray-300">Payment Mode *</Label>
                                            <select
                                                value={paymentData.paymentMode}
                                                onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                                                className="flex h-9 w-full rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 dark:text-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-maroon-500"
                                                required
                                            >
                                                <option value="">Select Mode</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Online">Online Transfer</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="DD">Demand Draft</option>
                                                <option value="UPI">UPI</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-medium dark:text-gray-300">Receipt Number *</Label>
                                            <Input
                                                value={paymentData.receiptNumber}
                                                onChange={(e) => setPaymentData({ ...paymentData, receiptNumber: e.target.value })}
                                                placeholder="e.g. RCPT/2024/001"
                                                required
                                                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-medium dark:text-gray-300">Payment Date *</Label>
                                            <Input
                                                type="date"
                                                value={paymentData.paymentDate}
                                                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                                                required
                                                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-9"
                                            />
                                        </div>

                                        {verifyError && (
                                            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">{verifyError}</p>
                                        )}

                                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={verifying}>
                                            {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Mark as Paid</>}
                                        </Button>
                                        <Button type="button" variant="outline" className="w-full dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => setSelected(null)}>
                                            Cancel
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="dark:bg-slate-900 border-0 shadow-sm">
                                <CardContent className="pt-12 pb-12">
                                    <div className="text-center text-gray-400 dark:text-gray-600">
                                        <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">Select an internship to verify payment details</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* ══ ADD RECORD MODAL ══════════════════════════════════════════════ */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full dark:bg-slate-900 border-0 shadow-2xl">
                        <CardHeader className="border-b dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg dark:text-white flex items-center gap-2">
                                        <Plus className="w-5 h-5" /> Add Internship Record
                                    </CardTitle>
                                    <CardDescription className="dark:text-gray-400 mt-1">
                                        Register a new student internship fee record
                                    </CardDescription>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs font-medium dark:text-gray-300">Student Full Name *</Label>
                                        <Input
                                            value={addForm.studentName}
                                            onChange={(e) => setAddForm({ ...addForm, studentName: e.target.value })}
                                            placeholder="e.g. Ram Kumar"
                                            required
                                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium dark:text-gray-300">Student ID *</Label>
                                        <Input
                                            value={addForm.studentId}
                                            onChange={(e) => setAddForm({ ...addForm, studentId: e.target.value })}
                                            placeholder="e.g. STU2024010"
                                            required
                                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium dark:text-gray-300">Fee Amount (₹) *</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={addForm.feeAmount}
                                            onChange={(e) => setAddForm({ ...addForm, feeAmount: e.target.value })}
                                            placeholder="e.g. 5000"
                                            required
                                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs font-medium dark:text-gray-300">Internship Title *</Label>
                                        <Input
                                            value={addForm.internshipTitle}
                                            onChange={(e) => setAddForm({ ...addForm, internshipTitle: e.target.value })}
                                            placeholder="e.g. IoT Research Internship — Dept. of ECE"
                                            required
                                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {addError && (
                                    <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />{addError}
                                    </p>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button type="button" variant="outline" className="flex-1 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => setShowAddModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1 bg-maroon-700 hover:bg-maroon-800 text-white" disabled={adding}>
                                        {adding ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Adding…</> : <><Plus className="w-4 h-4 mr-1" />Add Record</>}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ══ DELETE CONFIRM MODAL ══════════════════════════════════════════ */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="max-w-sm w-full dark:bg-slate-900 border-0 shadow-2xl">
                        <CardHeader className="border-b dark:border-slate-800">
                            <CardTitle className="text-base text-red-600 dark:text-red-400 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" /> Delete Record
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5 space-y-4">
                            <p className="text-sm dark:text-gray-300">
                                Are you sure you want to permanently delete this internship fee record from the database?
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1 dark:border-slate-700" onClick={() => setDeleteId(null)} disabled={deleting}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                >
                                    {deleting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Deleting…</> : 'Confirm Delete'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default VerifyInternshipFees;
