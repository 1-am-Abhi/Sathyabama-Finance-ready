import React, { useState, useEffect } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Calendar, PlusCircle, Sparkles, Building, IndianRupee, MapPin, Users, Briefcase, X, FileText, Clock, Upload, FileCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import useToast from '../../hooks/useToast';

const FacultyEventRequests = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const { showToast, ToastPortal } = useToast();
    const [requests, setRequests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        eventTitle: '',
        eventType: 'Seminar',
        venue: '',
        startDate: '',
        endDate: '',
        participants: '',
        fundingType: 'College Funded',
        fundingSource: '',
        requestedAmount: '',
        isFullDay: true,
        startTime: '09:00',
        endTime: '17:00'
    });

    useEffect(() => {
        setLayout("Event Requests", "Propose and track institutional event logistics and funding");
        fetchRequests();
    }, [setLayout]);

    const fetchRequests = async () => {
        try {
            const response = await apiClient.get('/event-requests');
            setRequests(response.data.data);
        } catch (error) {
            console.error("Failed to fetch events", error);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = requests.map(item => ({
            'Project ID': item._id || item.id,
            'Title': item.eventTitle,
            'Type': item.eventType,
            'Venue': item.venue,
            'Dates': item.dates,
            'Participants': item.participants,
            'Funding': item.fundingType,
            'Source': item.fundingSource,
            'Budget (₹)': item.requestedAmount,
            'Status': item.status,
            'Admin Remarks': item.remarks || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Event Requests');
        XLSX.writeFile(wb, `Event_Requests_${user?.name?.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                dates: `${formData.startDate} to ${formData.endDate}`,
                participants: parseInt(formData.participants) || 0,
                requestedAmount: parseFloat(formData.requestedAmount) || 0,
                isFullDay: formData.isFullDay,
                startTime: !formData.isFullDay ? formData.startTime : null,
                endTime: !formData.isFullDay ? formData.endTime : null
            };
            const response = await apiClient.post('/event-requests', payload);
            
            setRequests([response.data.data, ...requests]);
            setIsModalOpen(false);
            setFormData({
                eventTitle: '', eventType: 'Seminar', venue: '', startDate: '', endDate: '', participants: '', fundingType: 'College Funded', fundingSource: '', requestedAmount: '', isFullDay: true, startTime: '09:00', endTime: '17:00'
            });


            showToast('Event Proposal Submitted Successfully');

            // Notify Admin
            addNotification({
                role: 'ADMIN',
                type: 'info',
                message: `New Event Request: ${payload.eventTitle}`,
                actionUrl: '/admin/event-requests'
            });

            // Notify Self
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Successfully structured event proposal for ${payload.eventTitle}. Awaiting sanction.`,
                targetUserId: user?.id
            });

        } catch (error) {
            console.error("Submission failed", error);
            const errData = error.response?.data;
            let errMsg = errData?.message || error.message;
            if (errData?.errors && Array.isArray(errData.errors)) {
                errMsg = errData.errors.map(e => e.message).join(', ');
            }
            showToast(`Submission Failed: ${errMsg}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotoUpload = async (id, file) => {
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
                await apiClient.put(`/event-requests/${id}/status`, { 
                    photosUploaded: true, 
                    photoData: base64data,
                    status: 'APPROVED' // Keep status same, update photo proof
                }); 
                setRequests(requests.map(item => (item._id || item.id) === id ? { ...item, photosUploaded: true, photoData: base64data } : item));
                
                // Notify Admin
                addNotification({
                    role: 'ADMIN',
                    type: 'info',
                    message: `${user?.name || 'Faculty'} uploaded proof photos for their Event Request.`,
                    actionUrl: `/admin/event-requests?request_id=${id}`
                });
                
                showToast('Proof uploaded successfully!');
            } catch (err) {
                console.error(err);
                showToast(err.response?.data?.message || 'File upload failed. Payload might be too large.', 'error');
            }
        };
    };

    return (
        <div className="p-6 space-y-8 pb-20">
            <ToastPortal />
                <div className="flex items-center gap-3">
                    <Button onClick={handleExportExcel} variant="outline" className="h-14 px-6 border-white/10 bg-white/5 text-slate-800 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest italic hover:bg-white/10">
                        Export Excel
                    </Button>
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-14 px-8 bg-slate-900 dark:bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-slate-900/20 hover:scale-105 transition-all">
                                <PlusCircle className="w-4 h-4 mr-2" /> Structure New Event
                            </Button>
                        </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">Event Execution Proposal</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Event Title</Label>
                                <Input required value={formData.eventTitle} onChange={e => setFormData({...formData, eventTitle: e.target.value})} className="h-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm" placeholder="e.g. International AI Symposium 2026" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Category</Label>
                                    <select value={formData.eventType} onChange={e => setFormData({...formData, eventType: e.target.value})} className="w-full h-14 px-4 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm outline-none dark:text-white">
                                        <option>Seminar</option>
                                        <option>Workshop</option>
                                        <option>Conference</option>
                                        <option>Guest Lecture</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Expected Turnout</Label>
                                    <Input required type="number" value={formData.participants} onChange={e => setFormData({...formData, participants: e.target.value})} className="h-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm" placeholder="0" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Start Date</Label>
                                    <Input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="h-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">End Date</Label>
                                    <Input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="h-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm" />
                                </div>
                            </div>

                            {/* Time Selection for Single Day Event */}
                            {formData.startDate && formData.endDate && formData.startDate === formData.endDate && (
                                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${formData.isFullDay ? 'bg-maroon-600 shadow-lg' : 'bg-gray-200 dark:bg-slate-700'}`}
                                            onClick={() => setFormData({...formData, isFullDay: !formData.isFullDay})}
                                        >
                                            {formData.isFullDay && <Sparkles className="w-5 h-5 text-white" />}
                                        </div>
                                        <div>
                                            <Label className="text-xs font-black italic uppercase text-slate-800 dark:text-white cursor-pointer" onClick={() => setFormData({...formData, isFullDay: !formData.isFullDay})}>Full Day Event</Label>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase italic">Check for 8-hour engagement</p>
                                        </div>
                                    </div>

                                    {!formData.isFullDay && (
                                        <div className="flex items-center gap-4 animate-in slide-in-from-left-4 duration-300">
                                            <div className="flex-1 space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase text-slate-500 italic ml-1">Start Time</Label>
                                                <Input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="h-12 bg-white dark:bg-slate-800 border-0 rounded-xl font-bold italic text-xs" />
                                            </div>
                                            <span className="text-indigo-300 font-black italic mt-5">—</span>
                                            <div className="flex-1 space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase text-slate-500 italic ml-1">End Time</Label>
                                                <Input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="h-12 bg-white dark:bg-slate-800 border-0 rounded-xl font-bold italic text-xs" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Target Venue</Label>
                                <Input required value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="h-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm" placeholder="e.g. Main Auditorium" />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Funding Framework</Label>
                                    <select value={formData.fundingType} onChange={e => setFormData({...formData, fundingType: e.target.value})} className="w-full h-14 px-4 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm outline-none dark:text-white">
                                        <option>College Funded</option>
                                        <option>Industry Funded</option>
                                        <option>Self Funded</option>
                                        <option>Other's Fund</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Sponsor / Source</Label>
                                    <Input value={formData.fundingSource} onChange={e => setFormData({...formData, fundingSource: e.target.value})} className="h-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm" placeholder="e.g. Sathyabama Management" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Requested Viability Budget (₹)</Label>
                                <Input required type="number" value={formData.requestedAmount} onChange={e => setFormData({...formData, requestedAmount: e.target.value})} className="h-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-bold italic text-sm" placeholder="0.00" />
                            </div>

                            <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-maroon-600/20 hover:scale-[1.02] transition-all mt-4">
                                {isSubmitting ? 'Transmitting...' : 'Transmit Protocol'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-500 font-black italic">
                                <th className="px-8 py-5">Event Structure</th>
                                <th className="px-8 py-5">Logistics</th>
                                <th className="px-8 py-5">Financial Target</th>
                                <th className="px-8 py-5 text-right">Sanction Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {requests.map(req => (
                                <tr key={req._id || req.id} onClick={() => { setSelectedRequest(req); setShowDetailsModal(true); }} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm italic dark:text-white line-clamp-1">{req.eventTitle}</p>
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mt-0.5">{req.eventType}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{req.venue}</p>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mt-0.5">{req.dates} • {req.participants} PAX</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-1 mb-1">
                                            <p className="font-bold text-sm italic text-maroon-600 line-clamp-1">
                                                ₹{parseInt(req.status === 'APPROVED' ? (req.approvedAmount || req.requestedAmount) : req.requestedAmount || 0).toLocaleString()}
                                            </p>
                                            {req.status === 'APPROVED' && req.approvedAmount !== req.requestedAmount && (
                                                <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[8px] h-4">Sanctioned</Badge>
                                            )}
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{req.fundingType}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <Badge variant="outline" className={`border-0 text-[10px] font-black italic uppercase tracking-widest px-4 py-1.5 shadow-sm mb-2 inline-block
                                            ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                              req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                              'bg-amber-100 text-amber-700'}`}>
                                            {req.status}
                                        </Badge>
                                        
                                        {/* Upload Evidence action for Approved non-uploaded requests */}
                                        {req.status === 'APPROVED' && !req.photosUploaded && (
                                            <div className="flex justify-end mt-1" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="file"
                                                    id={`faculty-evt-proof-${req._id || req.id}`}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handlePhotoUpload(req._id || req.id, e.target.files[0]);
                                                            e.target.value = null;
                                                        }
                                                    }}
                                                />
                                                <label 
                                                    htmlFor={`faculty-evt-proof-${req._id || req.id}`}
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-[9px] font-black uppercase tracking-widest italic transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-8 px-3 py-2 cursor-pointer"
                                                >
                                                    Upload Image <Upload className="w-3 h-3 ml-2" />
                                                </label>
                                            </div>
                                        )}
                                        {req.status === 'APPROVED' && req.photosUploaded && (
                                            <span className="text-emerald-500 text-[10px] font-black italic uppercase flex items-center justify-end mt-1">
                                                <FileCheck className="w-3 h-3 mr-1" /> Documented
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-8 py-20 text-center opacity-40">
                                        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="font-black italic text-xs uppercase tracking-widest dark:text-gray-400">No events deployed in current sector</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Detailed View Modal */}
            {showDetailsModal && selectedRequest && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-10 w-full max-w-2xl shadow-2xl mx-auto overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Event Analysis</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mt-1">Proposal ID: #{ (selectedRequest._id || selectedRequest.id).substring(0, 12) }</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Title & Category</p>
                                    <p className="text-sm text-white font-bold italic mb-2 uppercase">{selectedRequest.eventTitle}</p>
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 font-black italic uppercase text-[10px]">{selectedRequest.eventType}</Badge>
                                        <Badge className={`px-3 py-1 font-black italic uppercase text-[10px] border ${
                                            selectedRequest.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                            selectedRequest.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>{selectedRequest.status}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Target Logistics</p>
                                    <div className="flex items-center gap-2 text-white font-bold italic mt-2">
                                        <MapPin className="w-4 h-4 text-rose-500" />
                                        <span className="text-xs uppercase">{selectedRequest.venue}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white font-bold italic mt-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs uppercase">{selectedRequest.participants} Expected Delegates</span>
                                    </div>
                                    {!selectedRequest.isFullDay && selectedRequest.startTime && (
                                        <div className="flex items-center gap-2 text-indigo-400 font-black italic text-[11px] uppercase mt-2">
                                            <Clock className="w-3 h-3" />
                                            <span>{selectedRequest.startTime} — {selectedRequest.endTime}</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] font-black uppercase text-maroon-500/70 italic mt-2 tracking-widest">Schedule: {selectedRequest.dates} {selectedRequest.isFullDay ? '(Full Day)' : ''}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Financial Framework</p>
                                    <p className="text-2xl font-black italic text-maroon-500 tracking-tighter">₹{parseInt(selectedRequest.requestedAmount || 0).toLocaleString()}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Briefcase className="w-4 h-4 text-emerald-500" />
                                        <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">{selectedRequest.fundingType} ({selectedRequest.fundingSource})</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl mb-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic mb-2 flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Research Team
                                    </p>
                                    <div className="space-y-2">
                                        {selectedRequest.members && selectedRequest.members.length > 0 ? (
                                            selectedRequest.members.map((member, idx) => (
                                                <div key={idx} className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-white font-bold">{member.user?.name || 'Unknown Faculty'}</span>
                                                        <span className="text-[9px] text-slate-500 uppercase">{member.user?.centre}</span>
                                                    </div>
                                                    <Badge className={`text-[8px] font-black uppercase tracking-widest ${member.role === 'PI' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                        {member.role || 'Member'}
                                                    </Badge>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-white font-bold">{selectedRequest.facultyName}</span>
                                                <Badge className="text-[8px] bg-blue-600 text-white uppercase italic">Lead Faculty</Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {selectedRequest.remarks && (
                                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic mb-1 italic">Administrative Decision Context</p>
                                        <p className="text-sm text-amber-100/70 italic leading-relaxed">{selectedRequest.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedRequest.photosUploaded && (
                            <div className="mb-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-4">Event Documentary Evidence</p>
                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group relative">
                                    {selectedRequest.photoData?.startsWith('data:image') ? (
                                        <img src={selectedRequest.photoData} alt="Event Proof" className="max-h-80 mx-auto rounded-xl object-contain shadow-2xl" />
                                    ) : (
                                        <div className="flex flex-col items-center py-10">
                                            <FileCheck className="w-16 h-16 text-emerald-500/50 mb-4" />
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic mb-4">Documentary Evidence Encrypted</p>
                                            {selectedRequest.photoData && (
                                                <a href={selectedRequest.photoData} download={`Event_Proof_${(selectedRequest._id || selectedRequest.id).substring(0,6)}.png`} className="px-8 py-3 bg-rose-700 hover:bg-rose-600 text-white rounded-full text-xs font-black uppercase tracking-widest italic transition-all">
                                                    Download Artifact
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button onClick={() => setShowDetailsModal(false)} className="w-full h-16 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic border border-white/10 mt-4">
                            Terminate View
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyEventRequests;
