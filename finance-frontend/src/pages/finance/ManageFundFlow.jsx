import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, Circle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

import { usePipeline } from '../../contexts/PipelineContext';

const ManageFundFlow = () => {
    const { setLayout } = useLayout();
    const { fundRequests, advanceStage, isLoading } = usePipeline();
    const [selectedRequest, setSelectedRequest] = useState(null);

    React.useEffect(() => {
        setLayout("Fund Flow", "Track fund flow stages");
    }, [setLayout]);

    if (isLoading) return <div className="p-8 text-center">Loading Fund Flow Pipeline...</div>;

    // Use selectedRequest or first available request for demo
    const activeRequest = selectedRequest || (fundRequests && fundRequests[0]);

    const FUND_FLOW_STAGES = [
        { id: 'FUND_APPROVED', label: 'Fund Approved', description: 'Initial approval from authorities' },
        { id: 'FUND_RELEASED', label: 'Fund Released', description: 'Funds released from source' },
        { id: 'CHEQUE_RELEASED', label: 'Cheque Released', description: 'Payment instrument issued' },
        { id: 'AMOUNT_DISBURSED', label: 'Amount Disbursed', description: 'Funds credited to account' },
        { id: 'UTILIZATION_COMPLETED', label: 'Utilization Completed', description: 'Funds utilized as per plan' },
        { id: 'SETTLEMENT_CLOSED', label: 'Settlement Closed', description: 'Final settlement done' },
    ];

    const currentStageIndex = activeRequest 
        ? FUND_FLOW_STAGES.findIndex(s => s.id === activeRequest.currentStage) 
        : -1;

    const stages = FUND_FLOW_STAGES.map((s, idx) => {
        const audit = activeRequest?.auditTrail?.find(a => a.stage === s.id);
        return {
            ...s,
            completed: idx <= currentStageIndex,
            date: audit ? new Date(audit.timestamp).toLocaleString() : null,
            by: audit ? audit.updatedByName : null
        };
    });

    const allowedActions = [
        { id: 'FUND_RELEASED', label: 'Mark Fund Released', enabled: false },
        { id: 'CHEQUE_RELEASED', label: 'Mark Cheque Released', enabled: false },
        { id: 'AMOUNT_DISBURSED', label: 'Mark Amount Disbursed', enabled: false },
        { id: 'UTILIZATION_COMPLETED', label: 'Mark Utilization Completed', enabled: false },
        { id: 'SETTLEMENT_CLOSED', label: 'Mark Settlement Closed', enabled: true },
        { id: 'VERIFY_INTERNSHIP', label: 'Verify Internship Payments', enabled: false },
    ];

    const handleMarkComplete = async (stageId) => {
        try {
            await advanceStage({ 
                requestId: activeRequest._id, 
                nextStage: stageId, 
                remarks: `Stage ${stageId} completed by Finance` 
            });
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to advance stage');
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <div className="flex-1">

                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Fund Flow Timeline */}
                        <div className="lg:col-span-2">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="border-b bg-gray-50 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Fund Flow Timeline</CardTitle>
                                        <p className="text-xs text-gray-500 mt-1">Track the complete fund flow process</p>
                                    </div>
                                    <div className="w-1/3">
                                        <select
                                            className="w-full border-gray-300 rounded-md text-sm p-2"
                                            value={activeRequest?._id || ''}
                                            onChange={(e) => {
                                                const req = fundRequests.find(r => r._id === e.target.value);
                                                setSelectedRequest(req);
                                            }}
                                        >
                                            <option value="">Select a Fund Request</option>
                                            {fundRequests?.map(req => (
                                                <option key={req._id} value={req._id}>
                                                    {req.projectTitle} - ₹{req.requestedAmount} ({req.currentStage})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </CardHeader>
                                {activeRequest ? (
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
                                ) : (
                                    <CardContent className="p-8 text-center text-gray-500">
                                        No fund requests available or selected.
                                    </CardContent>
                                )}
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
            </div>
        </div>
    );
};

export default ManageFundFlow;
