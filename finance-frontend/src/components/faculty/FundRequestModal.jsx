import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, ChevronRight, AlertCircle, DollarSign, CheckCircle2, LayoutList, Target, Wallet } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const FundRequestModal = ({ isOpen, onClose, project, nextInstallment, onSubmit, maxClaimableAmount, isFinalInstallment }) => {
    // maxClaimableAmount is the specific amount allocated for this phase OR the total remaining grant, dependent on business logic. 
    // Assuming for 'Next Installment' it defaults to the planned phase amount but capped by total remaining.

    const [formData, setFormData] = useState({
        amount: nextInstallment ? nextInstallment.amount : 0,
        workCompleted: '',
        reasonForFunds: '',
        usagePlan: '',
        sufficiencyExplanation: '',
        confirmation: false,
        fundSource: ''
    });
    const [files, setFiles] = useState([]);
    const [fundSourceError, setFundSourceError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && nextInstallment) {
            setFormData(prev => ({
                ...prev,
                amount: isFinalInstallment ? maxClaimableAmount : nextInstallment.amount,
                workCompleted: '',
                reasonForFunds: '',
                usagePlan: '',
                sufficiencyExplanation: '',
                confirmation: false,
                fundSource: ''
            }));
            setFiles([]);
            setFundSourceError(false);
            setIsSubmitting(false);
        }
    }, [isOpen, nextInstallment, isFinalInstallment, maxClaimableAmount]);

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
                projectId: project.id,
                installmentNo: nextInstallment.phase,
                ...formData,
                files
            });
            // FIX: Reset form after successful submission
            setFormData({
                amount: 0,
                workCompleted: '',
                reasonForFunds: '',
                usagePlan: '',
                sufficiencyExplanation: '',
                confirmation: false,
                fundSource: ''
            });
            setFiles([]);
            toast.success('Installment request submitted successfully!');
            onClose();
        } catch (err) {
            // Parent handles the error toast  
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`${isFinalInstallment ? 'bg-orange-600' : 'bg-indigo-900'} p-8 text-white relative transition-colors`}>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <Badge className="bg-white/20 text-white border-0 mb-3 px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                                {isFinalInstallment ? 'Final Settlement' : 'Release Request 2.0'}
                            </Badge>
                            <h3 className="text-2xl font-bold tracking-tight">
                                {isFinalInstallment ? 'Final Installment Request' : 'Request Next Installment'}
                            </h3>
                            <div className="flex items-center gap-2 mt-2 opacity-80">
                                <span className="text-xs font-medium bg-white/10 px-2 py-0.5 rounded">Phase 0{nextInstallment.phase}</span>
                                <span className="text-xs font-medium">•</span>
                                <span className="text-xs font-medium">{project.title}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
                    {/* Visual Highlights */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100/50">
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 block">Amount Requested</label>
                            <div className="relative">
                                <DollarSign className="w-4 h-4 text-blue-600 absolute left-0 top-1/2 -translate-y-1/2" />
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                                    max={maxClaimableAmount}
                                    readOnly={isFinalInstallment} // Read-only if Final Installment
                                    className={`bg-transparent border-0 text-2xl font-bold text-blue-900 tracking-tight w-full pl-5 outline-none focus:ring-0 p-0 ${isFinalInstallment ? 'cursor-not-allowed opacity-70' : ''}`}
                                />
                            </div>
                            <p className="text-[10px] text-blue-400 font-medium mt-1">
                                {isFinalInstallment ? 'Auto-filled: Remaining Balance' : `Max allocatable: ₹${(maxClaimableAmount / 100000).toFixed(1)}L`}
                            </p>
                        </div>
                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Unreleased Grant</p>
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-emerald-600" />
                                <span className="text-2xl font-bold text-emerald-900 tracking-tight">
                                    ₹{(maxClaimableAmount / 100000).toFixed(1)}L
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Fund Source Type (Mandatory) */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fund Source Type <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, fundSource: 'PFMS' })}
                                className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.fundSource === 'PFMS'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
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
                                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.fundSource === 'INSTITUTIONAL' ? 'border-amber-600' : 'border-gray-300'}`}>
                                    {formData.fundSource === 'INSTITUTIONAL' && <div className="w-2 h-2 rounded-full bg-amber-600" />}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Institutional</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, fundSource: 'DIRECTOR' })}
                                className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.fundSource === 'DIRECTOR'
                                    ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.fundSource === 'DIRECTOR' ? 'border-purple-600' : 'border-gray-300'}`}>
                                    {formData.fundSource === 'DIRECTOR' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Director</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, fundSource: 'OTHERS' })}
                                className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.fundSource === 'OTHERS'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.fundSource === 'OTHERS' ? 'border-emerald-600' : 'border-gray-300'}`}>
                                    {formData.fundSource === 'OTHERS' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Others</span>
                            </button>
                        </div>
                        {fundSourceError && (
                            <p className="text-red-500 text-xs font-bold mt-1 ml-1">⚠ Please select a Fund Source Type.</p>
                        )}
                    </div>

                    {/* Detailed Fields */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Work Completed So Far <span className="text-red-500 ml-1">*</span>
                            </label>
                            <textarea
                                required
                                value={formData.workCompleted}
                                onChange={(e) => setFormData({ ...formData, workCompleted: e.target.value })}
                                placeholder="Summarize the milestones achieved in the previous phase..."
                                rows="3"
                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium text-gray-700 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center">
                                <Target className="w-3 h-3 mr-1 text-blue-500" /> Reason for {isFinalInstallment ? 'Final' : 'Next'} Installment <span className="text-red-500 ml-1">*</span>
                            </label>
                            <textarea
                                required
                                value={formData.reasonForFunds}
                                onChange={(e) => setFormData({ ...formData, reasonForFunds: e.target.value })}
                                placeholder="Justification for the next tranche of funding..."
                                rows="3"
                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium text-gray-700 text-sm"
                            />
                        </div>

                        {/* Additional Field for Final Installment */}
                        {isFinalInstallment && (
                            <div className="space-y-2 animate-fadeIn">
                                <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest ml-1 flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" /> How will this final amount be sufficient? <span className="text-red-500 ml-1">*</span>
                                </label>
                                <textarea
                                    required
                                    value={formData.sufficiencyExplanation}
                                    onChange={(e) => setFormData({ ...formData, sufficiencyExplanation: e.target.value })}
                                    placeholder="Explain how you will complete the project with this remaining amount..."
                                    rows="3"
                                    className="w-full p-4 bg-orange-50 border-0 rounded-2xl focus:ring-2 focus:ring-orange-100 transition-all outline-none font-medium text-gray-700 text-sm"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center">
                                <LayoutList className="w-3 h-3 mr-1 text-purple-500" /> Usage Plan <span className="text-red-500 ml-1">*</span>
                            </label>
                            <textarea
                                required
                                value={formData.usagePlan}
                                onChange={(e) => setFormData({ ...formData, usagePlan: e.target.value })}
                                placeholder="How will the requested funds be utilized?"
                                rows="3"
                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium text-gray-700 text-sm"
                            />
                        </div>
                    </div>

                    {/* Upload */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Supporting Documents (Optional)</label>
                        <div className="border-2 border-dashed border-gray-100 rounded-2xl p-6 hover:bg-gray-50/50 transition-all cursor-pointer text-center relative">
                            <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Click or drag to upload evidence</p>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase">PDF, JPG, PNG (Max 10MB)</p>
                            </div>
                        </div>
                        {files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {files.map(f => (
                                    <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-blue-700 border border-blue-100 text-[10px] font-bold uppercase truncate max-w-[150px]">
                                        <FileText className="w-3 h-3" />
                                        {f.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Confirmation Checkbox for Final Installment */}
                    {isFinalInstallment && (
                        <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100 animate-fadeIn">
                            <input
                                type="checkbox"
                                id="finalConfirm"
                                checked={formData.confirmation}
                                onChange={(e) => setFormData({ ...formData, confirmation: e.target.checked })}
                                className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                            />
                            <label htmlFor="finalConfirm" className="text-xs text-gray-700 font-medium cursor-pointer">
                                I confirm that this is the final installment required for this work. No further funding requests will be made for this project title.
                            </label>
                        </div>
                    )}

                    {/* Action */}
                    <div className="pt-4 flex items-center gap-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold text-gray-400 hover:text-gray-900">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isFinalInstallment && !formData.confirmation}
                            className={`flex-[2] h-12 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 ${isFinalInstallment
                                ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'
                                : 'bg-indigo-900 hover:bg-black shadow-indigo-100'
                                } ${isFinalInstallment && !formData.confirmation ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isFinalInstallment ? 'Submit Final Request' : 'Submit Request'} <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default FundRequestModal;
