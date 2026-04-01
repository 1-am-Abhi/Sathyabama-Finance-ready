import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    DollarSign, FileText, Users, Clock, CheckCircle,
    AlertTriangle, ArrowRight, Calendar, Building, Brain
} from 'lucide-react';
import AIResultModal from '../../components/shared/AIResultModal';
import { analyzeInstitutionalFinance } from '../../services/aiService';
import Sidebar from '../../components/shared/Sidebar';
// import TopBar from '../../components/shared/TopBar';
import { useLayout } from '../../contexts/LayoutContext';
import apiClient from '../../api/client';

const FinanceDashboard = () => {
    const { setLayout } = useLayout();
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState({
        pendingReleases: 0,
        pendingDisbursements: 0,
        pendingSettlements: 0,
        pendingInternships: 0
    });
    const [fundFlowData, setFundFlowData] = useState([]);
    const [internshipData, setInternshipData] = useState([]);
    const [pfmsData, setPfmsData] = useState([]);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });



    React.useEffect(() => {
        setLayout("Finance Dashboard", "Fund releases, PFMS tracking & settlements");
        fetchDashboardData();
    }, [setLayout]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, flowRes, internRes, pfmsRes] = await Promise.all([
                apiClient.get('/finance/stats'),
                apiClient.get('/finance/fund-flow'),
                apiClient.get('/finance/internship-fees'),
                apiClient.get('/finance/pfms')
            ]);
            
            setStatsData(statsRes.data.data);
            setFundFlowData(flowRes.data.data);
            setInternshipData(internRes.data.data);
            setPfmsData(pfmsRes.data.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        {
            title: 'Pending Releases',
            value: statsData.pendingReleases,
            subtitle: 'Awaiting fund release',
            icon: DollarSign,
            color: 'bg-yellow-50 text-yellow-600',
            iconBg: 'bg-yellow-100'
        },
        {
            title: 'Pending Disbursements',
            value: statsData.pendingDisbursements,
            subtitle: 'Cheques to be credited',
            icon: FileText,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100'
        },
        {
            title: 'Pending Settlements',
            value: statsData.pendingSettlements,
            subtitle: 'Awaiting closure',
            icon: Clock,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100'
        },
        {
            title: 'Internship Fees',
            value: statsData.pendingInternships,
            subtitle: 'Payments pending',
            icon: Users,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100'
        },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            <div className="flex-1">


                <div className="p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <Card key={index} className={`border-0 ${stat.color}`}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium opacity-80">{stat.title}</p>
                                                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                                                <p className="text-xs mt-1 opacity-70">{stat.subtitle}</p>
                                            </div>
                                            <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>



                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Fund Flow Actions */}
                        <div className="lg:col-span-2">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-semibold flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                            Fund Flow Actions
                                        </CardTitle>
                                        <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                                            View All <ArrowRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Projects requiring finance updates</p>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {fundFlowData.length > 0 ? fundFlowData.map((project) => (
                                            <div key={project._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900">{project.Project?.title || project.projectTitle}</h3>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {project.Project?.piName || project.faculty} • {project.department}
                                                        </p>
                                                    </div>
                                                    <Badge className={`${project.currentStage === 'AMOUNT_DISBURSED' ? 'bg-green-100 text-green-700' :
                                                        project.currentStage === 'FUND_RELEASED' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {project.currentStage?.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                                    <span className="text-sm font-semibold text-gray-700">₹{(project.requestedAmount / 100000).toFixed(1)}L</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-gray-500 text-center py-4">No pending fund flow actions.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent PFMS Transactions */}
                            <Card className="border-0 shadow-sm mt-6">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-semibold flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                            Recent PFMS Transactions
                                        </CardTitle>

                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        <span>Financial Year 2024-25</span>
                                    </div>
                                    <div className="space-y-6">
                                        {pfmsData.length > 0 ? pfmsData.map((transaction, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500">PFMS Project ID</p>
                                                        <p className="font-bold text-gray-900">{transaction.pfmsProjectId}</p>
                                                    </div>
                                                    <Badge className={transaction.ucStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>
                                                        {transaction.ucStatus}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 text-xs flex items-center">
                                                            <Building className="w-3 h-3 mr-1" /> Organization
                                                        </p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.govtOrganization}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Sanction Order</p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.sanctionOrderNo}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Sanction Date</p>
                                                        <p className="font-medium text-gray-900 mt-1">{new Date(transaction.sanctionOrderDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Installment No.</p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.installmentNumber}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Amount Released</p>
                                                        <p className="font-bold text-green-600 mt-1">₹{(transaction.amountReleased / 100000).toFixed(1)}L</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Credit Date</p>
                                                        <p className="font-medium text-gray-900 mt-1">{new Date(transaction.creditDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                                    <div>
                                                        <p className="text-gray-500 text-xs">UTR Number</p>
                                                        <p className="font-mono text-xs text-gray-900 mt-1">{transaction.utrNumber}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-gray-500 text-center py-4">No recorded PFMS transactions.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Internship Payments Sidebar */}
                        <div>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="border-b bg-orange-50 dark:bg-orange-950/20">
                                    <CardTitle className="text-lg font-semibold flex items-center">
                                        <Users className="w-5 h-5 mr-2 text-orange-600" />
                                        Internship Payments
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        {internshipData.length > 0 ? internshipData.slice(0, 4).map((payment) => (
                                            <div key={payment._id} className="border border-gray-200 dark:border-slate-800 rounded-lg p-3">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{payment.studentName}</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{payment.internshipTitle}</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">₹{payment.feeAmount}</p>
                                                    </div>
                                                    {payment.paymentStatus === 'PAID' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                                    )}
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-gray-500 text-center py-4">No internship fees tracked.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Financial Analytics */}
                            <Card className="border-0 shadow-sm mt-6 bg-slate-900 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center text-emerald-400 uppercase tracking-wider">
                                        <Brain className="w-4 h-4 mr-2" />
                                        AI Financial Insights
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase mb-1 underline">Audit Alert</p>
                                        <p className="text-[11px] text-slate-300 italic">
                                            "Mechanical Engineering department shows 22% increase in funding usage. Re-allocation recommended for unused Electronics budget."
                                        </p>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest"
                                        onClick={async () => {
                                            setAiModal({ open: true, loading: true, result: null });
                                            const r = await analyzeInstitutionalFinance();
                                            setAiModal({ open: true, loading: false, result: r });
                                        }}
                                    >
                                        Analyze Budget
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />
        </div>
    );
};

export default FinanceDashboard;
