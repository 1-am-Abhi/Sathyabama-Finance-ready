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
import { Calendar, Globe, BookOpen, Send, Clock, FileCheck, FileX, Upload, Plus, ChevronRight } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';

const FacultyODRequest = () => {
    const { setLayout } = useLayout();
    const { user } = useAuth();

    useEffect(() => {
        setLayout("OD Management Portal", "Deployment lifecycle supervision and institutional duty tracking");
    }, [setLayout]);

    const [odType, setOdType] = useState('ACADEMIC');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [days, setDays] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

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

    const handleProofUpload = async (id) => {
        try {
            await apiClient.put(`/od-requests/${id}/status`, { proofUploaded: true, status: 'APPROVED' }); // Keep status same, update proof
            setHistory(history.map(item => item._id === id ? { ...item, proofUploaded: true } : item));
            alert('Success');
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                type: odType,
                purpose: e.target.purpose.value,
                startDate,
                endDate,
                days
            };
            const response = await apiClient.post('/od-requests', payload);
            setHistory([response.data.data, ...history]);
            setShowForm(false);
        } catch (error) {
            console.error('Submit OD failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-8 pb-20">
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

            {/* Critical Notifications */}
            {history.some(h => h.status === 'APPROVED' && !h.proofUploaded) && (
                <Card className="border border-rose-500/30 bg-rose-900/40 text-white rounded-[2rem] p-8 relative overflow-hidden">
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Institutional Compliance Warning</h3>
                            <p className="text-sm font-medium italic text-rose-200 opacity-80 max-w-xl">Approved OD deployment detected without verified proof. Real-time verification is mandatory for session confirmation.</p>
                        </div>
                        <input
                            type="file"
                            id="faculty-od-proof-upload"
                            className="hidden"
                            onChange={(e) => {
                                const unuploaded = history.find(h => h.status === 'APPROVED' && !h.proofUploaded);
                                if (unuploaded && e.target.files[0]) {
                                    handleProofUpload(unuploaded._id);
                                }
                            }}
                        />
                        <Button 
                            onClick={() => document.getElementById('faculty-od-proof-upload').click()}
                            className="h-14 px-8 bg-rose-700 hover:bg-rose-600 text-white border border-rose-500/40 rounded-xl font-black text-xs uppercase tracking-widest italic transition-all shrink-0"
                        >
                            Upload Verification Image <Upload className="w-4 h-4 ml-3" />
                        </Button>
                    </div>
                </Card>
            )}

            {!showForm ? (
                <div className="flex justify-between items-center px-2">
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Mission Pipeline</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mt-1">Audit trail for academic and professional deployment</p>
                    </div>
                    <Button onClick={() => setShowForm(true)} className="h-14 px-8 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Initialize OD Request
                    </Button>
                </div>
            ) : (
                <Card className="border-0 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden bg-white animate-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">Deployment Blueprint</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Configure the parameters for your professional duty</CardDescription>
                        </div>
                        <Button variant="ghost" className="text-slate-400 hover:text-maroon-600 font-black text-[10px] uppercase tracking-widest italic" onClick={() => setShowForm(false)}>Abort Process</Button>
                    </CardHeader>
                    <CardContent className="p-10">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Mission Type</Label>
                                    <Select value={odType} onValueChange={setOdType}>
                                        <SelectTrigger className="h-14 rounded-2xl border-0 bg-gray-50 font-bold text-slate-800 italic">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-0 shadow-xl rounded-2xl bg-white">
                                            <SelectItem value="ACADEMIC">Academic / General</SelectItem>
                                            <SelectItem value="INTERNATIONAL">International Deployment</SelectItem>
                                            <SelectItem value="JOURNAL">Scholarly Pursuit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Period Duration</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="h-14 bg-gray-50 border-0 rounded-2xl font-bold italic" />
                                        <span className="text-gray-300 font-black italic text-xs uppercase">to</span>
                                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="h-14 bg-gray-50 border-0 rounded-2xl font-bold italic" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Total Credits</Label>
                                    <div className="h-14 rounded-2xl bg-indigo-50 flex items-center px-6">
                                        <span className="text-indigo-600 font-black italic text-xl tracking-tighter">{days} DAYS ALLOCATED</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Mission Objective & Justification</Label>
                                <Textarea name="purpose" placeholder="Define the institutional value of this deployment..." className="min-h-[140px] bg-gray-50 border-0 rounded-[2rem] p-6 font-bold text-slate-800 italic" required />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button className="h-16 px-12 bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-maroon-600/20 hover:scale-105 transition-all">
                                    {isSubmitting ? 'Transmitting Core...' : 'Transmit to Command Center'}
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
                                <th className="px-8 py-5">Category</th>
                                <th className="px-8 py-5">Objective</th>
                                <th className="px-8 py-5">Timeline</th>
                                <th className="px-8 py-5 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {history.map((item) => (
                                <tr key={item._id} className="hover:bg-white/5 transition-colors group">
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
                                    <td className="px-8 py-6 text-right">
                                        <span className={`text-[10px] font-black italic px-3 py-1 rounded-full uppercase tracking-tighter border ${
                                            item.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 
                                            item.status === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                            'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default FacultyODRequest;
