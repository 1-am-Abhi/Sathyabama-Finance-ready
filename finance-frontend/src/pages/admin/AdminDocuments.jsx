import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Eye, CheckCircle, XCircle, FileText, Clock, X } from 'lucide-react';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const AdminDocuments = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const { showToast, ToastPortal } = useToast();
    const [docs, setDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');

    useEffect(() => {
        setLayout("Document Verification", "Review and verify faculty-submitted institutional documents");
        fetchDocs();
    }, [setLayout]);

    const fetchDocs = async () => {
        try {
            const res = await apiClient.get('/documents');
            setDocs(res.data.data || []);
        } catch (e) {
            console.error('Failed to load documents', e);
        }
    };

    const handleAction = async (id, status) => {
        try {
            const doc = docs.find(d => d._id === id);
            await apiClient.put(`/documents/${id}/status`, { status, adminRemarks: remarks || (status === 'VERIFIED' ? 'Verified by Admin' : 'Rejected by Admin') });
            setDocs(prev => prev.map(d => d._id === id ? { ...d, status, adminRemarks: remarks } : d));
            setSelectedDoc(null);
            setRemarks('');

            if (doc) {
                addNotification({
                    role: 'FACULTY',
                    type: status === 'VERIFIED' ? 'success' : 'rejection',
                    message: `Your document "${doc.fileName}" has been ${status === 'VERIFIED' ? 'VERIFIED ✓' : 'REJECTED ✗'} by Admin.`,
                    targetUserId: doc.facultyId,
                    actionUrl: '/faculty/documents'
                });
            }
        } catch (e) {
            showToast('Action failed: ' + e.message, 'error');
        }
    };

    const pending = docs.filter(d => d.status === 'PENDING').length;
    const verified = docs.filter(d => d.status === 'VERIFIED').length;

    const filtered = activeFilter === 'ALL' ? docs : docs.filter(d => d.status === activeFilter);

    const getStatusBadge = (status) => {
        if (status === 'VERIFIED') return 'bg-green-100 text-green-700';
        if (status === 'REJECTED') return 'bg-red-100 text-red-700';
        return 'bg-amber-100 text-amber-700';
    };

    return (
        <div className="p-6 space-y-8 pb-20">
            <ToastPortal />
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Documents', value: docs.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Pending Review', value: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Verified', value: verified, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((s, i) => (
                    <Card key={i} className={`border-0 shadow-sm ${s.bg}`}>
                        <CardContent className="p-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">{s.label}</p>
                            <p className={`text-4xl font-black italic mt-2 ${s.color}`}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeFilter === f
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm overflow-hidden dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-500 font-black italic">
                                <th className="px-8 py-5">File</th>
                                <th className="px-8 py-5">Faculty</th>
                                <th className="px-8 py-5">Type</th>
                                <th className="px-8 py-5">Project</th>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filtered.map(doc => (
                                <tr key={doc._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <p className="text-sm font-bold dark:text-white line-clamp-1 max-w-[180px]">{doc.fileName}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{doc.facultyName || 'Unknown'}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">{doc.documentType}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{doc.projectName || '—'}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-[10px] text-gray-400">{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <Badge variant="outline" className={`border-0 text-[9px] font-black uppercase ${getStatusBadge(doc.status)}`}>
                                            {doc.status}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => { setSelectedDoc(doc); setRemarks(''); }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200 transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-8 py-20 text-center opacity-40">
                                        <FileText className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 italic">No documents found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Review Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl border border-gray-100 dark:border-slate-800 mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black italic uppercase text-gray-900 dark:text-white">Document Review</h3>
                            <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 italic">File</p>
                                    <p className="font-bold dark:text-white text-xs mt-1">{selectedDoc.fileName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 italic">Faculty</p>
                                    <p className="font-bold dark:text-white text-xs mt-1">{selectedDoc.facultyName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 italic">Type</p>
                                    <p className="font-bold dark:text-white text-xs mt-1">{selectedDoc.documentType}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 italic">Project</p>
                                    <p className="font-bold dark:text-white text-xs mt-1">{selectedDoc.projectName || '—'}</p>
                                </div>
                                {selectedDoc.description && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black uppercase text-gray-400 italic">Description</p>
                                        <p className="font-bold dark:text-white text-xs mt-1">{selectedDoc.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* File Preview if image or PDF */}
                            {selectedDoc.fileData && (
                                <div className="mt-2">
                                    <p className="text-[10px] font-black uppercase text-gray-400 italic mb-2">Document Preview</p>
                                    {selectedDoc.fileData.startsWith('data:image') ? (
                                        <img src={selectedDoc.fileData} alt="doc" className="max-h-48 rounded-xl border border-gray-200 dark:border-slate-700 object-contain w-full" />
                                    ) : selectedDoc.fileData.startsWith('data:application/pdf') ? (
                                        <a href={selectedDoc.fileData} download={selectedDoc.fileName} className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase">
                                            <FileText className="w-4 h-4" /> Download PDF to Preview
                                        </a>
                                    ) : (
                                        <a href={selectedDoc.fileData} download={selectedDoc.fileName} className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-gray-600 dark:text-gray-300 text-xs font-black uppercase">
                                            <FileText className="w-4 h-4" /> Download File
                                        </a>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 italic">Admin Remarks / Notes</label>
                                <textarea
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-0 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none resize-none"
                                    placeholder="Optional remarks..."
                                />
                            </div>
                        </div>

                        {selectedDoc.status === 'PENDING' && (
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => handleAction(selectedDoc._id, 'VERIFIED')}
                                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" /> Verify Document
                                </Button>
                                <Button
                                    onClick={() => handleAction(selectedDoc._id, 'REJECTED')}
                                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Reject
                                </Button>
                            </div>
                        )}
                        {selectedDoc.status !== 'PENDING' && (
                            <div className={`p-4 rounded-xl text-center ${selectedDoc.status === 'VERIFIED' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : 'bg-red-50 dark:bg-red-900/20 text-red-700'}`}>
                                <p className="text-sm font-black uppercase italic">Status: {selectedDoc.status}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDocuments;
