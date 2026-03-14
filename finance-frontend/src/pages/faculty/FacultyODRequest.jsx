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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { Calendar, Globe, BookOpen, Send, Clock, FileCheck, FileX, Upload, Plus } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';

const FacultyODRequest = () => {
    const { setLayout } = useLayout();
    const { user } = useAuth();

    useEffect(() => {
        setLayout("OD Request Portal", "Formalize On-Duty requests for professional activities");
    }, [setLayout]);
    const [odType, setOdType] = useState('ACADEMIC');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [days, setDays] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Mock OD History
    const [history, setHistory] = useState([
        {
            id: 'OD-2024-003',
            type: 'ACADEMIC',
            purpose: 'Guest Lecture at IIT Madras',
            startDate: new Date().toISOString().split('T')[0], // Today
            endDate: new Date().toISOString().split('T')[0],
            days: 1,
            status: 'APPROVED',
            proofUploaded: false // Needs proof
        },
        {
            id: 'OD-2024-001',
            type: 'ACADEMIC',
            purpose: 'International Conference on AI',
            startDate: '2024-03-15',
            endDate: '2024-03-17',
            days: 3,
            status: 'APPROVED',
            proofUploaded: true,
            proofTime: '10:30 AM'
        },
        {
            id: 'OD-2024-002',
            type: 'JOURNAL',
            purpose: 'Writing Research Paper on ML',
            startDate: '2024-04-10',
            endDate: '2024-04-11',
            days: 2,
            status: 'PENDING',
            proofUploaded: false
        }
    ]);

    // Auto-calculate days
    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setDays(diffDays > 0 ? diffDays : 0);
        }
    }, [startDate, endDate]);

    // NEW: Auto-Revoke Logic (Client-Side Sim)
    useEffect(() => {
        const checkRevocations = () => {
            const now = new Date();
            // Real logic: Check if time > 12:00 PM
            const isAfterDeadline = now.getHours() >= 12; // 12:00 PM or later
            const today = new Date().toISOString().split('T')[0];

            setHistory(prevHistory => prevHistory.map(item => {
                if (item.status === 'APPROVED' && !item.proofUploaded && item.startDate === today && isAfterDeadline) {
                    return { ...item, status: 'REVOKED - PROOF MISSING' };
                }
                return item;
            }));
        };

        // Check immediately and then every minute (for demo purposes)
        checkRevocations();
        const interval = setInterval(checkRevocations, 60000);
        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, []);

    // Helper to upload proof
    const handleProofUpload = (id) => {
        const updated = history.map(item =>
            item.id === id ? { ...item, proofUploaded: true, proofTime: new Date().toLocaleTimeString() } : item
        );
        setHistory(updated);
        // Show success alert
        alert("Proof uploaded successfully! Your OD is confirmed.");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            const newEntry = {
                id: `OD-2024-00${history.length + 1}`,
                type: odType,
                purpose: e.target.purpose.value,
                startDate,
                endDate,
                days,
                status: 'PENDING'
            };
            setHistory([newEntry, ...history]);
            setIsSubmitting(false);
            setShowForm(false);
            // Reset form
            setStartDate('');
            setEndDate('');
            setDays(0);
        }, 1500);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'REVOKED - PROOF MISSING': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    return (
        <div className="min-h-full">

            <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fadeIn">

                {/* Notification & Action Area */}
                {history.map(item => {
                    const isToday = item.startDate === new Date().toISOString().split('T')[0];
                    if (item.status === 'APPROVED' && !item.proofUploaded) {
                        return (
                            <div key={item.id} className="bg-orange-50 border-l-4 border-orange-500 rounded-r-xl p-6 shadow-sm flex items-center justify-between animate-pulse">
                                <div>
                                    <h4 className="text-orange-900 font-bold flex items-center">
                                        <Clock className="w-5 h-5 mr-2" /> Action Required: OD Approved
                                    </h4>
                                    <p className="text-orange-700 text-sm mt-1">
                                        Your OD Request <strong>{item.id}</strong> is approved. Please upload proof photo before <strong>12:00 PM Today</strong> to avoid revocation.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2">
                                        <Upload className="w-4 h-4" />
                                        Upload Proof Photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={() => handleProofUpload(item.id)}
                                        />
                                    </label>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })}

                {!showForm ? (
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 border-l-4 border-blue-600 pl-4">OD Management</h2>
                            <p className="text-slate-500 text-sm mt-1 ml-5">Track and submit your professional leave requests</p>
                        </div>
                        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 h-12 shadow-lg shadow-blue-200">
                            <Plus className="w-5 h-5 mr-2" /> New OD Request
                        </Button>
                    </div>
                ) : (
                    <Card className="border-0 shadow-2xl rounded-[2rem] overflow-hidden bg-white">
                        <CardHeader className="bg-slate-900 text-white p-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center">
                                        <Calendar className="w-6 h-6 mr-3 text-blue-400" />
                                        Submit New OD Request
                                    </CardTitle>
                                    <CardDescription className="text-slate-400 mt-2 font-medium">
                                        Institutional request for professional or academic deployment
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">Cancel</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Faculty Info - Read-only */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Faculty Name</Label>
                                        <p className="font-bold text-slate-900">{user?.name}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</Label>
                                        <p className="font-bold text-slate-900">{user?.dept || 'Engineering'}</p>
                                    </div>
                                </div>

                                {/* Core OD Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase text-slate-600">OD Type</Label>
                                        <Select value={odType} onValueChange={setOdType}>
                                            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                                                <SelectValue placeholder="Select OD type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACADEMIC" className="font-medium focus:bg-blue-50">Academic / General OD</SelectItem>
                                                <SelectItem value="INTERNATIONAL" className="font-medium focus:bg-blue-50">International Visit</SelectItem>
                                                <SelectItem value="JOURNAL" className="font-medium focus:bg-blue-50">Journal / Book Writing</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase text-slate-600">Period Selection</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                required
                                                className="h-12 rounded-xl border-slate-200"
                                            />
                                            <span className="text-slate-400 font-bold">to</span>
                                            <Input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                required
                                                className="h-12 rounded-xl border-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase text-slate-600">Total Duration</Label>
                                        <div className="h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center px-4">
                                            <span className="text-blue-700 font-bold text-lg">{days} Days</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Fields */}
                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
                                    {odType === 'ACADEMIC' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Event Name</Label>
                                                <Input placeholder="e.g., IEEE Annual Research Meet" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Venue / Organization</Label>
                                                <Input placeholder="City, Institution Name" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                            <div className="space-y-3 md:col-span-2">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Supporting Evidence (Optional)</Label>
                                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-300 transition-colors cursor-pointer group">
                                                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-blue-500" />
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600">Upload Brochure / Invite</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {odType === 'INTERNATIONAL' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Destination (Country & City)</Label>
                                                <Input placeholder="e.g., Zurich, Switzerland" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Host Institution</Label>
                                                <Input placeholder="University or Conference Venue" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                            <div className="space-y-3 md:col-span-2">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Passport & Invitation (Mandatory Upload)</Label>
                                                <div className="border-2 border-dashed border-blue-200 bg-blue-50/20 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                                                    <Globe className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Attach Institutional Approval & Travel Docs</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3 md:col-span-2">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Expected Outcome</Label>
                                                <Input placeholder="Briefly define the research value" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                        </div>
                                    )}

                                    {odType === 'JOURNAL' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Title of Work</Label>
                                                <Input placeholder="Manual/Journal title" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Journal / Publisher</Label>
                                                <Input placeholder="e.g., Springer, IEEE" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Manuscript Status</Label>
                                                <Select defaultValue="DRAFT">
                                                    <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="DRAFT">Draft Phase</SelectItem>
                                                        <SelectItem value="SUBMITTED">Submitted / Under Review</SelectItem>
                                                        <SelectItem value="ACCEPTED">Accepted / Final Edit</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase text-slate-600">Target Date</Label>
                                                <Input type="date" className="h-12 rounded-xl border-slate-200" required />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs font-bold uppercase text-slate-600">Purpose / Detailed Justification <span className="text-red-500">*</span></Label>
                                    <Textarea
                                        name="purpose"
                                        placeholder="Please explain why this OD is critical to your roles..."
                                        className="min-h-[120px] rounded-2xl border-slate-200"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        disabled={isSubmitting}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-10 rounded-[1.25rem] shadow-xl shadow-blue-100 flex items-center transition-all hover:translate-y-[-2px]"
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center"><Clock className="w-5 h-5 mr-2 animate-spin" /> Submitting Request...</span>
                                        ) : (
                                            <span className="flex items-center"><Send className="w-5 h-5 mr-2" /> Submit Formal Request</span>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* OD History Table */}
                <Card className="border-0 shadow-lg rounded-[2.5rem] overflow-hidden bg-white">
                    <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between bg-white">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center text-slate-800">
                                <BookOpen className="w-6 h-6 mr-3 text-indigo-500" />
                                OD Request History
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Review your deployment lifecycle</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-0">
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 px-8 py-5">Request ID</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5">OD Type</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5">Duration</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5">Purpose</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50 group border-b border-slate-50 last:border-0">
                                        <TableCell className="px-8 py-6">
                                            <p className="font-bold text-xs text-slate-900">{item.id}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Submitted on {item.startDate}</p>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <Badge variant="outline" className="rounded-full border-indigo-200 text-indigo-600 bg-indigo-50/30 px-3 py-1 text-[10px] font-bold">
                                                {item.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-6 font-bold text-slate-600 text-[10px] uppercase">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                {item.startDate} to {item.endDate}
                                                <span className="text-blue-600 ml-1">({item.days}d)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6 text-sm text-slate-600 font-medium max-w-[250px] truncate">
                                            {item.purpose}
                                        </TableCell>
                                        <TableCell className="py-6 text-center">
                                            <Badge className={`rounded-full px-4 py-1 text-[9px] font-bold tracking-tighter shadow-sm border ${getStatusStyle(item.status)}`}>
                                                {item.status === 'APPROVED' ? <FileCheck className="w-3 h-3 mr-1" /> : item.status === 'REJECTED' ? <FileX className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FacultyODRequest;
