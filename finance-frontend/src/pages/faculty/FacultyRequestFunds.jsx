import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    History, ChevronRight, PlusCircle, Wallet, Activity, DollarSign,
    CheckCircle, Clock, Banknote, ArrowRight
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { usePipeline } from '../../contexts/PipelineContext';
import InstallmentStepper from '../../components/faculty/InstallmentStepper';
import FundRequestModal from '../../components/faculty/FundRequestModal';
import InitialFundRequestModal from '../../components/faculty/InitialFundRequestModal';

const FacultyRequestFunds = () => {
    const { setLayout } = useLayout();

    React.useEffect(() => {
        setLayout("Fund & Asset Management", "Strategic disbursement oversight and grant lifecycle tracking");
    }, [setLayout]);

    const { projects, fundRequests, createRequest, isLoading } = usePipeline();
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestMode, setRequestMode] = useState('RELEASE');

    useEffect(() => {
        if (projects?.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0]._id);
        }
    }, [projects, selectedProjectId]);

    const selectedProject = projects?.find(p => p._id === selectedProjectId);
    
    // Adapted installment logic
    const installments = [
        { phase: 1, amount: (selectedProject?.sanctionedBudget || 0) * 0.4, status: 'RELEASED', date: 'Shared' },
        { phase: 2, amount: (selectedProject?.sanctionedBudget || 0) * 0.3, status: 'PENDING', date: null },
    ];

    const nextInstallment = installments.find(i => i.status === 'PENDING' || i.status === 'UPCOMING');
    
    const releasedAmount = selectedProject?.releasedBudget || 0;
    const remainingAmount = (selectedProject?.sanctionedBudget || 0) - releasedAmount;

    if (isLoading) return <div className="p-8 text-center text-maroon-600 font-bold">Initiating Pipeline...</div>;

    return (
        <div className="p-6 space-y-10">
            {/* Quick Summary Cards - Admin Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/30">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Total Sanctioned</p>
                                <p className="text-3xl font-bold mt-2">₹{((selectedProject?.sanctionedBudget || 0) / 100000).toFixed(1)}L</p>
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
                                <p className="text-3xl font-bold mt-2">₹{(releasedAmount / 100000).toFixed(1)}L</p>
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
                                <p className="text-3xl font-bold mt-2">₹{(remainingAmount / 100000).toFixed(1)}L</p>
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
                                        REM: ₹{(((project.sanctionedBudget || 0) - (project.releasedBudget || 0)) / 100000).toFixed(1)}L
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
                                <div className="w-16 h-16 bg-maroon-50 text-maroon-600 rounded-2xl flex items-center justify-center">
                                    <Activity className="w-8 h-8" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-10">
                                <InstallmentStepper
                                    installments={installments}
                                    currentPhase={nextInstallment?.phase || 0}
                                />
                                <div className="mt-12 flex flex-col items-center text-center space-y-6">
                                    <div className="max-w-md">
                                        <h4 className="text-xl font-bold text-slate-800 italic uppercase tracking-tighter">Request Disbursement</h4>
                                        <p className="text-sm font-medium italic text-gray-400 mt-2">Submit your progress report and expense justification to trigger the next phase release.</p>
                                    </div>
                                    <Button
                                        disabled={!nextInstallment || nextInstallment.status === 'PENDING'}
                                        onClick={() => { setRequestMode('RELEASE'); setIsModalOpen(true); }}
                                        className="h-16 px-12 bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-maroon-600/20 hover:scale-105 transition-all flex items-center gap-3"
                                    >
                                        {nextInstallment?.status === 'PENDING' ? 'Request Under Review' : 'Process Next Phase'}
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* History Table */}
                    <Card className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-gray-50 dark:bg-slate-800/50 p-6 border-b dark:border-slate-800">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-500 italic">Disbursement History</CardTitle>
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
                                         <tr key={req._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                             <td className="px-8 py-6">
                                                 <p className="text-[10px] font-black text-slate-400 italic">#{req._id.substring(req._id.length - 6)}</p>
                                                 <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase italic mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                                             </td>
                                             <td className="px-8 py-6">
                                                 <p className="text-[11px] font-black text-slate-600 dark:text-gray-300 italic uppercase">{req.projectTitle}</p>
                                                 <p className="text-[9px] font-bold text-gray-400 tracking-tighter mt-1">{req.purpose}</p>
                                             </td>
                                             <td className="px-8 py-6">
                                                 <p className="text-sm font-black text-maroon-600 italic">₹{(req.requestedAmount / 100000).toFixed(1)}L</p>
                                             </td>
                                             <td className="px-8 py-6 text-right">
                                                 <Badge className={`border-0 text-[10px] font-black italic px-3 py-1 rounded-full ${
                                                     req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
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
                            await createRequest({
                                projectTitle: selectedProject.title,
                                projectRef: selectedProject._id,
                                requestedAmount: data.amount,
                                purpose: data.purpose,
                                source: selectedProject.fundingSource === 'PFMS' ? 'PFMS' : 'DIRECTOR_INNOVATION'
                            });
                            setIsModalOpen(false);
                        } catch (err) {
                            alert('Request submission failed');
                        }
                    }}
                />
            )}

            <InitialFundRequestModal
                isOpen={isModalOpen && requestMode === 'INITIAL'}
                onClose={() => setIsModalOpen(false)}
                onSubmit={async (data) => {
                    try {
                        await createRequest({
                            projectTitle: data.title,
                            requestedAmount: data.amount,
                            purpose: data.reason,
                            source: data.fundSource === 'PFMS' ? 'PFMS' : 'DIRECTOR_INNOVATION'
                        });
                        setIsModalOpen(false);
                    } catch (err) {
                        alert('Request submission failed');
                    }
                }}
            />
        </div>
    );
};

export default FacultyRequestFunds;
