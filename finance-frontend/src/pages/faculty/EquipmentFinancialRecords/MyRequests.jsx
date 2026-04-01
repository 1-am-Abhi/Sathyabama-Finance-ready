import React, { useEffect, useState } from 'react';
import { Eye, Clock, CheckCircle, XCircle, Search, Filter, FileText, Plus, Hammer, ArrowUpRight, Building2, DollarSign, Upload, AlertCircle, ChevronRight } from 'lucide-react';
import { useNotifications } from '../../../contexts/NotificationContext';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { useLayout } from '../../../contexts/LayoutContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../../components/ui/dialog";
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import apiClient from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';


const MyRequests = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // New Request Form State
    const [formData, setFormData] = useState({
        projectId: '',
        equipmentName: '',
        quantity: '',
        requestType: 'PURCHASED',
        requestedAmount: '',
        justification: '',
        billData: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        setLayout("Asset & Equipment Management", "Inventory audit and institutional infrastructure deployment requests");
        fetchRequests();
        fetchProjects();
    }, [setLayout]);

    const fetchRequests = async () => {
        try {
            const res = await apiClient.get('/equipment-requests');
            const data = res.data.data || [];
            setRequests(data);
            setFilteredRequests(data);
        } catch (err) {
            console.error('Failed to load equipment requests', err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await apiClient.get('/projects');
            setProjects(res.data.data || []);
        } catch (err) {
            console.error('Failed to load projects', err);
        }
    };

    useEffect(() => {
        let result = requests;
        if (searchTerm) {
            result = result.filter(req =>
                req.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.projectName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (statusFilter !== 'All') result = result.filter(req => req.status === statusFilter);
        setFilteredRequests(result);
    }, [searchTerm, statusFilter, requests]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError('File size exceeds 5MB'); return; }
        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { setError('Invalid format (JPG, PNG, PDF only)'); return; }
        setError('');
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, billData: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.equipmentName || !formData.requestedAmount) {
            setError('Please fill in all required fields');
            return;
        }
        try {
            const selectedProject = projects.find(p => p._id === formData.projectId);
            const payload = {
                ...formData,
                projectName: selectedProject?.title || formData.projectId,
                requestedAmount: parseFloat(formData.requestedAmount),
                quantity: formData.quantity.toString()
            };
            const res = await apiClient.post('/equipment-requests', payload);
            const newRequest = res.data.data;
            const updated = [newRequest, ...requests];
            setRequests(updated);
            setFilteredRequests(updated);
            setIsModalOpen(false);
            
            // Notify Admin
            addNotification({
                role: 'ADMIN',
                type: 'info',
                message: `New Equipment Request for ${payload.equipmentName} (${payload.requestType})`,
                actionUrl: '/admin/equipment-requests'
            });
            // Notify Self
            addNotification({
                role: 'FACULTY',
                type: 'success',
                message: `Successfully submitted request for ${payload.equipmentName}. Pending Admin Approval.`,
                targetUserId: user?.id
            });

            setFormData({ projectId: '', equipmentName: '', quantity: '', requestType: 'PURCHASED', requestedAmount: '', justification: '', billData: '' });
            setError('');
        } catch (err) {
            setError('Submission failed. Please try again.');
            console.error(err);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-700';
            case 'Approved': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-rose-100 text-rose-700';
            case 'Funds Released': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="p-6 space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">Infrastructure Pipeline</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic mt-1">Audit trail for laboratory assets and equipment procurement</p>
                </div>
                
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-14 px-8 bg-slate-900 dark:bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-slate-900/20 hover:scale-105 transition-all">
                            <Plus className="w-4 h-4 mr-2" /> Request Asset Allocation
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl rounded-[2.5rem] p-0 bg-white dark:bg-slate-900">
                        <DialogHeader className="p-10 border-b border-gray-50 dark:border-slate-800">
                            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">Procurement Terminal</DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Configure asset request parameters for institutional verification</DialogDescription>
                        </DialogHeader>
                        
                        <div className="p-10">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {error && (
                                    <div className="p-4 bg-maroon-50 dark:bg-maroon-950/30 text-maroon-600 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest italic animate-bounce">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Parent Project Entity</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                                            <SelectTrigger className="h-16 pl-14 rounded-2xl border-0 bg-gray-50 dark:bg-slate-800 font-black text-xs italic uppercase tracking-widest dark:text-white">
                                                <SelectValue placeholder="SELECT AN ACTIVE MISSION..." />
                                            </SelectTrigger>
                                            <SelectContent className="border-0 shadow-xl rounded-2xl bg-white dark:bg-slate-800 font-black text-xs italic uppercase">
                                                {projects.length > 0 ? projects.map(project => (
                                                    <SelectItem key={project._id} value={project._id}>
                                                        {project.title}
                                                    </SelectItem>
                                                )) : (
                                                    <SelectItem value="none" disabled>No projects found</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Asset Nomenclature</Label>
                                        <div className="relative">
                                            <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <Input
                                                value={formData.equipmentName}
                                                onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                                                placeholder="E.G., HIGH-SPEED SPECTROMETER"
                                                className="h-16 pl-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-black text-xs italic uppercase tracking-widest dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Quantity Units</Label>
                                        <Input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            placeholder="0"
                                            className="h-16 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-black text-xs italic uppercase tracking-widest dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Financial Protocol</Label>
                                        <Select value={formData.requestType} onValueChange={(v) => setFormData({ ...formData, requestType: v })}>
                                            <SelectTrigger className="h-16 rounded-2xl border-0 bg-gray-50 dark:bg-slate-800 font-black text-xs italic uppercase tracking-widest dark:text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="border-0 shadow-xl rounded-2xl bg-white dark:bg-slate-800 font-black text-xs italic uppercase">
                                                <SelectItem value="PURCHASED">POST-PROCUREMENT REIMBURSEMENT</SelectItem>
                                                <SelectItem value="FUNDING">ADVANCE PROCUREMENT FUNDING</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Requested Yield (₹)</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <Input
                                                type="number"
                                                value={formData.requestedAmount}
                                                onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                                                placeholder="0.00"
                                                className="h-16 pl-14 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl font-black text-xs italic uppercase tracking-widest dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Artifact Transmission (Bill / Quotation)</Label>
                                    <label className="border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-800/50 hover:bg-maroon-50/30 transition-colors cursor-pointer group relative overflow-hidden">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Upload className="w-10 h-10 text-gray-300 mb-4 group-hover:text-maroon-600 group-hover:scale-110 transition-all" />
                                        <p className="text-xs font-black uppercase tracking-widest italic text-slate-600 dark:text-slate-400 transition-colors text-center">
                                            {formData.billData ? '✓ Bill Attached' : 'Transmit Artifact Proof to Command Center'}
                                        </p>
                                        <p className="text-[9px] font-black text-gray-400 mt-2 uppercase italic tracking-tighter">Verified File Types: PDF, JPG, PNG (Max Limit: 5MB)</p>
                                    </label>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Mission Justification (Strategic Narrative)</Label>
                                    <Textarea
                                        value={formData.justification}
                                        onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                                        placeholder="SUPPLY STRATEGIC RATIONALE FOR THIS ASSET PROCURMENT..."
                                        className="min-h-[140px] bg-gray-50 dark:bg-slate-800 border-0 rounded-[2rem] p-6 font-black text-xs italic uppercase tracking-widest text-slate-800 dark:text-white shadow-inner"
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" className="h-16 px-12 bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-maroon-600/20 hover:scale-105 transition-all flex items-center gap-3">
                                        Finalize Request <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row gap-4 px-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 font-black italic" />
                    <input
                        type="text"
                        placeholder="EXECUTE SEARCH BY ASSET OR PROJECT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-12 pr-6 bg-white dark:bg-slate-900 border-0 rounded-2xl shadow-sm text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-maroon-500 transition-all placeholder:text-gray-300 dark:text-white"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-14 px-6 bg-white dark:bg-slate-900 border-0 rounded-2xl shadow-sm text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-maroon-500 dark:text-white"
                >
                    <option value="All">All Status Levels</option>
                    <option value="Pending">Pending Audit</option>
                    <option value="Approved">Verified / Approved</option>
                    <option value="Rejected">Rejected / Aborted</option>
                    <option value="Funds Released">Released for Procurement</option>
                </select>
            </div>

            {/* Ledger Table - Admin Hub Aesthetic */}
            <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-500 font-black italic">
                                <th className="px-8 py-5">Asset Description</th>
                                <th className="px-8 py-5">Project Entity</th>
                                <th className="px-8 py-5">Financial Yield</th>
                                <th className="px-8 py-5">Categorization</th>
                                <th className="px-8 py-5 text-right">Audit Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-maroon-50 transition-colors">
                                                    <Hammer className="w-5 h-5 text-gray-300 group-hover:text-maroon-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black italic uppercase tracking-tighter text-slate-800 dark:text-white line-clamp-1">{req.equipmentName}</p>
                                                    <p className="text-[9px] font-black text-gray-400 italic uppercase mt-0.5">Quantity: {req.quantity} Units</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-black italic uppercase text-slate-500 dark:text-gray-400 line-clamp-1">{req.projectName}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black italic text-maroon-600 tracking-tighter">₹{parseInt(req.requestedAmount).toLocaleString()}</p>
                                            {req.approvedAmount && (
                                                <p className="text-[9px] font-black text-green-600 italic uppercase mt-0.5">Approved: ₹{parseInt(req.approvedAmount).toLocaleString()}</p>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge variant="outline" className="border-indigo-100 text-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/20 dark:border-indigo-900/30 text-[9px] font-black italic uppercase px-3 py-1">
                                                {req.requestType === 'PURCHASED' ? 'Reimbursement' : 'Funding'}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Badge className={`border-0 text-[10px] font-black italic px-3 py-1 rounded-full uppercase tracking-tighter ${getStatusStyle(req.status)} shadow-sm`}>
                                                {req.status}
                                            </Badge>
                                            {req.adminRemarks && (
                                                <p className="text-[9px] font-bold text-gray-400 mt-1 italic">"{req.adminRemarks}"</p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-20">
                                            <FileText className="w-12 h-12 dark:text-white" />
                                            <p className="text-xs font-black uppercase tracking-widest italic dark:text-white">Zero asset requests detected in current stream</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default MyRequests;
