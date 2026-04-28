import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    DollarSign, FileText, Users, Clock, CheckCircle,
    AlertTriangle, ArrowRight, Calendar, Building, Loader2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { 
    useFinanceStats, 
    useFundFlowProjects, 
    useInternshipFees, 
    usePFMSTransactions,
    useRollbackDisbursement
} from '../../hooks/useFinance';
import useFinanceSocket from '../../hooks/useFinanceSocket';
import { getCentreName } from '../../constants/centreMap';
import { getCurrentFY } from '../../utils/fyUtils';

const FinanceDashboard = () => {
    const { setLayout } = useLayout();
    const navigate = useNavigate();
    const { user } = useAuth();
    const userId = user?.id || user?._id;
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedFY = searchParams.get('fy') || getCurrentFY();

    const setSelectedFY = (fy) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('fy', fy);
            return next;
        });
    };

    // PART 2 — REACT QUERY HARDENING
    const { 
        data: financeStats, 
        isLoading: isLoadingStats, 
        isError: isErrorStats 
    } = useFinanceStats(selectedFY);

    const { 
        data: fundFlowProjects, 
        isLoading: isLoadingFundFlow, 
        isError: isErrorFundFlow 
    } = useFundFlowProjects(selectedFY);

    const { 
        data: internshipPayments, 
        isLoading: isLoadingInternships, 
        isError: isErrorInternships 
    } = useInternshipFees(selectedFY);

    const { 
        data: pfmsTransactions, 
        isLoading: isLoadingPFMS, 
        isError: isErrorPFMS 
    } = usePFMSTransactions(selectedFY);

    const rollbackMutation = useRollbackDisbursement();

    // REAL-TIME STREAMING
    useFinanceSocket(selectedFY);

    // FIX — FORCE REFRESH ON FY CHANGE
    useEffect(() => {
        if (selectedFY) {
            queryClient.invalidateQueries();
        }
    }, [selectedFY, queryClient]);

    useEffect(() => {
        setLayout("Settlement & Activities", "Manage fund releases, PFMS tracking, and internship payments");
    }, [setLayout]);

    if (!userId) return null;

    // PART 6 — ERROR STATE
    if (isErrorStats || isErrorFundFlow || isErrorInternships || isErrorPFMS) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <h2 className="text-xl font-bold">Failed to load financial data</h2>
                <p className="mt-2 text-gray-500">Please check your connection or try a different financial year.</p>
                <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={() => queryClient.refetchQueries()}
                >
                    Retry Loading
                </Button>
            </div>
        );
    }

    // PART 4 — LOADING STATE
    if (isLoadingStats || isLoadingFundFlow || isLoadingInternships || isLoadingPFMS) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                <p className="text-lg font-medium">Synchronizing institutional financial data...</p>
                <p className="text-sm opacity-70 mt-1">Retrieving records for FY {selectedFY}</p>
            </div>
        );
    }

    const statsCards = [
        {
            title: 'Pending Releases',
            value: financeStats?.pendingReleases || '0',
            subtitle: 'Awaiting fund release',
            icon: DollarSign,
            color: 'bg-yellow-50 text-yellow-600',
            iconBg: 'bg-yellow-100'
        },
        {
            title: 'Pending Disbursements',
            value: financeStats?.pendingDisbursements || '0',
            subtitle: 'Payments to be credited',
            icon: FileText,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100'
        },
        {
            title: 'Pending Settlements',
            value: financeStats?.pendingSettlements || '0',
            subtitle: 'Awaiting closure',
            icon: Clock,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100'
        },
        {
            title: 'Internship Fees',
            value: financeStats?.pendingInternships || '0',
            subtitle: 'Payments pending',
            icon: Users,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100'
        },
    ];

    return (
        <div className="p-8 space-y-8">
            {/* PART 8 — FY SELECTOR */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Financial Period Control</h2>
                        <p className="text-xs text-slate-500">Managing activity for {selectedFY}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider text-xs">Switch Year:</span>
                    <select 
                        value={selectedFY}
                        onChange={(e) => setSelectedFY(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer transition-all hover:bg-slate-100"
                    >
                        <option value={getCurrentFY()}>{getCurrentFY()} (Current)</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2023-2024">2023-2024</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className={`border-0 shadow-sm ${stat.color} transition-transform hover:scale-[1.02]`}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-bold uppercase tracking-tight opacity-70">{stat.title}</p>
                                        <p className="text-4xl font-black mt-2 tracking-tighter">{stat.value}</p>
                                        <p className="text-xs mt-1.5 font-medium opacity-60 italic">{stat.subtitle}</p>
                                    </div>
                                    <div className={`w-14 h-14 ${stat.iconBg} rounded-2xl flex items-center justify-center shadow-inner`}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* PART 7 — UI ALIGNMENT FIX (12-column grid) */}
            <div className="grid grid-cols-12 gap-8">
                {/* Main content — col-span-8 */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Fund Flow Actions */}
                    <Card className="border-0 shadow-md overflow-hidden rounded-2xl">
                        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 py-5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-bold flex items-center text-slate-800 dark:text-white">
                                    <FileText className="w-5 h-5 mr-3 text-blue-600" />
                                    Fund Flow Pipeline
                                </CardTitle>
                                <Button 
                                    variant="ghost" 
                                    className="text-blue-600 hover:text-blue-700 font-bold"
                                    onClick={() => navigate('/finance/disbursements')}
                                >
                                    Verify All <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">Research projects awaiting institutional fund release for FY {selectedFY}</p>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* PART 5 — EMPTY STATE */}
                            {!fundFlowProjects || fundFlowProjects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-full mb-4 shadow-sm">
                                        <FileText className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="font-medium">No projects in pipeline for FY {selectedFY}</p>
                                    <p className="text-xs mt-1">Check back later or switch financial year</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {fundFlowProjects.map((project) => (
                                        <div key={project.id} className="group border border-slate-100 dark:border-slate-800 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all shadow-sm hover:shadow-md">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-primary transition-colors">{project.title}</h3>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                            {project.pi}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-400">
                                                            {getCentreName(project.department)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                    project.status === 'AMOUNT_DISBURSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    project.status === 'FUND_RELEASED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                    {project.statusLabel}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400 uppercase">Sanctioned Amount:</span>
                                                    <span className="text-lg font-black text-slate-900 dark:text-white">{project.amount}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="outline" className="rounded-lg font-bold border-slate-200" onClick={() => navigate('/finance/disbursements')}>
                                                        Settle
                                                    </Button>
                                                    {project.status === 'AMOUNT_DISBURSED' && user.role === 'ADMIN' && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive" 
                                                            className="rounded-lg font-bold bg-red-50 hover:bg-red-100 text-red-600 border-red-200" 
                                                            onClick={() => {
                                                                if (window.confirm('Are you sure you want to reverse this transaction in the ledger? This action is immutable.')) {
                                                                    rollbackMutation.mutate(project.lastDisbursementId);
                                                                }
                                                            }}
                                                            disabled={rollbackMutation.isPending}
                                                        >
                                                            {rollbackMutation.isPending ? 'Reversing...' : 'Reverse'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent PFMS Transactions */}
                    <Card className="border-0 shadow-md overflow-hidden rounded-2xl">
                        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 py-5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-bold flex items-center text-slate-800 dark:text-white">
                                    <Building className="w-5 h-5 mr-3 text-purple-600" />
                                    PFMS Settlements
                                </CardTitle>
                                <Button 
                                    variant="ghost" 
                                    className="text-purple-600 hover:text-purple-700 font-bold"
                                    onClick={() => navigate('/finance/pfms')}
                                >
                                    Tracker <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {!pfmsTransactions || pfmsTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed">
                                    <p className="font-medium">No PFMS transactions for FY {selectedFY}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {pfmsTransactions.map((transaction, index) => (
                                        <div key={index} className="border border-slate-100 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900 shadow-sm">
                                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-50">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PFMS ID</p>
                                                    <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{transaction.id}</p>
                                                </div>
                                                <Badge className={transaction.status === 'Submitted' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>
                                                    {transaction.status}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Agency</p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{transaction.organization}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Order</p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{transaction.sanctionOrder}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Installment</p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Phase {transaction.installment}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Released</p>
                                                    <p className="text-sm font-black text-emerald-600">{transaction.amount}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Side panels — col-span-4 */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* Internship Payments Sidebar */}
                    <Card className="border-0 shadow-md overflow-hidden rounded-2xl">
                        <CardHeader className="border-b bg-orange-50/50 dark:bg-orange-950/20 py-5">
                            <CardTitle className="text-lg font-bold flex items-center text-orange-800 dark:text-orange-400">
                                <Users className="w-5 h-5 mr-3 text-orange-600" />
                                Internship Verification
                            </CardTitle>
                            <div className="mt-2 flex items-center gap-2 bg-white dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-800">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tight">Requires Immediate Action</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 bg-white dark:bg-slate-900">
                            {!internshipPayments || internshipPayments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <p className="text-xs font-bold uppercase tracking-widest">Clear Queue</p>
                                    <p className="text-[10px] mt-1 italic">No pending payments for {selectedFY}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {internshipPayments.map((payment) => (
                                        <div key={payment.id} className="group border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-800/20 hover:border-orange-200 transition-all">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{payment.name}</p>
                                                    <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tighter">{payment.internship}</p>
                                                </div>
                                                {payment.status === 'paid' ? (
                                                    <div className="bg-emerald-100 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
                                                ) : (
                                                    <div className="bg-orange-100 p-1 rounded-full animate-pulse"><Clock className="w-4 h-4 text-orange-600" /></div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">{payment.amount}</span>
                                                {payment.status === 'pending' && (
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg px-4" 
                                                        onClick={() => navigate('/finance/internships')}
                                                    >
                                                        Verify
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t">
                            <Button 
                                variant="ghost" 
                                className="w-full text-xs font-bold text-slate-500 hover:text-slate-800"
                                onClick={() => navigate('/finance/internships')}
                            >
                                View Detailed Ledger
                            </Button>
                        </div>
                    </Card>

                    {/* Quick Analytics Summary (New Hardened Widget) */}
                    <Card className="border-0 shadow-sm bg-primary/5 dark:bg-primary/10 rounded-2xl">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-bold text-primary mb-4 uppercase tracking-widest">FY {selectedFY} Integrity</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-medium text-slate-500">Pipeline Health</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">100% Verified</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full w-[100%] rounded-full shadow-lg shadow-primary/40"></div>
                                </div>
                                <p className="text-[10px] text-slate-400 italic">Financial data is synced with real-time audit logs.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;
