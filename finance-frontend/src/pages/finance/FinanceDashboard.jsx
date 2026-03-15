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

const FinanceDashboard = () => {
    const { setLayout } = useLayout();
    const [selectedProject, setSelectedProject] = useState(null);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });



    React.useEffect(() => {
        setLayout("Finance Dashboard", "Fund releases, PFMS tracking & settlements");
    }, [setLayout]);

    const stats = [
        {
            title: 'Pending Releases',
            value: '0',
            subtitle: 'Awaiting fund release',
            icon: DollarSign,
            color: 'bg-yellow-50 text-yellow-600',
            iconBg: 'bg-yellow-100'
        },
        {
            title: 'Pending Disbursements',
            value: '0',
            subtitle: 'Cheques to be credited',
            icon: FileText,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100'
        },
        {
            title: 'Pending Settlements',
            value: '1',
            subtitle: 'Awaiting closure',
            icon: Clock,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100'
        },
        {
            title: 'Internship Fees',
            value: '2',
            subtitle: 'Payments pending',
            icon: Users,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100'
        },
    ];

    const fundFlowProjects = [
        {
            id: 1,
            title: 'AI-Powered Healthcare Diagnostics System',
            pi: 'Dr. Priya Sharma',
            department: 'Department of Science & Technology (DST)',
            amount: '₹25.0L',
            status: 'AMOUNT_DISBURSED',
            statusLabel: 'AMOUNT DISBURSED'
        },
        {
            id: 2,
            title: 'Sustainable Energy Solutions for Rural Areas',
            pi: 'Dr. Arun Venkatesh',
            department: 'Ministry of New & Renewable Energy (MNRE)',
            amount: '₹48.0L',
            status: 'FUND_RELEASED',
            statusLabel: 'FUND RELEASED'
        },
        {
            id: 3,
            title: 'IoT-Based Smart Agriculture Monitoring',
            pi: 'Dr. Meena Krishnan',
            department: 'Indian Council of Agricultural Research (ICAR)',
            amount: '₹18.0L',
            status: 'UTILIZATION_COMPLETED',
            statusLabel: 'UTILIZATION COMPLETED'
        },
    ];

    const internshipPayments = [
        { id: 1, name: 'Rahul Krishnamurthy', internship: 'AI Research Lab Internship', amount: '₹15,000', status: 'paid' },
        { id: 2, name: 'Ananya Sharma', internship: 'IoT Development Internship', amount: '₹12,000', status: 'pending' },
        { id: 3, name: 'Vikram Patel', internship: 'Machine Learning Internship', amount: '₹15,000', status: 'pending' },
        { id: 4, name: 'Divya Rajan', internship: 'Renewable Energy Research Internship', amount: '₹10,000', status: 'paid' },
    ];

    const pfmsTransactions = [
        {
            id: 'DST-2024-AIHD-001',
            organization: 'Department of Science & Technology',
            sanctionOrder: 'DST/CS/2024/0125',
            sanctionDate: '10 Mar 2024',
            installment: 1,
            amount: '₹10,00,000',
            creditDate: '25 Mar 2024',
            utr: 'UTR20240325000012345',
            transactionId: 'TXN-DST-001-2024',
            status: 'Submitted'
        },
        {
            id: 'DST-2024-AIHD-001',
            organization: 'Department of Science & Technology',
            sanctionOrder: 'DST/CS/2024/0256',
            sanctionDate: '15 Sept 2024',
            installment: 2,
            amount: '₹7,50,000',
            creditDate: '28 Sept 2024',
            utr: 'UTR20240928000045678',
            transactionId: 'TXN-DST-002-2024',
            status: 'Pending'
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
                                        {fundFlowProjects.map((project) => (
                                            <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900">{project.title}</h3>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {project.pi} • {project.department}
                                                        </p>
                                                    </div>
                                                    <Badge className={`${project.status === 'AMOUNT_DISBURSED' ? 'bg-green-100 text-green-700' :
                                                        project.status === 'FUND_RELEASED' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {project.statusLabel}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                                    <span className="text-sm font-semibold text-gray-700">{project.amount}</span>

                                                </div>
                                            </div>
                                        ))}
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
                                        {pfmsTransactions.map((transaction, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500">PFMS Project ID</p>
                                                        <p className="font-bold text-gray-900">{transaction.id}</p>
                                                    </div>
                                                    <Badge className={transaction.status === 'Submitted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>
                                                        {transaction.status}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 text-xs flex items-center">
                                                            <Building className="w-3 h-3 mr-1" /> Organization
                                                        </p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.organization}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Sanction Order</p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.sanctionOrder}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Sanction Date</p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.sanctionDate}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Installment No.</p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.installment}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Amount Released</p>
                                                        <p className="font-bold text-green-600 mt-1">{transaction.amount}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Credit Date</p>
                                                        <p className="font-medium text-gray-900 mt-1">{transaction.creditDate}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                                    <div>
                                                        <p className="text-gray-500 text-xs">UTR Number</p>
                                                        <p className="font-mono text-xs text-gray-900 mt-1">{transaction.utr}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Transaction ID</p>
                                                        <p className="font-mono text-xs text-gray-900 mt-1">{transaction.transactionId}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
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
                                        {internshipPayments.map((payment) => (
                                            <div key={payment.id} className="border border-gray-200 dark:border-slate-800 rounded-lg p-3">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{payment.name}</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{payment.internship}</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{payment.amount}</p>
                                                    </div>
                                                    {payment.status === 'paid' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
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
