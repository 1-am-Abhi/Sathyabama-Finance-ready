import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Calendar, Globe, BookOpen, Send, Clock, FileCheck, FileX, Upload, Plus, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import apiClient from '../../api/client';
import * as XLSX from 'xlsx';
import useToast from '../../hooks/useToast';

const FacultyODRequest = () => {
    const { setLayout } = useLayout();
    const { user } = useAuth();
    const { addNotification } = useNotifications();
    const { showToast, ToastPortal } = useToast();

    useEffect(() => {
        setLayout("OD Management Portal", "Deployment lifecycle supervision and institutional duty tracking");
    }, [setLayout]);

    const [odType, setOdType] = useState('ACADEMIC');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [days, setDays] = useState(0);
    const [purpose, setPurpose] = useState('');
    const [isFullDay, setIsFullDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedOD, setSelectedOD] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchODs();
    }, []);

    const fetchODs = async () => {
        try {
            const response = await apiClient.get('/od-requests');
            setHistory(response.data.data);
        } catch (error) {
            console.error('Error fetching ODs:', error);
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
            setDays(diffDays > 0 ? diffDays : 0);
        }
    }, [startDate, endDate]);

    const handleProofUpload = async (id, file) => {
        if (!file) return;

        const isPDF = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');
        
        if (!isPDF && !isImage) {
            showToast('Please upload only images or PDF documents.', 'warning');
            return;
        }

        const maxSize = isPDF ? 250 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast(`File size too large. Maximum allowed is ${isPDF ? '250MB for PDFs' : '5MB for Images'}.`, 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const base64data = reader.result;
                await apiClient.put(`/od-requests/${id}/status`, { 
                    proofUploaded: true, 
                    proofData: base64data,
                    status: 'APPROVED' // Keep status same, update proof
                }); 
                setHistory(history.map(item => item._id === id ? { ...item, proofUploaded: true, proofData: base64data } : item));
                
                // Notify Admin
                addNotification({
                    role: 'ADMIN',
                    type: 'info',
                    message: `${user?.name || 'Faculty'} uploaded proof for their OD Request.`,
                    actionUrl: `/admin/od-requests?request_id=${id}`
                });
                
                showToast('Proof uploaded successfully!');
            } catch (err) {
                console.error(err);
                showToast(err.response?.data?.message || 'File upload failed. Payload might be too large.', 'error');
            }
        };
    };

    const handleExportExcel = () => {
        const dataToExport = history.map(item => ({
            'Request ID': item._id,
            'Type': item.odType,
            'Purpose': item.purpose,
            'Start Date': item.startDate,
            'End Date': item.endDate,
            'Days': item.days,
            'Status': item.status,
            'Proof Uploaded': item.proofUploaded ? 'Yes' : 'No',
            'Admin Remarks': item.remarks || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'OD History');
        XLSX.writeFile(wb, `OD_Requests_${user.name.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleViewDetails = (od) => {
        setSelectedOD(od);
        setShowDetailsModal(true);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSubmitting(true);

        // FIX: Use tomorrow's date as the minimum - past dates and today are blocked
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        if (!startDate || startDate < tomorrowStr) {
            showToast('On-Duty requests must be submitted at least one day in advance. Same-day or past applications are not permitted.', 'warning');
            setIsSubmitting(false);
            return;
        }

        if (endDate && endDate < startDate) {
            showToast('End date cannot be before start date.', 'warning');
            setIsSubmitting(false);
            return;
        }

        const form = e.target;
        const payload = {
            type: odType,
            startDate,
            endDate,
            days,
            purpose,
            isFullDay,
            startTime: !isFullDay ? startTime : null,
            endTime: !isFullDay ? endTime : null
        };

        try {
            const res = await apiClient.post('/od-requests', payload);
            if (res.data.success) {
                setHistory([res.data.data, ...history]);
                setShowForm(false);
                setStartDate('');
                setEndDate('');
                setDays(0);
                setPurpose('');
                setIsFullDay(true);
                setOdType('ACADEMIC');
                showToast('OD Request submitted successfully! Pending admin approval.', 'success');

                // Notify Admin
                addNotification({
                    role: 'ADMIN',
                    type: 'info',
                    message: `New OD Request from ${user?.name || 'Faculty'}.`,
                    actionUrl: `/admin/od-requests?request_id=${res.data.data._id}`
                });
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to submit request', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="p-6 space-y-8 pb-20">
            <ToastPortal />
            {/* Quick Metrics - Admin Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total ODs', value: history.length, icon: Calendar, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                    { label: 'Active', value: history.filter(h => h.status === 'APPROVED').length, icon: FileCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Pending', value: history.filter(h => h.status === 'PENDING').length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { label: 'Deployment Days', value: history.reduce((s, h) => s + h.days, 0), icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                ].map((stat, i) => (
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

            {/* History Table - Admin Hub Aesthetic */}
            {!showForm ? (
                <div className="flex justify-between items-center px-2">
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">OD History</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mt-1">Past on-duty requests and their statuses</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={handleExportExcel} variant="outline" className="h-14 px-6 border-white/10 bg-white/5 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic hover:bg-white/10">
                            <Plus className="w-4 h-4 mr-2 rotate-45" /> Export Excel
                        </Button>
                        <Button onClick={() => setShowForm(true)} className="h-14 px-8 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic transition-all">
                            <Plus className="w-4 h-4 mr-2" /> New OD Request
                        </Button>
                    </div>
                </div>
            ) : (
                <Card className="border-0 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden bg-white animate-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">New OD Request</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Submit your On-Duty request details below</CardDescription>
                        </div>
                        <Button variant="ghost" className="text-slate-400 hover:text-maroon-600 font-black text-[10px] uppercase tracking-widest italic" onClick={() => setShowForm(false)}>Cancel</Button>
                    </CardHeader>
                    <CardContent className="p-10">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">OD Type</Label>
                                    <Select value={odType} onValueChange={setOdType}>
                                        <SelectTrigger className="h-14 rounded-2xl border-0 bg-gray-50 font-bold text-slate-800 italic">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-0 shadow-xl rounded-2xl bg-white">
                                            <SelectItem value="ACADEMIC">Academic / General</SelectItem>
                                            <SelectItem value="INTERNATIONAL">International</SelectItem>
                                            <SelectItem value="JOURNAL">Journal / Research</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Date Duration</Label>
                                    <div className="flex flex-col sm:flex-row items-center gap-2">
                                        {/* FIX: min=tomorrow blocks past date + today selection in UI */}
                                        {/* FIX: colorScheme:light makes calendar visible in dark mode */}
                                        <Input
                                            type="date"
                                            value={startDate}
                                            min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            required
                                            className="h-14 bg-gray-50 border-0 rounded-2xl font-bold italic w-full"
                                            style={{ colorScheme: 'light' }}
                                        />
                                        <span className="text-gray-300 font-black italic text-xs uppercase hidden sm:inline">to</span>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            min={startDate || (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            required
                                            className="h-14 bg-gray-50 border-0 rounded-2xl font-bold italic w-full"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Total Days</Label>
                                    <div className="h-14 rounded-2xl bg-indigo-50 flex items-center px-6">
                                        <span className="text-indigo-600 font-black italic text-xl tracking-tighter">{days} DAYS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Time Selection for Single Day OD */}
                            {days === 1 && (
                                <div className="p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 flex flex-col md:flex-row items-center gap-8 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isFullDay ? 'bg-maroon-600 shadow-lg shadow-maroon-600/20' : 'bg-gray-200'}`}>
                                            <input 
                                                type="checkbox" 
                                                id="isFullDay" 
                                                checked={isFullDay}
                                                onChange={(e) => setIsFullDay(e.target.checked)}
                                                className="w-6 h-6 accent-white cursor-pointer opacity-0 absolute"
                                            />
                                            <div 
                                                className={`w-6 h-6 border-2 rounded-md flex items-center justify-center cursor-pointer ${isFullDay ? 'border-white bg-white/20' : 'border-gray-400 bg-white'}`}
                                                onClick={() => setIsFullDay(!isFullDay)}
                                            >
                                                {isFullDay && <FileCheck className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="isFullDay" className="text-sm font-black italic uppercase text-slate-800 cursor-pointer">Full Day OD</Label>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase italic">Check for 8-hour duty</p>
                                        </div>
                                    </div>

                                    {!isFullDay && (
                                        <div className="flex flex-1 items-center gap-6 animate-in slide-in-from-left-4 duration-300">
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic font-bold">Start Time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                                    <Input 
                                                        type="time" 
                                                        value={startTime}
                                                        onChange={(e) => setStartTime(e.target.value)}
                                                        className="h-14 pl-12 bg-white border-0 shadow-sm rounded-2xl font-bold italic"
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-indigo-300 font-black italic mt-6">—</span>
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic font-bold">End Time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                                    <Input 
                                                        type="time" 
                                                        value={endTime}
                                                        onChange={(e) => setEndTime(e.target.value)}
                                                        className="h-14 pl-12 bg-white border-0 shadow-sm rounded-2xl font-bold italic"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Purpose & Justification</Label>
                                <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Describe the purpose of your OD..." className="min-h-[140px] bg-gray-50 border-0 rounded-[2rem] p-6 font-bold text-slate-800 italic" required />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button disabled={isSubmitting} className="h-16 px-12 bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-maroon-600/20 hover:scale-105 transition-all">
                                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* History Table - Admin Hub Aesthetic */}
            <Card className="border border-white/10 bg-slate-800/40 overflow-hidden rounded-[2rem]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-400 font-black italic">
                                <th className="px-8 py-5">Request ID</th>
                                <th className="px-8 py-5">Type</th>
                                <th className="px-8 py-5">Purpose</th>
                                <th className="px-8 py-5">Timeline</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Actions / Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {history.map((item) => (
                                <tr key={item._id} onClick={() => handleViewDetails(item)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                    <td className="px-8 py-6">
                                        <p className="text-[10px] font-black text-gray-400 italic">#{item._id.substring(0, 6)}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[9px] font-black italic uppercase px-3 py-1 rounded-lg">{item.odType}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-xs font-black italic uppercase tracking-tighter text-slate-800 dark:text-white line-clamp-1">{item.purpose}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[10px] font-bold text-slate-500 italic uppercase">{item.startDate} — {item.endDate} <span className="text-maroon-600 ml-1">({item.days}d)</span></p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[10px] font-black italic px-3 py-1 rounded-full uppercase tracking-tighter border ${
                                            item.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 
                                            item.status === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                            'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                        }`}>
                                            {item.status}
                                        </span>
                                        {item.proofStatus === 'VERIFIED' && (
                                            <span className="block mt-1 text-[8px] font-black text-emerald-400 uppercase italic">Document Verified</span>
                                        )}
                                        {item.proofStatus === 'REJECTED' && (
                                            <span className="block mt-1 text-[8px] font-black text-red-400 uppercase italic">Document Rejected</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                                        {item.status === 'REJECTED' && item.remarks && (
                                            <p className="text-xs text-red-400 italic font-bold">Res: {item.remarks}</p>
                                        )}
                                        {item.proofStatus === 'REJECTED' && item.proofRemarks && (
                                            <div className="flex items-center justify-end gap-1 mb-1">
                                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                                <p className="text-[10px] text-red-400 italic font-bold">Proof Rej: {item.proofRemarks}</p>
                                            </div>
                                        )}
                                        {item.status === 'APPROVED' && !item.proofUploaded && (
                                            <div className="flex justify-end">
                                                <input
                                                    type="file"
                                                    id={`faculty-od-proof-${item._id}`}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleProofUpload(item._id, e.target.files[0]);
                                                            // Reset input so same file can be selected again
                                                            e.target.value = null;
                                                        }
                                                    }}
                                                />
                                                <label 
                                                    htmlFor={`faculty-od-proof-${item._id}`}
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-[9px] font-black uppercase tracking-widest italic transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-8 px-3 py-2 cursor-pointer"
                                                >
                                                    Upload Proof <Upload className="w-3 h-3 ml-2" />
                                                </label>
                                            </div>
                                        )}
                                        {item.status === 'APPROVED' && item.proofUploaded && item.proofStatus === 'VERIFIED' && (
                                            <span className="text-emerald-400 text-xs font-black italic uppercase flex items-center justify-end">
                                                <FileCheck className="w-4 h-4 mr-1" /> Verified
                                            </span>
                                        )}
                                        {item.status === 'APPROVED' && item.proofUploaded && item.proofStatus !== 'VERIFIED' && (
                                            <span className="text-amber-400 text-xs font-black italic uppercase flex items-center justify-end">
                                                <Clock className="w-4 h-4 mr-1" /> Verifying...
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Detailed View Modal */}
            {showDetailsModal && selectedOD && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-10 w-full max-w-2xl shadow-2xl mx-auto overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">OD Request Details</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mt-1">Request ID: #{selectedOD._id.substring(0, 12)}</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Type & Status</p>
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 font-black italic uppercase text-[10px]">{selectedOD.odType}</Badge>
                                        <Badge className={`px-3 py-1 font-black italic uppercase text-[10px] border ${
                                            selectedOD.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                            selectedOD.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>{selectedOD.status}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Timeline</p>
                                    <div className="flex items-center gap-2 text-white font-bold italic">
                                        <Calendar className="w-4 h-4 text-rose-500" />
                                        <span>{selectedOD.startDate}</span>
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                        <span>{selectedOD.endDate}</span>
                                    </div>
                                    {!selectedOD.isFullDay && selectedOD.startTime && (
                                        <div className="flex items-center gap-2 text-indigo-400 font-black italic text-[11px] uppercase mt-2">
                                            <Clock className="w-3 h-3" />
                                            <span>{selectedOD.startTime} — {selectedOD.endTime}</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] font-black uppercase text-maroon-500/70 italic mt-1">{selectedOD.days} Total Deployment Days {selectedOD.isFullDay ? '(Full Day)' : ''}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Purpose</p>
                                    <p className="text-sm text-slate-200 font-bold italic leading-relaxed">{selectedOD.purpose}</p>
                                </div>
                                {selectedOD.remarks && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic mb-1">Admin Feedback</p>
                                        <p className="text-sm text-amber-100/70 italic leading-relaxed">{selectedOD.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedOD.proofUploaded && (
                            <div className="mb-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-4">Evidence of Duty</p>
                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group relative">
                                    {selectedOD.proofData?.startsWith('data:image') ? (
                                        <img src={selectedOD.proofData} alt="Duty Proof" className="max-h-80 mx-auto rounded-xl object-contain shadow-2xl" />
                                    ) : (
                                        <div className="flex flex-col items-center py-10">
                                            <FileCheck className="w-16 h-16 text-emerald-500/50 mb-4" />
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic mb-4">Documentary Evidence Encrypted</p>
                                            <a href={selectedOD.proofData} download={`OD_Proof_${selectedOD._id.substring(0,6)}.png`} className="px-8 py-3 bg-rose-700 hover:bg-rose-600 text-white rounded-full text-xs font-black uppercase tracking-widest italic transition-all">
                                                Download Artifact
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button onClick={() => setShowDetailsModal(false)} className="w-full h-16 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic border border-white/10">
                            Close Access
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyODRequest;
