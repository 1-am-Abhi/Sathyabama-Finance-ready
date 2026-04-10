import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    DollarSign, FileText, Users, Clock, CheckCircle,
    AlertTriangle, ArrowRight, Calendar, Building
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useFinanceStats, useFundFlowProjects, useInternshipFees, usePFMSTransactions } from '../../hooks/useFinance';

const FinanceDashboard = () => {
    const { setLayout } = useLayout();
    const navigate = useNavigate();
    const { user } = useAuth();
    const userId = user?.id || user?._id;
    
    const { data: financeStats = {}, isLoading: isLoadingStats } = useFinanceStats();
    const { data: fundFlowProjects = [], isLoading: isLoadingFundFlow } = useFundFlowProjects();
    const { data: internshipPayments = [], isLoading: isLoadingInternships } = useInternshipFees();
    const { data: pfmsTransactions = [], isLoading: isLoadingPFMS } = usePFMSTransactions();

    useEffect(() => {
        setLayout("Settlement & Activities", "Manage fund releases, PFMS tracking, and internship payments");
    }, [setLayout]);

    if (!userId) return null;

    const stats = [
        {
            title: 'Pending Releases',
            value: financeStats.pendingReleases || '0',
            subtitle: 'Awaiting fund release',
            icon: DollarSign,
            color: 'bg-yellow-50 text-yellow-600',
            iconBg: 'bg-yellow-100'
        },
        {
            title: 'Pending Disbursements',
            value: financeStats.pendingDisbursements || '0',
            subtitle: 'Cheques to be credited',
            icon: FileText,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100'
        },
        {
            title: 'Pending Settlements',
            value: financeStats.pendingSettlements || '0',
            subtitle: 'Awaiting closure',
            icon: Clock,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100'
        },
        {
            title: 'Internship Fees',
            value: financeStats.pendingInternships || '0',
            subtitle: 'Payments pending',
            icon: Users,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100'
        },
    ];

    return (
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
                                        <button 
                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                                            onClick={() => navigate('/finance/disbursements')}
                                        >
                                            View All <ArrowRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Projects requiring finance updates</p>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {(fundFlowProjects || []).map((project) => (
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
                                        <button 
                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                                            onClick={() => navigate('/finance/pfms')}
                                        >
                                            View All <ArrowRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        <span>Financial Year 2024-25</span>
                                    </div>
                                    <div className="space-y-6">
                                        {(pfmsTransactions || []).map((transaction, index) => (
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
                                <CardHeader className="border-b bg-orange-50">
                                    <CardTitle className="text-lg font-semibold flex items-center">
                                        <Users className="w-5 h-5 mr-2 text-orange-600" />
                                        Internship Payments
                                    </CardTitle>
                                    <p className="text-xs text-gray-600 mt-1 flex items-center">
                                        <AlertTriangle className="w-3 h-3 mr-1 text-orange-500" />
                                        Blocked internships shown with ⚠️
                                    </p>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        {(internshipPayments || []).map((payment) => (
                                            <div key={payment.id} className="border border-gray-200 rounded-lg p-3">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm text-gray-900">{payment.name}</p>
                                                        <p className="text-xs text-gray-600 mt-1">{payment.internship}</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1">{payment.amount}</p>
                                                    </div>
                                                    {payment.status === 'paid' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                                    )}
                                                </div>
                                                {payment.status === 'pending' && (
                                                    <Button size="sm" className="w-full mt-2 bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/finance/internships')}>
                                                        Verify
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
        </div>
    );
};

export default FinanceDashboard;
