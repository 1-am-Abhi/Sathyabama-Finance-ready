import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    History, ChevronRight, PlusCircle, Wallet, Activity, DollarSign
} from 'lucide-react';
import TopBar from '../../components/shared/TopBar';
import InstallmentStepper from '../../components/faculty/InstallmentStepper';
import FundRequestModal from '../../components/faculty/FundRequestModal';
import InitialFundRequestModal from '../../components/faculty/InitialFundRequestModal';

const FacultyRequestFunds = () => {
    // 1. Mock Data for Projects
    // Only active projects (installments > 0) are tracked here for the 'Ongoing' section.
    // 'New Requests' will just go into history and hypothetically create new projects.
    const [projects, setProjects] = useState([
        {
            id: 'PROJ-001',
            title: 'AI-Powered Healthcare Diagnostics System',
            totalBudget: 5000000,
            currentBalance: 15400, // Low balance
            installments: [
                { phase: 1, amount: 1000000, status: 'RELEASED', date: '15 Jan 2024' },
                { phase: 2, amount: 1000000, status: 'RELEASED', date: '12 Apr 2024' },
                { phase: 3, amount: 1000000, status: 'PENDING', date: null },
                { phase: 4, amount: 1000000, status: 'UPCOMING', date: null },
                { phase: 5, amount: 1000000, status: 'UPCOMING', date: null }
            ],
            status: 'ACTIVE'
        },
        {
            id: 'PROJ-002',
            title: 'Machine Learning for Predictive Analytics',
            totalBudget: 3500000,
            currentBalance: 450000,
            installments: [
                { phase: 1, amount: 800000, status: 'RELEASED', date: '10 Feb 2024' },
                { phase: 2, amount: 900000, status: 'UPCOMING', date: null },
                { phase: 3, amount: 900000, status: 'UPCOMING', date: null },
                { phase: 4, amount: 900000, status: 'UPCOMING', date: null }
            ],
            status: 'ACTIVE'
        }
    ]);

    const activeProjects = projects; // All projects in this list are considered active/ongoing

    const [selectedProjectId, setSelectedProjectId] = useState(activeProjects[0]?.id);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestMode, setRequestMode] = useState('RELEASE'); // 'RELEASE' (Next Installment) or 'INITIAL' (New Request)

    // Mock History
    const [requestHistory, setRequestHistory] = useState([
        {
            id: 'REQ-882',
            projectId: 'PROJ-001',
            projectTitle: 'AI Healthcare Diagnostics',
            type: 'INSTALLMENT_RELEASE',
            phase: 2,
            amount: 1000000,
            status: 'APPROVED',
            date: '12 Apr 2024',
        },
        {
            id: 'REQ-412',
            projectId: 'PROJ-002',
            projectTitle: 'ML Predictive Analytics',
            type: 'INITIAL_GRANT',
            phase: 1,
            amount: 800000,
            status: 'APPROVED',
            date: '10 Feb 2024',
        }
    ]);

    const selectedProject = activeProjects.find(p => p.id === selectedProjectId);
    const nextInstallment = selectedProject?.installments.find(i => i.status === 'PENDING' || i.status === 'UPCOMING');
    // Low Balance Threshold Configuration
    const LOW_BALANCE_THRESHOLD = 200000;

    // Financial Calculations for "Funding Summary Card"
    const releasedAmount = selectedProject?.installments
        .filter(i => i.status === 'RELEASED')
        .reduce((sum, i) => sum + i.amount, 0) || 0;

    const remainingAmount = (selectedProject?.totalBudget || 0) - releasedAmount;
    const installmentsCompleted = selectedProject?.installments.filter(i => i.status === 'RELEASED').length || 0;
    const totalInstallments = selectedProject?.installments.length || 0;

    // Logic: Balance is "low" if remaining funds <= threshold
    const isBalanceLow = remainingAmount <= LOW_BALANCE_THRESHOLD && remainingAmount > 0;

    const handleNextInstallmentSubmit = (data) => {
        const newRequest = {
            id: `REQ-${Math.floor(Math.random() * 1000)}`,
            projectId: data.projectId,
            projectTitle: selectedProject.title,
            type: 'INSTALLMENT_RELEASE',
            phase: data.installmentNo,
            amount: data.amount,
            fundSource: data.fundSource, // Process New Field
            status: 'PENDING',
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        };
        setRequestHistory([newRequest, ...requestHistory]);

        // Update local state to show 'PENDING'
        const updatedProjects = projects.map(p => {
            if (p.id === data.projectId) {
                const updatedUnits = p.installments.map(inst =>
                    inst.phase === data.installmentNo ? { ...inst, status: 'PENDING' } : inst
                );
                return { ...p, installments: updatedUnits };
            }
            return p;
        });
        setProjects(updatedProjects);
    };

    const handleInitialRequestSubmit = (data) => {
        // data contains: title, type, description, totalBudget, amount, reason, usagePlan, expectedOutcome
        const newRequest = {
            id: `REQ-${Math.floor(Math.random() * 1000)}`,
            projectId: 'NEW', // New projects don't have an ID yet
            projectTitle: data.title,
            type: 'INITIAL_GRANT',
            phase: 1,
            amount: parseInt(data.amount) || 0,
            fundSource: data.fundSource, // Process New Field
            status: 'PENDING', // Initial requests go to Admin for approval
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        };
        setRequestHistory([newRequest, ...requestHistory]);
    };

    return (
        <div className="min-h-full">
            <TopBar title="Fund & Asset Management" subtitle="Strategic disbursement of institutional grants" />

            <div className="p-8 max-w-7xl mx-auto space-y-12">

                {/* SECTION 1: NEW FUND REQUEST (MANUAL) */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">New Grant Application</h2>
                            <p className="text-sm text-gray-500 font-medium mt-1">Submit proposals for new research projects, books, or publications.</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <h3 className="text-xl font-bold mb-2">Need funding for a new initiative?</h3>
                                <p className="text-emerald-100/80 text-sm max-w-xl">
                                    Faculty members can request initial grants for starting new research work, publishing books, or attending conferences.
                                </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setRequestMode('INITIAL');
                                    setIsModalOpen(true);
                                }}
                                className="h-14 px-8 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2"
                            >
                                <PlusCircle className="w-5 h-5" />
                                Apply for New Fund
                            </Button>
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200 dashed" />

                {/* SECTION 2: ONGOING PROJECTS (NEXT INSTALLMENT) */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Active Projects Portfolio</h2>
                            <p className="text-sm text-gray-500 font-medium mt-1">Track utilization and request subsequent installments for ongoing work.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Project Navigator (Sidebar for Action 2) */}
                        <div className="lg:col-span-1 space-y-8">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Ongoing Projects</h4>
                                <div className="space-y-4">
                                    {activeProjects.map((project) => {
                                        const pReleased = project.installments.filter(i => i.status === 'RELEASED').reduce((s, i) => s + i.amount, 0);
                                        const pRemaining = project.totalBudget - pReleased;
                                        const isLow = pRemaining <= LOW_BALANCE_THRESHOLD && pRemaining > 0;

                                        return (
                                            <button
                                                key={project.id}
                                                onClick={() => setSelectedProjectId(project.id)}
                                                className={`w-full text-left p-6 rounded-3xl transition-all border ${selectedProjectId === project.id
                                                    ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                                                    : 'border-transparent hover:bg-gray-50'
                                                    }`}
                                            >
                                                <p className={`text-sm font-bold truncate ${selectedProjectId === project.id ? 'text-blue-900' : 'text-gray-600'}`}>
                                                    {project.title}
                                                </p>
                                                <div className="flex items-center justify-between mt-3 gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-gray-900 text-white text-[8px] font-bold px-2 py-0.5 border-0">#{project.id}</Badge>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Rem: ₹{(pRemaining / 1000).toFixed(0)}K</span>
                                                    </div>
                                                    {isLow && (
                                                        <Badge className="bg-orange-100 text-orange-600 text-[8px] font-bold px-2 py-0.5 border-0 animate-pulse">
                                                            Low
                                                        </Badge>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {activeProjects.length === 0 && (
                                        <div className="p-4 text-center text-gray-400 text-xs italic">
                                            No active funded projects found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detail Area for Action 2 */}
                        <div className="lg:col-span-2 space-y-10">
                            {selectedProject ? (
                                <Card className="border-0 shadow-sm bg-white rounded-[3rem] overflow-hidden relative">
                                    {/* Action 2: Funding Summary Card */}
                                    <div className="p-12 border-b border-gray-50 bg-gray-50/30">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-3 bg-white rounded-2xl shadow-sm">
                                                <Wallet className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight max-w-xl">
                                                    {selectedProject.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Financial Overview</span>
                                                    <span className="text-xs font-bold text-gray-300">•</span>
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                                                        {installmentsCompleted} / {totalInstallments ? totalInstallments : '?'} Installments
                                                    </span>
                                                    {isBalanceLow && (
                                                        <Badge className="ml-2 bg-orange-100 text-orange-700 border-0 text-[10px] font-bold px-2 py-0.5">
                                                            Low Balance Warning
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6 mb-10">
                                            <div className="p-6 bg-white rounded-3xl border border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Approved</p>
                                                <p className="text-2xl font-bold text-gray-900">₹{(selectedProject.totalBudget / 100000).toFixed(1)}L</p>
                                            </div>
                                            <div className="p-6 bg-white rounded-3xl border border-gray-100">
                                                <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mb-2">Received</p>
                                                <p className="text-2xl font-bold text-emerald-600">₹{(releasedAmount / 100000).toFixed(1)}L</p>
                                            </div>
                                            <div className={`p-6 rounded-3xl border ${isBalanceLow ? 'bg-orange-50/50 border-orange-100' : 'bg-white border-gray-100'}`}>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isBalanceLow ? 'text-orange-600/60' : 'text-blue-600/60'}`}>Remaining</p>
                                                <p className={`text-2xl font-bold ${isBalanceLow ? 'text-orange-600' : 'text-blue-600'}`}>₹{(remainingAmount / 100000).toFixed(1)}L</p>
                                            </div>
                                        </div>

                                        <InstallmentStepper
                                            installments={selectedProject.installments}
                                            currentPhase={nextInstallment?.phase || 0}
                                        />
                                    </div>

                                    <CardContent className="p-12">
                                        <div className="flex flex-col items-center text-center space-y-8">
                                            <div className="max-w-md">
                                                <h4 className={`text-xl font-bold ${isBalanceLow ? 'text-orange-700' : 'text-gray-900'}`}>
                                                    {remainingAmount > 0
                                                        ? (isBalanceLow ? "Action Required: Final Installment" : "Funds Sufficient")
                                                        : "Grant Fully Utilized"
                                                    }
                                                </h4>
                                                <p className="text-sm text-gray-500 mt-2 font-medium">
                                                    {remainingAmount > 0
                                                        ? (isBalanceLow
                                                            ? "Remaining funds are limited. Please confirm this amount is sufficient to complete or meaningfully continue the work."
                                                            : `Current balance is healthy. Requests enabled as per schedule.`)
                                                        : "All project funds have been released."
                                                    }
                                                </p>
                                            </div>

                                            {/* Action 2 Button: Request Next Installment */}
                                            {remainingAmount > 0 && (
                                                <Button
                                                    disabled={(!nextInstallment || nextInstallment.status === 'PENDING') && !isBalanceLow} // Always allow click if low balance for "Final Installment" flow unless already pending? 
                                                    // Actually stick to standard logic: disable if pending. 
                                                    // "Disable further installment requests after submission" is handled by status='PENDING'
                                                    onClick={() => {
                                                        if (nextInstallment?.status !== 'PENDING') {
                                                            setRequestMode('RELEASE');
                                                            setIsModalOpen(true);
                                                        }
                                                    }}
                                                    className={`h-16 px-12 font-bold text-sm uppercase tracking-widest rounded-2xl transition-all flex items-center gap-3 ${isBalanceLow
                                                        ? 'bg-orange-600 text-white shadow-xl shadow-orange-100 hover:bg-orange-700 hover:scale-[1.02] active:scale-95'
                                                        : 'bg-indigo-900 text-white shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95'
                                                        } ${(nextInstallment?.status === 'PENDING') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {nextInstallment?.status === 'PENDING'
                                                        ? 'Request In Review'
                                                        : (isBalanceLow ? 'Request Final Installment' : 'Request Next Installment')
                                                    }
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-[3rem] border border-dashed border-gray-200 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                                        <DollarSign className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">No Active Grant Selected</h3>
                                    <p className="text-gray-500 mt-2 text-sm max-w-xs">Select a project from the list to view funding details or request the next installment.</p>
                                </div>
                            )}

                            {/* History Ledger */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">Request History</h4>
                                </div>

                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase">Request Details</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase">Project Asset</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {requestHistory.map((req) => (
                                                <tr key={req.id} className="group hover:bg-gray-50/50 transition-all">
                                                    <td className="px-8 py-6">
                                                        <p className="text-xs font-bold text-gray-900">{req.id}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">
                                                            {req.date}
                                                        </p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-xs font-bold text-gray-600 truncate max-w-[200px]">{req.projectTitle}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[10px] text-gray-400">{req.type === 'INITIAL_GRANT' ? 'Initial Grant' : `Phase 0${req.phase}`}</p>
                                                            {req.fundSource && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${req.fundSource === 'PFMS' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                                    {req.fundSource}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-bold text-blue-900">₹{(req.amount / 100000).toFixed(1)}L</p>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <Badge className={`px-4 py-1 rounded-lg border-0 font-bold text-[9px] uppercase ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                                            req.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                                                'bg-blue-50 text-blue-600'
                                                            }`}>
                                                            {req.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>

            {/* Modals for Two Actions */}
            {selectedProject && nextInstallment && (
                <FundRequestModal
                    isOpen={isModalOpen && requestMode === 'RELEASE'}
                    onClose={() => setIsModalOpen(false)}
                    project={selectedProject}
                    nextInstallment={nextInstallment}
                    maxClaimableAmount={remainingAmount}
                    isFinalInstallment={remainingAmount <= LOW_BALANCE_THRESHOLD}
                    onSubmit={handleNextInstallmentSubmit}
                />
            )}

            <InitialFundRequestModal
                isOpen={isModalOpen && requestMode === 'INITIAL'}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleInitialRequestSubmit}
            />
        </div>
    );
};

export default FacultyRequestFunds;
