import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { CheckCircle, XCircle, Clock, Search, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, Sparkles, Download, RefreshCw, AlertTriangle, FileSpreadsheet, Upload, User, Building, CalendarDays, FileText, Brain } from 'lucide-react';
import AIResultModal from '../../components/shared/AIResultModal';
import { summarizeRequest } from '../../services/aiService';
import { useNotifications } from '../../contexts/NotificationContext';
import apiClient from '../../api/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO, isPast, addHours, differenceInHours } from 'date-fns';
import * as XLSX from 'xlsx';
import useToast from '../../hooks/useToast';

const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const CALENDAR_ID = 'en.indian#holiday@group.v.calendar.google.com';

const ODCalendar = ({ requests, holidays, onDateClick, selectedDate, onRequestClick }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const getDayEvents = (date) => {
        const dayRequests = requests.filter(req => {
            if (!req.dates.includes('to')) {
                return isSameDay(parseISO(req.dates), date);
            }
            const [start, end] = req.dates.split(' to ');
            return isWithinInterval(date, { start: parseISO(start), end: parseISO(end) });
        });

        const dayHolidays = holidays.filter(h => isSameDay(parseISO(h.date), date));

        return [
            ...dayHolidays.map(h => ({ ...h, type: 'HOLIDAY' })),
            ...dayRequests.map(r => ({ ...r, type: 'REQUEST' }))
        ];
    };

    return (
        <Card className="mt-6 dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="dark:text-white">OD Calendar</CardTitle>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="font-semibold w-32 text-center dark:text-white">{format(currentMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day}>{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, dayIdx) => {
                        const events = getDayEvents(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => onDateClick(day)}
                                className={`
                                    min-h-[6rem] p-1 border rounded-md text-left text-xs relative overflow-hidden group transition-all cursor-pointer
                                    ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-md transform scale-[1.02] z-10' : ''}
                                    ${!isSameMonth(day, currentMonth)
                                        ? 'bg-gray-50 text-gray-400 dark:bg-slate-900/50 dark:text-slate-600 dark:border-slate-800'
                                        : 'bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700'}
                                `}
                            >
                                <span className={`font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : ''}`}>{format(day, 'd')}</span>
                                <div className="mt-1 space-y-1 overflow-y-auto max-h-20 scrollbar-hide">
                                    {events.map((event, idx) => (
                                        <TooltipProvider key={idx}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        onClick={(e) => {
                                                            if (event.type === 'REQUEST') {
                                                                e.stopPropagation();
                                                                onRequestClick(event);
                                                            }
                                                        }}
                                                        className={`
                                                            px-1 py-0.5 rounded truncate text-[10px] cursor-pointer flex items-center gap-1
                                                            ${event.type === 'HOLIDAY'
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                                                : event.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:text-green-300 dark:bg-green-900'
                                                                    : event.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:text-red-300 dark:bg-red-900'
                                                                        : event.status === 'CANCELLED' ? 'bg-slate-200 text-slate-800 dark:text-slate-300 dark:bg-slate-800'
                                                                            : 'bg-amber-100 text-amber-800 dark:text-amber-300 dark:bg-amber-900'}
                                                            ${event.type === 'REQUEST' ? 'hover:ring-1 hover:ring-offset-1 hover:ring-current cursor-pointer' : ''}
                                                        `}
                                                    >
                                                        {event.type === 'HOLIDAY' ? <Sparkles className="w-2 h-2" /> : null}
                                                        {event.type === 'HOLIDAY' ? event.name : event.faculty}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="z-50">
                                                    {event.type === 'HOLIDAY' ? (
                                                        <p className="font-semibold text-purple-600 dark:text-purple-400">Public Holiday: {event.name}</p>
                                                    ) : (
                                                        <>
                                                            <p className="font-semibold">{event.faculty}</p>
                                                            <p className="text-xs">{event.purpose}</p>
                                                            <p className="text-xs italic">{event.department}</p>
                                                            <p className="text-xs font-mono mt-1">{event.status}</p>
                                                            <p className="text-[10px] opacity-75">(Click for details)</p>
                                                        </>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

const ODRequests = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const location = useLocation();
    const { showToast, ToastPortal } = useToast();
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectRemarks, setRejectRemarks] = useState('');
    const [calDateFilter, setCalDateFilter] = useState(null);
    const [holidays, setHolidays] = useState([]);
    const [uploadFile, setUploadFile] = useState(null);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });
    const [proofRejectModalOpen, setProofRejectModalOpen] = useState(false);
    const [proofRemarks, setProofRemarks] = useState('');
    // Filter State
    const [filterOpen, setFilterOpen] = useState(false);
    const [centreFilter, setCentreFilter] = useState('All');


    const [requests, setRequests] = useState([]);
    const uniqueResearchCentres = ['All', ...new Set(requests.map(r => r.researchCentre))];

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await apiClient.get('/od-requests');
                const mappedRequests = response.data.data.map(req => ({
                    ...req,
                    id: req._id,
                    faculty: req.facultyName,
                    researchCentre: req.department,
                    purpose: req.purpose,
                    dates: req.startDate === req.endDate ? req.startDate : `${req.startDate} to ${req.endDate}`,
                    status: req.status,
                    photosUploaded: req.proofUploaded,
                    proofStatus: req.proofStatus,
                    proofRemarks: req.proofRemarks,
                    remarks: req.remarks
                }));
                setRequests(mappedRequests);
                
                const queryParams = new URLSearchParams(location.search);
                const reqId = queryParams.get('request_id');
                if (reqId) {
                    const found = mappedRequests.find(r => String(r.id) === String(reqId));
                    if (found) {
                        setSelectedRequest(found);
                        setDetailsModalOpen(true);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch ODs", err);
            }
        };
        fetchRequests();
    }, [location.search]);



    useEffect(() => {
        setLayout("OD Requests", "Manage faculty on-duty requests");

        // Fetch Google Calendar Holidays
        const fetchHolidays = async () => {
            try {
                const year = new Date().getFullYear();
                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z&singleEvents=true`);
                if (response.ok) {
                    const data = await response.json();
                    const formattedHolidays = data.items.map(item => ({
                        name: item.summary,
                        date: item.start.date || item.start.dateTime.split('T')[0]
                    }));
                    setHolidays(formattedHolidays);
                } else {
                    console.error("Failed to fetch holidays", response.statusText);
                    setHolidays([
                        { name: 'New Year', date: '2026-01-01' },
                        { name: 'Pongal', date: '2026-01-15' },
                        { name: 'Republic Day', date: '2026-01-26' },
                        { name: 'Good Friday', date: '2026-03-29' },
                    ]);
                }
            } catch (error) {
                console.error("Error fetching holidays:", error);
            }
        };

        fetchHolidays();
    }, [setLayout]);

    const handleStatusClick = (status) => {
        setSelectedStatus(status === selectedStatus ? 'All' : status);
        setCalDateFilter(null); // Clear date filter when clicking status
    };

    const handleDateClick = (date) => {
        setCalDateFilter(isSameDay(date, calDateFilter) ? null : date);
        setSelectedStatus('All'); // Clear status filter when clicking date
    };

    const handleApprove = async (id) => {
        try {
            await apiClient.put(`/od-requests/${id}/status`, { status: 'APPROVED' });
            setRequests(requests.map(req => req.id === id ? { ...req, status: 'APPROVED' } : req));
            
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Your OD Request was APPROVED.`,
                actionUrl: `/faculty/od-request`,
                targetUserId: requests.find(r => r.id === id)?.facultyId
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleRejectClick = (request, e) => {
        e.stopPropagation();
        setSelectedRequest(request);
        setRejectModalOpen(true);
    };

    const handleRevokeClick = (request, e) => {
        e.stopPropagation();
        setSelectedRequest(request);
        setRevokeModalOpen(true);
    };

    const handleConfirmRevoke = async () => {
        if (selectedRequest) {
            const hasPhoto = !!uploadFile || selectedRequest.photosUploaded;
            try {
                let base64data = selectedRequest.proofData; // Default to existing if any
                
                // Convert new file to base64 if it exists
                if (uploadFile) {
                    base64data = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(uploadFile);
                        reader.onloadend = () => resolve(reader.result);
                    });
                }
                
                await apiClient.put(`/od-requests/${selectedRequest.id}/status`, { 
                    status: 'APPROVED', 
                    proofUploaded: hasPhoto,
                    proofData: base64data
                });
                
                setRequests(requests.map(req => req.id === selectedRequest.id ? {
                    ...req,
                    status: 'APPROVED',
                    remarks: 'Revoked by Admin',
                    photosUploaded: hasPhoto,
                    proofData: base64data
                } : req));
                setRevokeModalOpen(false);
                setUploadFile(null);
                
                addNotification({
                    role: 'FACULTY',
                    type: 'success',
                    message: `Your OD Request has been REVOKED and APPROVED by the Admin.`,
                    actionUrl: `/faculty/od-request`,
                    targetUserId: selectedRequest?.facultyId
                });
                
                setSelectedRequest(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleViewPhotos = (request, e) => {
        e.stopPropagation();
        setSelectedRequest(request);
        setPhotoModalOpen(true);
    };

    const handleConfirmReject = async () => {
        if (selectedRequest) {
            try {
                await apiClient.put(`/od-requests/${selectedRequest.id}/status`, { status: 'REJECTED', remarks: rejectRemarks });
                setRequests(requests.map(req => req.id === selectedRequest.id ? { ...req, status: 'REJECTED', remarks: rejectRemarks } : req));
                setRejectModalOpen(false);
                
                addNotification({
                    role: 'FACULTY',
                    type: 'rejection',
                    message: `Your OD Request was REJECTED: ${rejectRemarks}`,
                    actionUrl: `/faculty/od-request`,
                    targetUserId: selectedRequest?.facultyId
                });
                
                setRejectRemarks('');
                setSelectedRequest(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleVerifyProof = async (id) => {
        try {
            await apiClient.put(`/od-requests/${id}/status`, { proofStatus: 'VERIFIED' });
            setRequests(requests.map(req => req.id === id ? { ...req, proofStatus: 'VERIFIED' } : req));
            if (selectedRequest?.id === id) {
                setSelectedRequest({ ...selectedRequest, proofStatus: 'VERIFIED' });
            }
            showToast('Proof Verified successfully!');
            
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Your uploaded proof for OD Request was VERIFIED.`,
                actionUrl: `/faculty/od-request`,
                targetUserId: requests.find(r => r.id === id)?.facultyId
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleRejectProof = async () => {
        if (!selectedRequest) return;
        try {
            await apiClient.put(`/od-requests/${selectedRequest.id}/status`, { 
                proofStatus: 'REJECTED', 
                proofRemarks,
                proofUploaded: false 
            });
            setRequests(requests.map(req => req.id === selectedRequest.id ? { 
                ...req, 
                proofStatus: 'REJECTED', 
                proofRemarks, 
                proofUploaded: false 
            } : req));
            setProofRejectModalOpen(false);
            setPhotoModalOpen(false);
            showToast('Proof Rejected. Faculty can re-upload.', 'warning');
            
            addNotification({
                role: 'FACULTY',
                type: 'rejection',
                message: `Your OD Proof was REJECTED: ${proofRemarks}. Please re-upload.`,
                actionUrl: `/faculty/od-request`,
                targetUserId: selectedRequest?.facultyId
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleRequestDetails = (request) => {
        setSelectedRequest(request);
        setDetailsModalOpen(true);
    };

    const handleExport = () => {
        const dataToExport = filteredRequests.map(req => ({
            'ID': req._id,
            'Faculty Name': req.facultyName,
            'Department': req.department,
            'OD Type': req.odType,
            'Purpose': req.purpose,
            'Start Date': req.startDate,
            'End Date': req.endDate,
            'Days': req.days,
            'Status': req.status,
            'Proof Uploaded': req.proofUploaded ? 'Yes' : 'No',
            'Admin Remarks': req.remarks || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'OD Requests');
        
        // Auto-size columns
        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String(row[key]).length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `OD_Requests_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const filteredRequests = requests.filter(req => {
        const matchesStatus = selectedStatus === 'All' || req.status === selectedStatus;
        const matchesSearch = req.faculty.toLowerCase().includes(searchTerm.toLowerCase()) || req.purpose.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCentre = centreFilter === 'All' || req.researchCentre === centreFilter;

        // Date Filter Logic
        let matchesDate = true;
        if (calDateFilter) {
            if (req.dates.includes('to')) {
                const [start, end] = req.dates.split(' to ');
                matchesDate = isWithinInterval(calDateFilter, { start: parseISO(start), end: parseISO(end) });
            } else {
                matchesDate = isSameDay(parseISO(req.dates), calDateFilter);
            }
        }

        return matchesStatus && matchesSearch && matchesCentre && matchesDate;
    });

    const counts = {
        PENDING: requests.filter(r => r.status === 'PENDING').length,
        APPROVED: requests.filter(r => r.status === 'APPROVED').length,
        REJECTED: requests.filter(r => r.status === 'REJECTED').length,
        CANCELLED: requests.filter(r => r.status === 'CANCELLED').length,
    };

    return (
        <div className="p-6 space-y-6">
            <ToastPortal />
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(status => {
                    const colorMap = {
                        PENDING: 'amber',
                        APPROVED: 'emerald',
                        REJECTED: 'red',
                        CANCELLED: 'slate'
                    };
                    const color = colorMap[status];
                    const Icon = status === 'PENDING' ? Clock : status === 'APPROVED' ? CheckCircle : status === 'REJECTED' ? XCircle : AlertTriangle;

                    return (
                        <Card
                            key={status}
                            className={`cursor-pointer transition-all hover:scale-105 ${selectedStatus === status ? `ring-2 ring-${color}-500` : ''}`}
                            onClick={() => handleStatusClick(status)}
                        >
                            <CardContent className={`p-6 flex items-center justify-between ${status === 'CANCELLED' ? 'bg-slate-100 dark:bg-slate-800' : `bg-${color}-50 dark:bg-${color}-900/10`} text-${color}-700 dark:text-${color}-400`}>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">{status.charAt(0) + status.slice(1).toLowerCase()}</p>
                                    <p className="text-3xl font-bold mt-2">{counts[status]}</p>
                                </div>
                                <Icon className="w-8 h-8 opacity-80" />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm">
                <div className="relative w-full md:w-96 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search faculty or purpose..."
                            className="w-full pl-10 pr-4 py-2 text-sm border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end w-full md:w-auto">
                    {calDateFilter && (
                        <Button variant="ghost" size="sm" onClick={() => setCalDateFilter(null)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            Clear Date: {format(calDateFilter, 'MMM d')} <XCircle className="w-4 h-4 ml-1" />
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={handleExport}>
                        <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Excel
                    </Button>

                    {/* Department Filter Dropdown */}
                    <div className="relative">
                        <Button
                            variant={centreFilter === 'All' ? "outline" : "secondary"}
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => setFilterOpen(!filterOpen)}
                        >
                            <Filter className="w-4 h-4" /> {centreFilter === 'All' ? 'Research Centres' : centreFilter}
                        </Button>
                        {filterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-50 py-1">
                                {uniqueResearchCentres.map(centre =>
                                    <div
                                        key={centre}
                                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 ${centreFilter === centre ? 'font-bold text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}
                                        onClick={() => { setCentreFilter(centre); setFilterOpen(false); }}
                                    >
                                        {centre}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Request Table */}
            <div className="bg-white dark:bg-slate-900 shadow-sm rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Faculty</th>
                                <th className="px-6 py-3">Research Centre</th>
                                <th className="px-6 py-3">Purpose</th>
                                <th className="px-6 py-3">Dates</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Photos</th>
                                <th className="px-6 py-3 text-right min-w-[280px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                                <tr
                                    key={req.id}
                                    onClick={() => handleRequestDetails(req)}
                                    className="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium dark:text-white">{req.faculty}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{req.researchCentre}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{req.purpose}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{req.dates}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={
                                            req.status === 'APPROVED' ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-900/20' :
                                                req.status === 'REJECTED' ? 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-900/20' :
                                                    req.status === 'CANCELLED' ? 'text-slate-600 border-slate-300 bg-slate-100 font-medium dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800' :
                                                        'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-900/20'
                                        }>
                                            {req.status}
                                        </Badge>
                                        {req.remarks && <p className="text-[10px] text-red-500 mt-1 max-w-[100px] truncate" title={req.remarks}>{req.remarks}</p>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.photosUploaded ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-900/20">Uploaded</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-900/20">Pending</Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="actions-cell justify-end">
                                            {req.status === 'PENDING' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 action-btn"
                                                        onClick={(e) => handleRejectClick(req, e)}
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs action-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleApprove(req.id); }}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-indigo-400 hover:bg-indigo-500/10 text-[10px] h-7 font-black action-btn"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setAiModal({ open: true, loading: true, result: null });
                                                            const r = await summarizeRequest(req);
                                                            setAiModal({ open: true, loading: false, result: r });
                                                        }}
                                                    >
                                                        <Brain className="w-3 h-3 mr-1" /> AI Summary
                                                    </Button>
                                                </>
                                            )}
                                            {req.status === 'APPROVED' && !req.photosUploaded && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 action-btn"
                                                    onClick={(e) => handleRevokeClick(req, e)}
                                                >
                                                    Revoke
                                                </Button>
                                            )}
                                            {(req.status === 'CANCELLED' || req.status === 'REJECTED') && (
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white border-0 shadow-sm action-btn"
                                                    onClick={(e) => handleRevokeClick(req, e)}
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Revoke
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No requests found for this filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Calendar View */}
            <ODCalendar requests={requests} holidays={holidays} onDateClick={handleDateClick} selectedDate={calDateFilter} onRequestClick={handleRequestDetails} />

            {/* Reject Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="remarks">Reason for Rejection</Label>
                        <Textarea
                            id="remarks"
                            placeholder="Enter remarks..."
                            className="mt-2"
                            value={rejectRemarks}
                            onChange={(e) => setRejectRemarks(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleConfirmReject} disabled={!rejectRemarks.trim()}>Confirm Reject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke Modal - Updated with Photo Upload */}
            <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revoke & Approve</DialogTitle>
                        <DialogDescription>
                            Confirming this action will revert the status to <strong>APPROVED</strong>.
                            {!selectedRequest?.photosUploaded && " You can optionally upload photos now."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {!selectedRequest?.photosUploaded && (
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="picture">Upload Photo Evidence (Optional)</Label>
                                <Input id="picture" type="file" onChange={(e) => setUploadFile(e.target.files[0])} />
                            </div>
                        )}
                        <div className={`p-3 rounded-md text-sm border ${selectedRequest?.status === 'CANCELLED' ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' :
                            selectedRequest?.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' :
                                'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                            }`}>
                            <p>Current Status: <strong>{selectedRequest?.status}</strong></p>
                            <p>Faculty: {selectedRequest?.faculty}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRevokeModalOpen(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmRevoke}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Confirm Revoke
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Photo Viewer Modal */}
            <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Event Photos - {selectedRequest?.faculty}</DialogTitle>
                        <DialogDescription>{selectedRequest?.purpose} | {selectedRequest?.dates}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {selectedRequest?.photosUploaded ? (
                            <div className="flex flex-col gap-4">
                                {typeof selectedRequest.proofData === 'string' && selectedRequest.proofData.trim().length > 20 ? (
                                    <div className="w-full relative group">
                                        <div className="bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border dark:border-slate-700 overflow-hidden w-full h-[60vh]">
                                            {selectedRequest.proofData.startsWith('data:application/pdf') ? (
                                                <iframe src={selectedRequest.proofData} title="Document Proof" className="w-full h-full" />
                                            ) : (
                                                <img src={selectedRequest.proofData} alt="Proof" className="w-full h-full object-contain" />
                                            )}
                                        </div>
                                        <div className="mt-4 flex gap-3 justify-center">
                                            <a download={`evidence_${selectedRequest.id}${selectedRequest.proofData.startsWith('data:application/pdf') ? '.pdf' : '.png'}`} href={selectedRequest.proofData} className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold bg-maroon-600 text-white rounded-xl shadow-lg hover:bg-maroon-700 transition">
                                                <Download className="w-4 h-4 mr-2" /> Download Evidence
                                            </a>
                                            <Button variant="outline" onClick={() => {
                                                const newWindow = window.open();
                                                if (selectedRequest.proofData.startsWith('data:application/pdf')) {
                                                    newWindow.document.write(`<iframe src="${selectedRequest.proofData}" style="width: 100vw; height: 100vh; border: none; margin: 0; padding: 0;"></iframe>`);
                                                } else {
                                                    newWindow.document.write(`<img src="${selectedRequest.proofData}" style="max-width: 100%; display: block; margin: 0 auto;"/>`);
                                                }
                                            }}>
                                                <Eye className="w-4 h-4 mr-2" /> Open Full Screen
                                            </Button>

                                            {selectedRequest.proofStatus !== 'VERIFIED' && (
                                                <div className="flex gap-2 ml-4 border-l pl-4">
                                                    <Button variant="destructive" onClick={() => setProofRejectModalOpen(true)}>Reject Proof</Button>
                                                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleVerifyProof(selectedRequest.id)}>Verify Proof</Button>
                                                </div>
                                            )}
                                            {selectedRequest.proofStatus === 'VERIFIED' && (
                                                <Badge className="bg-green-50 text-green-700 border-green-200">Verified Securely</Badge>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center bg-red-50 dark:bg-red-900/10 rounded-xl flex flex-col items-center justify-center border border-red-200 dark:border-red-800">
                                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                                        <p className="text-red-700 dark:text-red-400 font-bold text-lg mb-2">Image Corrupted or Missing</p>
                                        <p className="text-sm text-red-600 dark:text-red-500 max-w-md px-6">
                                            The actual image data was not found in the database. Please request the faculty to upload it again or revoke this request.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-lg dark:border-slate-700">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                <p>No photos uploaded yet for this event.</p>
                                <Button variant="outline" className="mt-4" disabled>Remind Faculty</Button>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setPhotoModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Request Details Modal - New */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>OD Request Details</DialogTitle>
                        <DialogDescription>Full information for this request.</DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">
                                    {selectedRequest.faculty.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg leading-none">{selectedRequest.faculty}</h4>
                                    <p className="text-sm text-gray-500">{selectedRequest.department}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div className="space-y-1">
                                    <p className="text-gray-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Dates</p>
                                    <p className="font-medium">{selectedRequest.dates}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Purpose</p>
                                    <p className="font-medium">{selectedRequest.purpose}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500">Status</p>
                                    <Badge variant={
                                        selectedRequest.status === 'APPROVED' ? 'success' :
                                            selectedRequest.status === 'REJECTED' ? 'destructive' :
                                                'secondary'
                                    }>
                                        {selectedRequest.status}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500">Evidence</p>
                                    <Badge variant="outline" className={selectedRequest.photosUploaded ? "text-green-600 border-green-200" : "text-amber-600 border-amber-200"}>
                                        {selectedRequest.photosUploaded ? 'Photos Uploaded' : 'Pending'}
                                    </Badge>
                                </div>
                            </div>

                            {selectedRequest.remarks && (
                                <div className="bg-red-50 p-3 rounded-md border border-red-100 mt-2">
                                    <p className="text-xs text-red-600 font-semibold">Remarks:</p>
                                    <p className="text-sm text-red-700">{selectedRequest.remarks}</p>
                                </div>
                            )}

                            {selectedRequest.photosUploaded && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium mb-2">Uploaded Evidence</p>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-24 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all" onClick={() => setPhotoModalOpen(true)}>
                                            {selectedRequest.proofData ? (
                                                selectedRequest.proofData.startsWith('data:application/pdf') ? (
                                                    <div className="text-[10px] font-bold text-gray-400">PDF</div>
                                                ) : (
                                                    <img src={selectedRequest.proofData} alt="Proof Thumbnail" className="w-full h-full object-cover" />
                                                )
                                            ) : (
                                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        
                                        {selectedRequest.proofStatus !== 'VERIFIED' && (
                                            <div className="flex flex-col gap-2 w-full">
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="destructive" className="w-full" onClick={() => setProofRejectModalOpen(true)}>Reject Proof</Button>
                                                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleVerifyProof(selectedRequest.id)}>Verify Proof</Button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 italic">Faculty will be asked to re-upload if rejected.</p>
                                            </div>
                                        )}
                                        {selectedRequest.proofStatus === 'VERIFIED' && (
                                            <Badge className="bg-green-50 text-green-700 border-green-200 py-1.5 px-3">Proof Verified</Badge>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {selectedRequest?.status === 'PENDING' && (
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => { handleApprove(selectedRequest.id); setDetailsModalOpen(false); }}>Approve Request</Button>
                        )}
                        {(selectedRequest?.status === 'APPROVED' || selectedRequest?.status === 'REJECTED' || selectedRequest?.status === 'CANCELLED') && (
                            <Button
                                variant="outline"
                                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                onClick={(e) => { handleRevokeClick(selectedRequest, e); setDetailsModalOpen(false); }}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Revoke & Revert to Approved
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* AI Result Modal */}
            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />

            {/* Proof Reject Modal */}
            <Dialog open={proofRejectModalOpen} onOpenChange={setProofRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Documentary Evidence</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="proofRemarks">Reason for Document Rejection</Label>
                        <Textarea
                            id="proofRemarks"
                            placeholder="e.g. Image blurry, incorrect document..."
                            className="mt-2"
                            value={proofRemarks}
                            onChange={(e) => setProofRemarks(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProofRejectModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRejectProof} disabled={!proofRemarks.trim()}>Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ODRequests;
