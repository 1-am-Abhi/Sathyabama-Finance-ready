import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    Upload, FileText, CheckCircle2, Search, Clock, ShieldCheck,
    Database, HardDrive, X, Plus
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const DOC_TYPES = ['PROPOSAL', 'INVOICE', 'REPORT', 'CERTIFICATE', 'COMPLIANCE', 'PUBLICATION', 'GENERAL'];

const typeColors = {
    PROPOSAL:    'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
    INVOICE:     'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    REPORT:      'bg-blue-500/15 text-blue-300 border border-blue-500/30',
    CERTIFICATE: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    COMPLIANCE:  'bg-violet-500/15 text-violet-300 border border-violet-500/30',
    PUBLICATION: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    GENERAL:     'bg-slate-500/15 text-slate-300 border border-slate-500/30',
};

const FacultyDocuments = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const { showToast, ToastPortal } = useToast();
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [form, setForm] = useState({
        documentType: 'GENERAL',
        projectName: '',
        description: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [editingDocId, setEditingDocId] = useState(null);
    const [viewingDoc, setViewingDoc] = useState(null);

    useEffect(() => {
        setLayout("Institutional Archive", "Immutable storage for research compliance and academic artifacts");
        fetchDocuments();
    }, [setLayout]);

    const fetchDocuments = async () => {
        try {
            const res = await apiClient.get('/documents');
            setDocuments(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch documents', e);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile && !editingDocId) return;
        setUploading(true);
        try {
            const sendUpdate = async (fileData = null) => {
                const payload = {
                    documentType: form.documentType,
                    projectName: form.projectName,
                    description: form.description,
                };
                if (fileData) {
                    payload.fileData = fileData;
                    payload.fileName = selectedFile.name;
                    payload.fileType = selectedFile.type;
                }

                if (editingDocId) {
                    await apiClient.put(`/documents/${editingDocId}`, payload);
                    addNotification({
                        role: 'ADMIN',
                        type: 'info',
                        message: `Document resubmitted by ${user?.name}: "${selectedFile?.name || 'Updated'}"`,
                        actionUrl: '/admin/documents'
                    });
                } else {
                    await apiClient.post('/documents', {
                        ...payload,
                        fileName: selectedFile.name,
                        fileType: selectedFile.type,
                        fileData: fileData
                    });
                    addNotification({
                        role: 'ADMIN',
                        type: 'info',
                        message: `New document uploaded by ${user?.name}: "${selectedFile.name}"`,
                        actionUrl: '/admin/documents'
                    });
                }

                addNotification({
                    role: 'FACULTY',
                    type: 'info',
                    message: editingDocId ? `Your document has been resubmitted for verification.` : `Your document "${selectedFile.name}" has been submitted.`,
                    targetUserId: user?.id
                });

                setShowUploadModal(false);
                setSelectedFile(null);
                setEditingDocId(null);
                setForm({ documentType: 'GENERAL', projectName: '', description: '' });
                fetchDocuments();
            };

            if (selectedFile) {
                const reader = new FileReader();
                reader.onload = (ev) => sendUpdate(ev.target.result);
                reader.readAsDataURL(selectedFile);
            } else {
                sendUpdate();
            }
        } catch (e) {
            showToast('Operation failed: ' + e.message, 'error');
        } finally {
            if (!selectedFile) setUploading(false);
        }
    };

    const filtered = documents.filter(d =>
        d.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const total = documents.length;
    const verified = documents.filter(d => d.status === 'VERIFIED').length;
    const pending = documents.filter(d => d.status === 'PENDING').length;

    const stats = [
        { label: 'Total Artifacts', value: String(total), icon: Database, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        { label: 'Verified', value: String(verified), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Pending Review', value: String(pending), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { label: 'Audit Status', value: total > 0 ? (pending === 0 ? '100%' : `${Math.round((verified/total)*100)}%`) : '—', icon: ShieldCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    ];

    const getStatusBadge = (status) => {
        if (status === 'VERIFIED') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
        if (status === 'REJECTED') return 'bg-red-500/15 text-red-400 border border-red-500/30';
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    };

    const getStatusLabel = (status) => {
        if (status === 'VERIFIED') return '✓ Verified';
        if (status === 'REJECTED') return '✗ Rejected';
        return '⏳ Under Verification';
    };

    return (
        <div className="p-6 space-y-8 pb-20">
            <ToastPortal />
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className={`border ${stat.border} ${stat.bg} ${stat.color}`}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{stat.label}</p>
                                    <p className="text-3xl font-black mt-2 italic tracking-tighter">{stat.value}</p>
                                </div>
                                <div className={`w-10 h-10 ${stat.bg} border ${stat.border} rounded-xl flex items-center justify-center`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="SEARCH ARCHIVE..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-12 pr-6 bg-slate-800/50 border border-white/10 rounded-2xl text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder:text-slate-500"
                    />
                </div>
                <Button
                    onClick={() => {
                        setEditingDocId(null);
                        setForm({ documentType: 'GENERAL', projectName: '', description: '' });
                        setSelectedFile(null);
                        setShowUploadModal(true);
                    }}
                    className="h-14 px-8 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic transition-all"
                >
                    <Upload className="w-4 h-4 mr-3" /> Secure Upload Protocol
                </Button>
            </div>

            {/* Document Table */}
            <Card className="border border-white/10 bg-slate-800/40 overflow-hidden rounded-[2rem]">
                <CardHeader className="p-8 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black italic tracking-tighter uppercase text-white">Knowledge Ledger</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mt-1">
                                {filtered.length} artifact{filtered.length !== 1 ? 's' : ''} in archive
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                {filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-400 font-black italic">
                                    <th className="px-8 py-5">Artifact</th>
                                    <th className="px-8 py-5">Project</th>
                                    <th className="px-8 py-5">Type</th>
                                    <th className="px-8 py-5">Audit Status</th>
                                    <th className="px-8 py-5">Date</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map((doc) => (
                                    <tr key={doc._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black italic uppercase tracking-tighter text-white line-clamp-1">{doc.fileName}</p>
                                                    <p className="text-[9px] font-black text-slate-500 italic uppercase mt-1">Encrypted AES-256</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-black italic uppercase text-slate-400 line-clamp-1">{doc.projectName || '—'}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`text-[9px] font-black italic uppercase px-3 py-1 rounded-lg ${typeColors[doc.documentType] || typeColors.GENERAL}`}>
                                                {doc.documentType}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`text-[9px] font-black italic px-3 py-1 rounded-full uppercase tracking-tighter ${getStatusBadge(doc.status)}`}>
                                                {getStatusLabel(doc.status)}
                                            </span>
                                            {doc.adminRemarks && (
                                                <p className="text-[8px] text-slate-500 mt-1 italic">{doc.adminRemarks}</p>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-black text-slate-400 italic">
                                                {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setViewingDoc(doc)}
                                                    className="text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    View
                                                </Button>
                                                {doc.status === 'REJECTED' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingDocId(doc._id);
                                                            setForm({
                                                                documentType: doc.documentType,
                                                                projectName: doc.projectName,
                                                                description: doc.description
                                                            });
                                                            setShowUploadModal(true);
                                                        }}
                                                        className="bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-3 h-8 rounded-lg"
                                                    >
                                                        Re-upload
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 flex flex-col items-center justify-center opacity-30 text-center">
                        <FileText className="w-14 h-14 text-slate-400 mb-4" />
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">Archive empty — upload your first document using the Secure Upload Protocol button above</p>
                    </div>
                )}
            </Card>

            {/* Viewing Modal */}
            {viewingDoc && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Document Details</h3>
                            <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">File Name</p>
                                    <p className="text-sm font-bold text-white mt-1 break-all">{viewingDoc.fileName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Type</p>
                                    <Badge variant="outline" className={`mt-1 border-0 text-[10px] font-black italic ${typeColors[viewingDoc.documentType]}`}>
                                        {viewingDoc.documentType}
                                    </Badge>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Project</p>
                                    <p className="text-sm font-bold text-white mt-1">{viewingDoc.projectName || '—'}</p>
                                </div>
                                {viewingDoc.description && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Description</p>
                                        <p className="text-sm text-slate-300 mt-1">{viewingDoc.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* File Preview */}
                            {viewingDoc.fileData && (
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                    {viewingDoc.fileData.startsWith('data:image') ? (
                                        <img src={viewingDoc.fileData} alt="preview" className="max-h-64 mx-auto rounded-lg object-contain" />
                                    ) : (
                                        <div className="flex flex-col items-center py-8">
                                            <FileText className="w-12 h-12 text-slate-500 mb-3" />
                                            <a href={viewingDoc.fileData} download={viewingDoc.fileName} className="px-6 py-2 bg-rose-700/20 text-rose-400 border border-rose-700/30 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-rose-700/30 transition-all">
                                                Download Artifact
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewingDoc.adminRemarks && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic mb-1">Admin Feedback</p>
                                    <p className="text-xs text-amber-200 italic font-medium">{viewingDoc.adminRemarks}</p>
                                </div>
                            )}

                            <Button onClick={() => setViewingDoc(null)} className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest italic">
                                Close Access
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">
                                {editingDocId ? 'Re-upload Artifact' : 'Upload Document'}
                            </h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-5">
                            {/* File picker */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/5 transition-all"
                            >
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                                {selectedFile ? (
                                    <p className="text-sm font-black italic text-emerald-400">{selectedFile.name}</p>
                                ) : (
                                    <>
                                        <Plus className="w-8 h-8 text-slate-500 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Click to select file</p>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Document Type</label>
                                <select
                                    value={form.documentType}
                                    onChange={e => setForm({ ...form, documentType: e.target.value })}
                                    className="w-full h-12 px-4 bg-slate-800 border-0 rounded-xl font-bold italic text-sm outline-none text-white"
                                >
                                    {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Project Name (optional)</label>
                                <input
                                    value={form.projectName}
                                    onChange={e => setForm({ ...form, projectName: e.target.value })}
                                    className="w-full h-12 px-4 bg-slate-800 border-0 rounded-xl font-bold italic text-sm outline-none text-white"
                                    placeholder="e.g. AI Healthcare Diagnostics"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Description (optional)</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-slate-800 border-0 rounded-xl font-bold italic text-sm outline-none text-white resize-none"
                                    placeholder="Brief description of the document..."
                                />
                            </div>

                            <Button
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                                className="w-full h-14 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic"
                            >
                                {uploading ? 'Uploading...' : 'Submit for Verification'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyDocuments;
