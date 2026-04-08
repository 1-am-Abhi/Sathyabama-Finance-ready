import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, Circle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

const ManageFundFlow = () => {
    const { setLayout } = useLayout();
    const [selectedProject, setSelectedProject] = useState(null);

    React.useEffect(() => {
        setLayout("Fund Flow Management", "Track and manage the progress of fund disbursement stages");
    }, [setLayout]);

    const stages = [
        {
            id: 'FUND_APPROVED',
            label: 'Fund Approved',
            description: 'Initial approval from authorities',
            date: '10 Dec 2023, 03:30 pm',
            by: 'Dr. Bharti',
            completed: true
        },
        {
            id: 'FUND_RELEASED',
            label: 'Fund Released',
            description: 'Funds released from source',
            date: '18 Dec 2023, 04:30 pm',
            by: 'Mr. Suresh Menon',
            completed: true
        },
        {
            id: 'CHEQUE_RELEASED',
            label: 'Cheque Released',
            description: 'Payment instrument issued',
            date: '22 Dec 2023, 07:30 pm',
            by: 'Mr. Suresh Menon',
            completed: true
        },
        {
            id: 'AMOUNT_DISBURSED',
            label: 'Amount Disbursed',
            description: 'Funds credited to account',
            date: '28 Dec 2023, 02:30 pm',
            by: 'Mr. Suresh Menon',
            completed: true
        },
        {
            id: 'UTILIZATION_COMPLETED',
            label: 'Utilization Completed',
            description: 'Funds utilized as per plan',
            date: '15 Nov 2024, 09:30 pm',
            by: 'Mr. Suresh Menon',
            note: '"All funds utilized as per plan"',
            completed: true
        },
        {
            id: 'SETTLEMENT_CLOSED',
            label: 'Settlement Closed',
            description: 'Final settlement done',
            date: null,
            by: null,
            completed: false
        },
    ];

    const allowedActions = [
        { id: 'FUND_RELEASED', label: 'Mark Fund Released', enabled: false },
        { id: 'CHEQUE_RELEASED', label: 'Mark Cheque Released', enabled: false },
        { id: 'AMOUNT_DISBURSED', label: 'Mark Amount Disbursed', enabled: false },
        { id: 'UTILIZATION_COMPLETED', label: 'Mark Utilization Completed', enabled: false },
        { id: 'SETTLEMENT_CLOSED', label: 'Mark Settlement Closed', enabled: true },
        { id: 'VERIFY_INTERNSHIP', label: 'Verify Internship Payments', enabled: false },
    ];

    const handleMarkComplete = (stageId) => {
        console.log('Marking stage complete:', stageId);
    };

    return (
        <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Fund Flow Timeline */}
                        <div className="lg:col-span-2">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-lg font-semibold">Fund Flow Timeline</CardTitle>
                                    <p className="text-xs text-gray-500 mt-1">Track the complete fund flow process</p>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="relative">
                                        {/* Vertical Line */}
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                                        {/* Timeline Items */}
                                        <div className="space-y-8">
                                            {stages.map((stage, index) => (
                                                <div key={stage.id} className="relative flex items-start">
                                                    {/* Icon */}
                                                    <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${stage.completed
                                                        ? 'bg-green-500'
                                                        : 'bg-blue-100 border-4 border-white'
                                                        }`}>
                                                        {stage.completed ? (
                                                            <CheckCircle className="w-6 h-6 text-white" />
                                                        ) : (
                                                            <Circle className="w-6 h-6 text-blue-500" />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="ml-6 flex-1">
                                                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <h3 className="font-bold text-gray-900">{stage.label}</h3>
                                                                    <p className="text-sm text-gray-600 mt-1">{stage.description}</p>

                                                                    {stage.completed && stage.date && (
                                                                        <div className="mt-3 space-y-1">
                                                                            <div className="flex items-center text-xs text-gray-500">
                                                                                <Clock className="w-3 h-3 mr-1" />
                                                                                {stage.date}
                                                                            </div>
                                                                            <p className="text-xs text-gray-500">By: {stage.by}</p>
                                                                            {stage.note && (
                                                                                <p className="text-xs text-gray-600 italic mt-2">{stage.note}</p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {!stage.completed && index === stages.findIndex(s => !s.completed) && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-blue-600 hover:bg-blue-700"
                                                                        onClick={() => handleMarkComplete(stage.id)}
                                                                    >
                                                                        Mark Complete
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Allowed Actions Sidebar */}
                        <div>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-lg font-semibold">Allowed Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        {allowedActions.map((action) => (
                                            <button
                                                key={action.id}
                                                disabled={!action.enabled}
                                                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${action.enabled
                                                    ? 'border-green-200 bg-green-50 hover:bg-green-100 text-green-700'
                                                    : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <CheckCircle className={`w-4 h-4 mr-2 ${action.enabled ? 'text-green-600' : 'text-gray-300'}`} />
                                                    <span className="text-sm font-medium">{action.label}</span>
                                                </div>
                                            </button>
                                        ))}

                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-start">
                                                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                                                <p className="text-xs text-red-700">No project approval access</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
        </div>
    );
};

export default ManageFundFlow;
