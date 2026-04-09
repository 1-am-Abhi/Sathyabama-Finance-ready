import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, ChevronRight, DollarSign, Target, Briefcase, BookOpen, GraduationCap, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const InitialFundRequestModal = ({ isOpen, onClose, onSubmit }) => {
    const defaultFormData = {
        title: '',
        type: 'Project',
        description: '',
        totalBudget: '',
        amount: '',
        reason: '',
        usagePlan: '',
        expectedOutcome: '',
        fundSource: ''
    };
    const [formData, setFormData] = useState(defaultFormData);
    const [files, setFiles] = useState([]);
    const [fundSourceError, setFundSourceError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // FIX: Reset form state whenever modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData(defaultFormData);
            setFiles([]);
            setFundSourceError(false);
            setIsSubmitting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileUpload = (e) => {
        const uploadedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...uploadedFiles.map(f => ({ name: f.name, id: Math.random() }))]);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!formData.fundSource) {
            setFundSourceError(true);
            return;
        }
        setFundSourceError(false);
        setIsSubmitting(true);
        try {
            await onSubmit({
                ...formData,
                files
            });
            // FIX: Reset form after successful submission
            setFormData(defaultFormData);
            setFiles([]);
            toast.success('Fund request submitted successfully!');
            onClose();
        } catch (err) {
            // Parent handles the error toast
        } finally {
            setIsSubmitting(false);
        }
    };

    const workTypes = [
        { id: 'Project', label: 'Research Project', icon: Briefcase },
        { id: 'Book', label: 'Book Publication', icon: BookOpen },
        { id: 'Journal', label: 'Journal Paper', icon: FileSpreadsheet },
        { id: 'Publication', label: 'Other Publication', icon: GraduationCap },
    ];

    const modalContent = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-emerald-900 p-8 text-white relative">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <Badge className="bg-white/20 text-white border-0 mb-3 px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                                New Application
                            </Badge>
                            <h3 className="text-2xl font-bold tracking-tight">New Fund Request</h3>
                            <p className="text-emerald-200 text-xs mt-1 font-medium italic opacity-80">
                                Apply for funding for a new academic work or project
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleFormSubmit} className="p-8 space-y-8">

                    {/* Section 1: Work Details */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">1. Work Details</h4>

                        <div className="flex flex-col gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Type of Work <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {workTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: type.id })}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.type === type.id
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">{type.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Title of Work <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. AI-Based Crop Disease Detection"
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-100 transition-all outline-none font-bold text-gray-800 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Briefly describe the scope and objectives of the work..."
                                rows="3"
                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-100 transition-all outline-none font-medium text-gray-700 text-sm"
                            />
                        </div>
                    </div>

                    {/* Section 2: Financials */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">2. Financial Requirements</h4>

                        {/* NEW: Fund Source Type (Mandatory) */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fund Source Type <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, fundSource: 'PFMS' })}
                                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.fundSource === 'PFMS'
                                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md'
                                        : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.fundSource === 'PFMS' ? 'border-blue-600' : 'border-gray-300'}`}>
                                        {formData.fundSource === 'PFMS' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">PFMS Fund</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, fundSource: 'INSTITUTIONAL' })}
                                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.fundSource === 'INSTITUTIONAL'
                                        ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md'
                                        : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.fundSource === 'INSTITUTIONAL' ? 'border-amber-600' : 'border-gray-300'}`}>
                                        {formData.fundSource === 'INSTITUTIONAL' && <div className="w-2 h-2 rounded-full bg-amber-600" />}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Institutional</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, fundSource: 'OTHERS' })}
                                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.fundSource === 'OTHERS'
                                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-md'
                                        : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.fundSource === 'OTHERS' ? 'border-purple-600' : 'border-gray-300'}`}>
                                        {formData.fundSource === 'OTHERS' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Other's Fund</span>
                                </button>
                            </div>
                            {fundSourceError && (
                                <p className="text-red-500 text-xs font-bold mt-1 ml-1">⚠ Please select a Fund Source Type.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center">
                                    <Target className="w-3 h-3 mr-1 text-blue-500" /> Estimated Total Budget <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input
                                        required
                                        type="number"
                                        value={formData.totalBudget}
                                        onChange={(e) => setFormData({ ...formData, totalBudget: Number(e.target.value) || 0 })}
                                        placeholder="Total Project Cost"
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center">
                                    <DollarSign className="w-3 h-3 mr-1 text-emerald-500" /> Amount Requested Now <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="w-4 h-4 text-emerald-600 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input
                                        required
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                                        placeholder="Initial Installment"
                                        className="w-full pl-10 pr-4 py-4 bg-emerald-50/50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-100 transition-all outline-none font-bold text-emerald-900"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Justification */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">3. Justification & Utilization</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Reason for Requesting <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Why are funds needed at this stage?"
                                    rows="3"
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-100 transition-all outline-none font-medium text-gray-700 text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Utilization Plan <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    value={formData.usagePlan}
                                    onChange={(e) => setFormData({ ...formData, usagePlan: e.target.value })}
                                    placeholder="Breakdown of how the requested amount will be spent..."
                                    rows="3"
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-100 transition-all outline-none font-medium text-gray-700 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Expected Outcome <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                value={formData.expectedOutcome}
                                onChange={(e) => setFormData({ ...formData, expectedOutcome: e.target.value })}
                                placeholder="What is the expected deliverable after using these funds?"
                                rows="2"
                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-100 transition-all outline-none font-medium text-gray-700 text-sm"
                            />
                        </div>
                    </div>

                    {/* Section 4: Supporting Documents */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">4. Supporting Documents</h4>
                        
                        <div className="flex flex-wrap gap-4">
                            <input
                                type="file"
                                id="initial-modal-file-upload"
                                className="hidden"
                                multiple
                                onChange={handleFileUpload}
                            />
                            <Button
                                type="button"
                                onClick={() => document.getElementById('initial-modal-file-upload').click()}
                                variant="outline"
                                className="h-24 w-full md:w-48 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                            >
                                <Upload className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                                <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-emerald-700">Upload Documents</span>
                            </Button>

                            {files.map((file) => (
                                <div key={file.id} className="h-24 w-full md:w-48 bg-gray-50 rounded-2xl border border-gray-100 p-4 flex flex-col justify-between relative group overflow-hidden">
                                    <FileText className="w-8 h-8 text-emerald-600 opacity-20 absolute -right-2 -bottom-2" />
                                    <p className="text-[10px] font-bold text-gray-700 truncate pr-6">{file.name}</p>
                                    <div className="flex items-center justify-between">
                                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[8px] px-1.5 py-0">READY</Badge>
                                        <button 
                                            type="button"
                                            onClick={() => setFiles(files.filter(f => f.id !== file.id))}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action */}
                    <div className="pt-4 flex items-center gap-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold text-gray-400 hover:text-gray-900">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-[2] h-12 bg-emerald-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3">
                            Submit New Proposals <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default InitialFundRequestModal;
