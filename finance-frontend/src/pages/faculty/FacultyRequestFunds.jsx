import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    History, ChevronRight, PlusCircle, Wallet, Activity, DollarSign,
    CheckCircle, Clock, Banknote, ArrowRight, X, FileText, Globe, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';
import InstallmentStepper from '../../components/faculty/InstallmentStepper';
import FundRequestModal from '../../components/faculty/FundRequestModal';
import InitialFundRequestModal from '../../components/faculty/InitialFundRequestModal';

const FacultyRequestFunds = () => {
    const { setLayout } = useLayout();
    const { addNotification } = useNotifications();
    const { user } = useAuth();

    React.useEffect(() => {
        setLayout("Fund & Asset Management", "Strategic disbursement oversight and grant lifecycle tracking");
    }, [setLayout]);

    const { projects, fundRequests, createRequest, updateFundRequest, isLoading } = usePipeline();
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestMode, setRequestMode] = useState('RELEASE');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [billUploadUrl, setBillUploadUrl] = useState('');

    useEffect(() => {
        if (projects?.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0]._id);
        }
    }, [projects, selectedProjectId]);

    const selectedProject = projects?.find(p => p._id === selectedProjectId);
    const isPI = selectedProject && (selectedProject.piId === user?._id || selectedProject.userId === user?._id);
    const allocatedStatuses = ['APPROVED', 'PENDING_DISBURSAL', 'DISBURSED'];
    const releasedStages = ['CHEQUE_RELEASED', 'AMOUNT_DISBURSED'];
    
    // Adapted installment logic
    const installments = [
        { phase: 1, amount: (selectedProject?.sanctionedBudget || 0) * 0.4, status: 'RELEASED', date: 'Shared' },
        { phase: 2, amount: (selectedProject?.sanctionedBudget || 0) * 0.3, status: 'PENDING', date: null },
    ];

    const nextInstallment = installments.find(i => i.status === 'PENDING' || i.status === 'UPCOMING');
    
    const releasedAmount = selectedProject 
        ? (selectedProject.releasedBudget || 0)
        : (fundRequests || []).filter(r => allocatedStatuses.includes((r.status || '').toUpperCase()) && (releasedStages.includes(r.currentStage) || (r.status || '').toUpperCase() === 'DISBURSED')).reduce((acc, req) => acc + (req.requestedAmount || 0), 0);
        
    const sanctionedAmount = selectedProject
        ? (selectedProject.sanctionedBudget || 0)
        : (fundRequests || []).filter(r => allocatedStatuses.includes((r.status || '').toUpperCase())).reduce((acc, req) => acc + (req.requestedAmount || 0), 0);

    const remainingAmount = sanctionedAmount - releasedAmount;

    const handleExportExcel = () => {
        const dataToExport = (fundRequests || []).map(item => ({
            'Request ID': item._id || item.id,
            'Date': new Date(item.createdAt).toLocaleDateString(),
            'Project': item.projectTitle,
            'Amount (₹)': item.requestedAmount,
            'Purpose': item.purpose,
            'Status': item.status,
            'Stage': item.currentStage || 'N/A',
            'Source': item.source,
            'Remarks': item.remarks || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Fund Requests');
        XLSX.writeFile(wb, `Fund_Requests_${user?.name?.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleUploadBills = async () => {
        if (!billUploadUrl.trim()) return;
        try {
            setIsSubmitting(true);
            await updateFundRequest({
                requestId: selectedRequest._id || selectedRequest.id,
                updates: {
                    documents: [...(selectedRequest.documents || []), { url: billUploadUrl, name: 'Payment Proof/Bill' }],
                    currentStage: 'BILLS_UPLOADED'
                }
            });
            
            addNotification({
                role: 'FINANCE_OFFICER',
                type: 'info',
                message: `Bills uploaded for Fund Request: ${selectedRequest?.projectTitle}. Ready for verification and disbursement.`,
                actionUrl: '/finance/disbursements'
            });
            
            setShowDetailsModal(false);
            setBillUploadUrl('');
            
        } catch (error) {
            console.error('Failed to upload bills:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-maroon-600 font-bold">Loading Data...</div>;

    return (
        <div className="p-6 space-y-10">
            {/* Quick Summary Cards - Admin Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/30">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Total Sanctioned</p>
                                <p className="text-3xl font-bold mt-2">{formatCurrency(sanctionedAmount)}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100/50 dark:bg-blue-800/20 rounded-xl flex items-center justify-center">
                                <Banknote className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/30">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Released Amount</p>
                                <p className="text-3xl font-bold mt-2">{formatCurrency(releasedAmount)}</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100/50 dark:bg-emerald-800/20 rounded-xl flex items-center justify-center">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/30">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Remaining Balance</p>
                                <p className="text-3xl font-bold mt-2">{formatCurrency(remainingAmount)}</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-100/50 dark:bg-amber-800/20 rounded-xl flex items-center justify-center">
                                <Wallet className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Project Selector - Sidebar */}
                <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden lg:h-fit">
                    <CardHeader className="bg-gray-50 dark:bg-slate-800/50 p-6 border-b dark:border-slate-800">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-500 italic">Active Projects</CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {projects?.map((project) => (
                            <button
                                key={project._id}
                                onClick={() => setSelectedProjectId(project._id)}
                                className={`w-full text-left p-6 transition-all hover:bg-gray-50 dark:hover:bg-slate-800/50 ${
                                    selectedProjectId === project._id ? 'bg-maroon-50/50 border-r-4 border-maroon-600' : ''
                                }`}
                            >
                                <p className={`text-sm font-bold italic tracking-tighter uppercase ${selectedProjectId === project._id ? 'text-maroon-700' : 'text-slate-600 dark:text-gray-300'}`}>
                                    {project.title}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-[9px] font-black italic px-2 py-0 border-gray-200">
                                        #{project._id.substring(0, 6)}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-gray-400">
                                        REM: {formatCurrency((project.sanctionedBudget || 0) - (project.releasedBudget || 0))}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-slate-800/30">
                        <Button 
                            onClick={() => { setRequestMode('INITIAL'); setIsModalOpen(true); }}
                            className="w-full bg-slate-900 text-white rounded-xl py-6 font-black text-xs uppercase tracking-widest italic shadow-lg shadow-slate-900/20"
                        >
                            <PlusCircle className="w-4 h-4 mr-2" /> New Grant Request
                        </Button>
                        <p className="text-[9px] text-gray-400 mt-2 text-center italic uppercase leading-tight font-bold">
                            * Only Principal Investigators can initiate new grant applications
                        </p>
                    </div>
                </Card>

                {/* Management Area */}
                <div className="lg:col-span-2 space-y-8">
                    {selectedProject && (
                        <Card className="border-0 shadow-xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                            <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                                <div className="space-y-2">
                                    <Badge className="bg-maroon-600 text-white border-0 text-[10px] font-black italic tracking-widest px-3 py-1 uppercase">Subsequent Installment</Badge>
                                    <CardTitle className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">{selectedProject.title}</CardTitle>
                                </div>
                                <div className="w-16 h-16 bg-maroon-50 text-maroon-600 rounded-2xl flex items-center justify-center relative">
                                    <Activity className="w-8 h-8" />
                                    {!isPI && (
                                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg" title="Read Only Access">
                                            <Clock className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-10">
                                <InstallmentStepper
                                    installments={installments}
                                    currentPhase={nextInstallment?.phase || 0}
                                />
                                <div className="mt-12 flex flex-col items-center text-center space-y-6">
                                    <div className="max-w-md">
                                        <h4 className="text-xl font-bold text-slate-800 italic uppercase tracking-tighter">
                                            {isPI ? 'Request Disbursement' : 'Restricted Access'}
                                        </h4>
                                        <p className="text-sm font-medium italic text-gray-400 mt-2">
                                            {isPI 
                                                ? 'Submit your progress report and expense justification to trigger the next phase release.'
                                                : "You are a team member on this project. Only the Principal Investigator can process fund release phases."}
                                        </p>
                                    </div>
                                    <Button
                                        disabled={!isPI || !nextInstallment || nextInstallment.status === 'PENDING'}
                                        onClick={() => { setRequestMode('RELEASE'); setIsModalOpen(true); }}
                                        className={`h-16 px-12 rounded-2xl font-black text-xs uppercase tracking-widest italic transition-all flex items-center gap-3 ${
                                            isPI 
                                            ? 'bg-maroon-600 text-white shadow-xl shadow-maroon-600/20 hover:scale-105' 
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                                        }`}
                                    >
                                        {nextInstallment?.status === 'PENDING' ? 'Request Under Review' : isPI ? 'Process Next Phase' : 'PI Only Action'}
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* History Table */}
                    <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-gray-50 dark:bg-slate-800/50 p-6 border-b dark:border-slate-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-500 italic">Disbursement History</CardTitle>
                            <Button onClick={handleExportExcel} variant="ghost" size="sm" className="text-gray-400 hover:text-maroon-600 font-black text-[10px] uppercase tracking-widest italic">
                                Export Excel
                            </Button>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white dark:bg-slate-900 text-[9px] uppercase tracking-widest text-gray-400 font-black">
                                        <th className="px-8 py-4">ID & Date</th>
                                        <th className="px-8 py-4">Project Entity</th>
                                        <th className="px-8 py-4">Amount</th>
                                        <th className="px-8 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                     {(fundRequests || []).map((req) => (
                                         <tr key={req._id || req.id} onClick={() => { setSelectedRequest(req); setShowDetailsModal(true); }} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer group">
                                             <td className="px-8 py-6">
                                                 <p className="text-[10px] font-black text-slate-400 italic">#{req._id.substring(req._id.length - 6)}</p>
                                                 <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase italic mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                                             </td>
                                             <td className="px-8 py-6">
                                                 <p className="text-[11px] font-black text-slate-600 dark:text-gray-300 italic uppercase">{req.projectTitle}</p>
                                                 <p className="text-[9px] font-bold text-gray-400 tracking-tighter mt-1">{req.purpose}</p>
                                             </td>
                                             <td className="px-8 py-6">
                                                 <p className="text-sm font-black text-maroon-600 italic">{formatCurrency(req.requestedAmount)}</p>
                                             </td>
                                             <td className="px-8 py-6 text-right">
                                                 <Badge className={`border-0 text-[10px] font-black italic px-3 py-1 rounded-full ${
                                                     ['FUND_APPROVED', 'BILLS_UPLOADED', 'CHEQUE_RELEASED', 'AMOUNT_DISBURSED', 'APPROVED'].includes(req.status) ? 'bg-emerald-50 text-emerald-600' : 
                                                     req.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                                     'bg-blue-50 text-blue-600'
                                                 }`}>
                                                     {req.currentStage || req.status}
                                                 </Badge>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            {selectedProject && nextInstallment && (
                <FundRequestModal
                    isOpen={isModalOpen && requestMode === 'RELEASE'}
                    onClose={() => setIsModalOpen(false)}
                    project={selectedProject}
                    nextInstallment={nextInstallment}
                    maxClaimableAmount={remainingAmount}
                    onSubmit={async (data) => {
                        try {
                            setIsSubmitting(true);
                            await createRequest({
                                projectTitle: selectedProject.title,
                                projectRef: selectedProject._id,
                                requestedAmount: data.amount,
                                purpose: data.purpose,
                                source: selectedProject.fundingSource || 'INSTITUTIONAL'
                            });
                            
                            addNotification({
                                role: 'ADMIN',
                                type: 'finance',
                                message: `Fund Request for ${selectedProject.title}`,
                                actionUrl: '/admin/fund-requests'
                            });
                            
                            setIsModalOpen(false);
                        } catch (err) {
                            console.error(err);
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                />
            )}
 
            <InitialFundRequestModal
                isOpen={isModalOpen && requestMode === 'INITIAL'}
                onClose={() => setIsModalOpen(false)}
                onSubmit={async (data) => {
                    try {
                        setIsSubmitting(true);
                        await createRequest({
                            projectTitle: data.title,
                            requestedAmount: data.amount,
                            purpose: data.reason,
                            source: data.fundSource === 'PFMS' ? 'PFMS' : 'INSTITUTIONAL'
                        });
;
                        
                        addNotification({
                            role: 'ADMIN',
                            type: 'finance',
                            message: `New Grant Request for ${data.title}`,
                            actionUrl: '/admin/fund-requests'
                        });
                        
                        setIsModalOpen(false);
                    } catch (err) {
                        console.error(err);
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
            />

            {/* Detailed View Modal */}
            {showDetailsModal && selectedRequest && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-10 w-full max-w-2xl shadow-2xl mx-auto overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Fund Request Details</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mt-1">Request ID: #{ (selectedRequest._id || selectedRequest.id).substring(0, 12) }</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Project & Status</p>
                                    <p className="text-sm text-white font-bold italic mb-2 uppercase">{selectedRequest.projectTitle}</p>
                                    <div className="flex items-center gap-3">
                                        <Badge className={`px-3 py-1 font-black italic uppercase text-[10px] border ${
                                            selectedRequest.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                            selectedRequest.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>{selectedRequest.status}</Badge>
                                        <Badge className="bg-slate-800 text-slate-400 border-white/10 px-3 py-1 font-black italic uppercase text-[10px]">{selectedRequest.source}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Financial Target</p>
                                    <p className="text-2xl font-black italic text-maroon-500 tracking-tighter">{formatCurrency(selectedRequest.requestedAmount)}</p>
                                    <p className="text-[10px] font-black uppercase text-slate-400 italic mt-1">Submitted: {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Purpose & Justification</p>
                                    <p className="text-sm text-slate-200 font-bold italic leading-relaxed">{selectedRequest.purpose}</p>
                                </div>
                                {selectedRequest.remarks && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic mb-1">Admin Audit Feedback</p>
                                        <p className="text-sm text-amber-100/70 italic leading-relaxed">{selectedRequest.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] mb-10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                    <History className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic">Disbursement Pipeline</p>
                                    <p className="text-sm text-white font-bold italic uppercase">{selectedRequest.currentStage || 'PENDING INITIAL AUDIT'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`flex-1 h-1.5 rounded-full ${selectedRequest.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-white/10'}`}></div>
                                <div className={`flex-1 h-1.5 rounded-full ${['FUND_APPROVED', 'BILLS_UPLOADED', 'CHEQUE_RELEASED', 'AMOUNT_DISBURSED'].includes(selectedRequest.currentStage) ? 'bg-indigo-500' : 'bg-white/10'}`}></div>
                                <div className={`flex-1 h-1.5 rounded-full ${['BILLS_UPLOADED', 'AMOUNT_DISBURSED', 'CHEQUE_RELEASED'].includes(selectedRequest.currentStage) ? 'bg-indigo-400' : 'bg-white/10'}`}></div>
                                <div className={`flex-1 h-1.5 rounded-full ${selectedRequest.currentStage === 'AMOUNT_DISBURSED' ? 'bg-amber-500' : 'bg-white/10'}`}></div>
                            </div>
                        </div>

                        {selectedRequest.status === 'APPROVED' && selectedRequest.currentStage === 'FUND_APPROVED' && (
                            <div className="mb-10 p-6 bg-slate-800 border border-slate-700 rounded-xl">
                                <h4 className="text-white font-bold mb-2">Upload Payment Proofs / Bills</h4>
                                <p className="text-slate-400 text-xs mb-4">Please provide a URL to your uploaded bills/proofs (e.g., Google Drive link) so Finance can verify and disburse.</p>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Enter Bill URL here..." 
                                        value={billUploadUrl}
                                        onChange={(e) => setBillUploadUrl(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-maroon-500 transition-colors"
                                    />
                                    <Button 
                                        onClick={handleUploadBills} 
                                        disabled={!billUploadUrl.trim() || isSubmitting}
                                        className="bg-maroon-600 hover:bg-maroon-700 text-white font-bold px-6 py-3 rounded-lg"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Submit Bills
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                            <div className="mb-10 p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                <h4 className="text-white font-bold mb-3 text-sm">Attached Documents</h4>
                                <ul className="space-y-2">
                                    {selectedRequest.documents.map((doc, idx) => (
                                        <li key={idx} className="flex flex-col">
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center underline">
                                                <FileText className="w-3 h-3 mr-1" />
                                                {doc.name || 'Document'}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <Button onClick={() => {setShowDetailsModal(false); setBillUploadUrl('')}} className="w-full h-16 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic border border-white/10">
                            Close Context
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyRequestFunds;
