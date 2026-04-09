import React, { useState, useEffect } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { CheckCircle, XCircle, Clock, Search, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, Sparkles, Download, RefreshCw, AlertTriangle, FileSpreadsheet, Upload, User, Building, CalendarDays, FileText, MapPin, Users, IndianRupee, Briefcase, Brain } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO, isPast, addHours, differenceInHours } from 'date-fns';
import AIResultModal from '../../components/shared/AIResultModal';
import { analyzeEventFeasibility } from '../../services/aiService';
import apiClient from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const CALENDAR_ID = 'en.indian#holiday@group.v.calendar.google.com';

const EventCalendar = ({ requests, holidays, onDateClick, selectedDate, onRequestClick }) => {
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
                <CardTitle className="dark:text-white">Event Calendar</CardTitle>
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
                                                        {event.type === 'HOLIDAY' ? event.name : event.eventTitle}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="z-50">
                                                    {event.type === 'HOLIDAY' ? (
                                                        <p className="font-semibold text-purple-600 dark:text-purple-400">Public Holiday: {event.name}</p>
                                                    ) : (
                                                        <>
                                                            <p className="font-semibold">{event.eventTitle}</p>
                                                            <p className="text-xs">{event.eventType}</p>
                                                            <p className="text-xs italic">{event.venue}</p>
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

const EventRequests = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const navigate = useNavigate();
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });
    const [rejectRemarks, setRejectRemarks] = useState('');
    const [approvalAmount, setApprovalAmount] = useState('');
    const [calDateFilter, setCalDateFilter] = useState(null);
    const [faculties, setFaculties] = useState([]);
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [selectedFacultyIds, setSelectedFacultyIds] = useState([]);
    const [selectedPiId, setSelectedPiId] = useState(null);
    const [holidays, setHolidays] = useState([]);
    const [uploadFile, setUploadFile] = useState(null);

    // Filter State
    const [filterOpen, setFilterOpen] = useState(false);
    const [centreFilter, setCentreFilter] = useState('All');

    const [requests, setRequests] = useState([]);

    const uniqueResearchCentres = ['All', ...new Set(requests.map(r => r.researchCentre))];

    useEffect(() => {
        setLayout("Event Requests", "Manage institutional event requests");

        const fetchData = async () => {
            try {
                const [reqsRes, usersRes] = await Promise.all([
                    apiClient.get('/event-requests'),
                    apiClient.get('/auth/users')
                ]);
                
                if (reqsRes.data.success) {
                    const formattedRequests = reqsRes.data.data.map(req => ({
                        ...req,
                        id: req._id,
                        faculty: req.facultyName
                    }));
                    setRequests(formattedRequests);
                }
                if (usersRes.data.success) {
                    setFaculties(usersRes.data.users);
                }
            } catch (err) {
                console.error("Failed to fetch data:", err);
            }
        };
        fetchData();

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
                    // Fallback holidays
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
        const newDateFilter = (calDateFilter && isSameDay(date, calDateFilter)) ? null : date;
        setCalDateFilter(newDateFilter);
        setSelectedStatus('All'); // Clear status filter when clicking date
        // Prevent scroll to top by not changing the filter if it's the same date
    };

    const handleApproveClick = async (request, e) => {
        e.stopPropagation();
        setSelectedRequest(request);
        // For college-funded events, open approval modal to set amount
        if (request.fundingType === 'College Funded') {
            setApprovalAmount(request.approvedAmount?.toString() || '');
            setApproveModalOpen(true);
        } else {
            try {
                const response = await apiClient.put(`/event-requests/${request.id}/status`, { status: 'APPROVED' });
                setRequests(requests.map(req =>
                    req.id === request.id
                        ? { ...req, status: 'APPROVED' }
                        : req
                ));
                if (response.data?.pipeline?.redirectTo) {
                    navigate('/admin/event-requests');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleConfirmApprove = async () => {
        if (selectedRequest) {
            const amount = parseFloat(approvalAmount);
            try {
                const response = await apiClient.put(`/event-requests/${selectedRequest.id}/status`, { status: 'APPROVED', approvedAmount: amount });
                setRequests(requests.map(req =>
                    req.id === selectedRequest.id
                        ? { ...req, status: 'APPROVED', approvedAmount: amount, pipelineStatus: response.data?.pipeline?.status }
                        : req
                ));
                setApproveModalOpen(false);
                setApprovalAmount('');

                setSelectedRequest(null);
                if (response.data?.pipeline?.redirectTo) {
                    navigate('/admin/event-requests');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleRejectClick = (request, e) => {
        e.stopPropagation();
        setSelectedRequest(request);
        setRejectModalOpen(true);
    };

    const handleRevokeClick = (request, e) => {
        if (e) e.stopPropagation();
        setSelectedRequest(request);
        setRevokeModalOpen(true);
    };

    const handleManageTeam = (req) => {
        setSelectedRequest(req);
        setSelectedFacultyIds(req.members?.map(m => m.userId) || []);
        setSelectedPiId(req.members?.find(m => m.role === 'PI')?.userId || req.facultyId);
        setTeamModalOpen(true);
    };

    const saveTeam = async () => {
        try {
            const response = await apiClient.put(`/event-requests/${selectedRequest._id}/members`, {
                piId: selectedPiId,
                memberIds: selectedFacultyIds
            });
            if (response.data.success) {
                setRequests(requests.map(r => 
                    r._id === selectedRequest._id ? { ...r, members: response.data.data } : r
                ));
                setTeamModalOpen(false);
                addNotification({
                    title: 'Team Updated',
                    message: `Event team for "${selectedRequest.eventTitle}" has been updated successfully.`,
                    type: 'success'
                });
            }
        } catch (error) {
            console.error("Error saving team:", error);
            addNotification({
                title: 'Error',
                message: 'Failed to update event team.',
                type: 'error'
            });
        }
    };

    const handleConfirmRevoke = async () => {
        if (selectedRequest) {
            const hasPhoto = !!uploadFile || selectedRequest.photosUploaded;
            try {
                await apiClient.put(`/event-requests/${selectedRequest.id}/status`, { status: 'REVOKED', remarks: 'Revoked by Admin - Event completed', photosUploaded: hasPhoto });
                setRequests(requests.map(req => req.id === selectedRequest.id ? {
                    ...req,
                    status: 'REVOKED',
                    remarks: 'Revoked by Admin - Event completed',
                    photosUploaded: hasPhoto
                } : req));

                setRevokeModalOpen(false);
                setUploadFile(null);
                
                addNotification({
                    role: 'FACULTY',
                    type: 'info',
                    message: `Event Request "${selectedRequest.eventTitle}" status updated to REVOKED.`,
                    actionUrl: '/faculty/event-requests',
                    targetUserId: selectedRequest.facultyId
                });
                
                setSelectedRequest(null);
            } catch (err) {
                console.error(err);
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
                await apiClient.put(`/event-requests/${selectedRequest.id}/status`, { status: 'REJECTED', remarks: rejectRemarks });
                setRequests(requests.map(req => req.id === selectedRequest.id ? { ...req, status: 'REJECTED', remarks: rejectRemarks } : req));
                setRejectModalOpen(false);
                setRejectRemarks('');
                
                addNotification({
                    role: 'FACULTY',
                    type: 'rejection',
                    message: `Event Request "${selectedRequest.eventTitle}" was REJECTED: ${rejectRemarks}`,
                    actionUrl: '/faculty/event-requests',
                    targetUserId: selectedRequest.facultyId
                });
                
                setSelectedRequest(null);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleRequestDetails = (request) => {
        setSelectedRequest(request);
        setDetailsModalOpen(true);
    };

    const handleExport = () => {
        // Generate CSV content
        const headers = ["ID", "Faculty", "Event Title", "Event Type", "Venue", "Dates", "Participants", "Funding Type", "Approved Amount", "Status", "Photos Uploaded", "Remarks"];
        const rows = requests.map(req => [
            req._id,
            req.facultyName,
            `"${(req.eventTitle || "").replace(/"/g, '""')}"`,
            req.eventType,
            `"${(req.venue || "").replace(/"/g, '""')}"`,
            `"${(req.dates || "").replace(/"/g, '""')}"`,
            req.participants,
            req.fundingType,
            req.fundingType === 'College Funded' ? req.approvedAmount : 'N/A',
            req.status,
            req.photosUploaded ? "Yes" : "No",
            `"${(req.remarks || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "event_requests_report.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredRequests = requests.filter(req => {
        const matchesStatus = selectedStatus === 'All' || req.status === selectedStatus;
        const matchesSearch = req.faculty.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.eventType.toLowerCase().includes(searchTerm.toLowerCase());
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
                            placeholder="Search event or faculty..."
                            className="w-full pl-10 pr-4 py-2 text-sm border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {calDateFilter && (
                        <Button variant="ghost" size="sm" onClick={() => setCalDateFilter(null)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            Clear Date: {format(calDateFilter, 'MMM d')} <XCircle className="w-4 h-4 ml-1" />
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={handleExport}>
                        <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Excel
                    </Button>

                    {/* Research Centre Filter Dropdown */}
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
                                <th className="px-6 py-3">Event Title</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Venue</th>
                                <th className="px-6 py-3">Dates</th>
                                <th className="px-6 py-3">Participants</th>
                                <th className="px-6 py-3">Funding</th>
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
                                    <td className="px-6 py-4 dark:text-gray-300">{req.eventTitle}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{req.eventType}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{req.venue}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{req.dates}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{req.participants}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline" className={
                                                req.fundingType === 'College Funded' ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-900/20' :
                                                    req.fundingType === 'Industry Funded' ? 'text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:bg-purple-900/20' :
                                                        'text-gray-600 border-gray-200 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-800'
                                            }>
                                                {req.fundingType}
                                            </Badge>
                                            {req.fundingType === 'College Funded' && req.approvedAmount && (
                                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">₹{req.approvedAmount.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </td>
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
                                        <div className="actions-cell">
                                            {req.status === 'PENDING' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs text-indigo-400 hover:bg-indigo-500/10 font-black action-btn"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setAiModal({ open: true, loading: true, result: null });
                                                            const res = await analyzeEventFeasibility(req);
                                                            setAiModal({ open: true, loading: false, result: res });
                                                        }}
                                                    >
                                                        <Brain className="w-3.5 h-3.5 mr-1" /> AI
                                                    </Button>
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
                                                        onClick={(e) => handleApproveClick(req, e)}
                                                    >
                                                        Approve
                                                    </Button>
                                                </>
                                            )}
                                            {req.status === 'APPROVED' && !req.photosUploaded && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 action-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleManageTeam(req);
                                                        }}
                                                    >
                                                        <Users className="w-3.5 h-3.5 mr-1" /> Team
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 action-btn"
                                                        onClick={(e) => handleRevokeClick(req, e)}
                                                    >
                                                        Revoke
                                                    </Button>
                                                </>
                                            )}
                                            {/* Allow Re-approving Revoked Events */}
                                            {req.status === 'REVOKED' && (
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm action-btn"
                                                    onClick={(e) => handleApproveClick(req, e)}
                                                >
                                                    <CheckCircle className="w-3 h-3" /> Approve
                                                </Button>
                                            )}
                                            {/* Allow Revoking/Re-approving Cancelled/Rejected Requests */}
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
                                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No event requests found for this filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Calendar View */}
            <EventCalendar requests={requests} holidays={holidays} onDateClick={handleDateClick} selectedDate={calDateFilter} onRequestClick={handleRequestDetails} />

            {/* Reject Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Event Request</DialogTitle>
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

            {/* Approve Modal - For College Funded Events */}
            <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign College Fund to Event</DialogTitle>
                        <DialogDescription>
                            Approve this college-funded event and assign the funding amount from the selected college fund source.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="py-4 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">{selectedRequest.eventTitle}</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-blue-700 dark:text-blue-400 font-medium">Faculty:</p>
                                        <p className="text-blue-900 dark:text-blue-200">{selectedRequest.faculty}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700 dark:text-blue-400 font-medium">Venue:</p>
                                        <p className="text-blue-900 dark:text-blue-200">{selectedRequest.venue}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700 dark:text-blue-400 font-medium">Funding Source:</p>
                                        <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:bg-blue-900/40">
                                            {selectedRequest.fundingSource}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-blue-700 dark:text-blue-400 font-medium">Participants:</p>
                                        <p className="text-blue-900 dark:text-blue-200">{selectedRequest.participants}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="approvalAmount" className="flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4" />
                                    Approved Funding Amount
                                </Label>
                                <Input
                                    id="approvalAmount"
                                    type="number"
                                    placeholder="Enter amount to approve"
                                    className="text-lg font-semibold"
                                    value={approvalAmount}
                                    onChange={(e) => setApprovalAmount(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    This amount will be approved from {selectedRequest.fundingSource}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleConfirmApprove}
                            disabled={!approvalAmount || parseFloat(approvalAmount) <= 0}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Assign Fund & Approve Event
                        </Button>
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
                            <p>Event: {selectedRequest?.eventTitle}</p>
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
                        <DialogTitle>Event Photos - {selectedRequest?.eventTitle}</DialogTitle>
                        <DialogDescription>{selectedRequest?.eventType} | {selectedRequest?.dates}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {selectedRequest?.photosUploaded ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="aspect-video bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border dark:border-slate-700 relative group overflow-hidden">
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                        <span className="text-xs text-gray-400 ml-2">Photo {i}</span>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button variant="secondary" size="sm" className="h-8 text-xs"><Download className="w-3 h-3 mr-1" /> Download</Button>
                                        </div>
                                    </div>
                                ))}
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

            {/* Event Details Modal */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Event Request Details</DialogTitle>
                        <DialogDescription>Full information for this event request.</DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">
                                    {selectedRequest.faculty.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg leading-none">{selectedRequest.faculty}</h4>
                                    <p className="text-sm text-gray-500">{selectedRequest.researchCentre}</p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-lg mb-2">{selectedRequest.eventTitle}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedRequest.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-gray-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Event Type</p>
                                    <p className="font-medium">{selectedRequest.eventType}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Dates</p>
                                    <p className="font-medium">{selectedRequest.dates}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Venue</p>
                                    <p className="font-medium">{selectedRequest.venue}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> Participants</p>
                                    <p className="font-medium">{selectedRequest.participants}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Funding Type</p>
                                    <Badge variant="outline" className={
                                        selectedRequest.fundingType === 'College Funded' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                                            selectedRequest.fundingType === 'Industry Funded' ? 'text-purple-600 border-purple-200 bg-purple-50' :
                                                'text-gray-600 border-gray-200 bg-gray-50'
                                    }>
                                        {selectedRequest.fundingType}
                                    </Badge>
                                </div>
                                {selectedRequest.fundingType === 'College Funded' && selectedRequest.fundingSource && (
                                    <div className="space-y-1">
                                        <p className="text-gray-500">Funding Source</p>
                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                            {selectedRequest.fundingSource}
                                        </Badge>
                                    </div>
                                )}
                                {selectedRequest.fundingType === 'College Funded' && selectedRequest.approvedAmount && (
                                    <div className="space-y-1">
                                        <p className="text-gray-500 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Approved Amount</p>
                                        <p className="font-medium text-blue-600">₹{selectedRequest.approvedAmount.toLocaleString()}</p>
                                    </div>
                                )}
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
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {[1, 2].map(i => (
                                            <div key={i} className="h-16 w-24 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {selectedRequest?.status === 'PENDING' && (
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={(e) => { handleApproveClick(selectedRequest, e); setDetailsModalOpen(false); }}>Approve Request</Button>
                        )}
                        {(selectedRequest?.status === 'APPROVED' || selectedRequest?.status === 'REJECTED' || selectedRequest?.status === 'CANCELLED') && (
                            <Button
                                variant="outline"
                                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                onClick={(e) => { handleRevokeClick(selectedRequest, e); setDetailsModalOpen(false); }}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Revoke
                            </Button>
                        )}
                        {selectedRequest?.status === 'REVOKED' && (
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => { handleApproveClick(selectedRequest, e); setDetailsModalOpen(false); }}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve Request
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />

            {/* Team Management Dialog */}
            <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
                <DialogContent className="max-w-2xl dark:bg-slate-900 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Manage Event Team
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            Allocate faculty members to "{selectedRequest?.eventTitle}"
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 my-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {faculties.filter(f => f.status === 'Active' || f.status === 'active').map(faculty => {
                            const isPi = selectedPiId === faculty._id;
                            const isMember = selectedFacultyIds.includes(faculty._id) && !isPi;
                            const isActive = isPi || isMember;

                            return (
                                <div key={faculty._id} className={`flex items-center p-3 rounded-lg border transition-all ${isActive ? 'bg-blue-500/5 border-blue-500/30' : 'border-slate-800 hover:border-slate-700'}`}>
                                    <div 
                                        className={`w-5 h-5 rounded border mr-3 flex items-center justify-center cursor-pointer transition-colors ${isActive ? 'bg-blue-500 border-blue-500' : 'border-slate-700 bg-slate-800'}`}
                                        onClick={() => {
                                            if (selectedFacultyIds.includes(faculty._id)) {
                                                setSelectedFacultyIds(selectedFacultyIds.filter(id => id !== faculty._id));
                                                if (selectedPiId === faculty._id) setSelectedPiId(null);
                                            } else {
                                                setSelectedFacultyIds([...selectedFacultyIds, faculty._id]);
                                            }
                                        }}
                                    >
                                        {isActive && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className={`text-sm font-medium ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{faculty.name}</p>
                                            <div className="flex items-center gap-2">
                                                {isActive && (
                                                    <Button
                                                        variant={isPi ? "default" : "outline"}
                                                        size="sm"
                                                        className={`h-6 text-[10px] px-2 ${isPi ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-400 border-slate-700'}`}
                                                        onClick={() => {
                                                            if (isPi) setSelectedPiId(null);
                                                            else setSelectedPiId(faculty._id);
                                                        }}
                                                    >
                                                        {isPi ? 'Principal Investigator' : 'Make PI'}
                                                    </Button>
                                                )}
                                                {isMember && <Badge className="text-[9px] bg-slate-800 text-slate-400 border-slate-700">Team Member</Badge>}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500">{faculty.centre} • {faculty.email}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTeamModalOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button>
                        <Button onClick={saveTeam} className="bg-blue-600 hover:bg-blue-700 text-white">Save Team Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EventRequests;
