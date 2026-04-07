import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { FUND_STAGE_ORDER, FUND_STAGE_LABELS, FUND_STAGE_DESCRIPTIONS, getNextStage } from '../../constants/fundFlow';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Check, Circle, Lock } from 'lucide-react';
import { formatDate } from '../../lib/utils';

const FundFlowTimeline = ({ project, onStageUpdate }) => {
    const { user } = useAuth();
    const isFinanceOfficer = user?.role === ROLES.FINANCE_OFFICER;
    const currentStage = project?.currentFundStage || FUND_STAGE_ORDER[0];
    const currentIndex = FUND_STAGE_ORDER.indexOf(currentStage);

    const handleStageTransition = (stage) => {
        if (onStageUpdate) {
            onStageUpdate(stage);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fund Flow Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {FUND_STAGE_ORDER.map((stage, index) => {
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isNext = index === currentIndex + 1;
                        const isLocked = index > currentIndex + 1;

                        const stageData = project?.fundStageHistory?.find(h => h.stage === stage);

                        return (
                            <div key={stage} className="flex items-start space-x-4">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted
                                                ? 'bg-green-500 text-white'
                                                : isCurrent
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-200 text-gray-500'
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-5 h-5" />
                                        ) : isCurrent ? (
                                            <Circle className="w-5 h-5" />
                                        ) : (
                                            <Lock className="w-5 h-5" />
                                        )}
                                    </div>
                                    {index < FUND_STAGE_ORDER.length - 1 && (
                                        <div
                                            className={`w-0.5 h-12 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                                }`}
                                        />
                                    )}
                                </div>
                                <div className="flex-1 pb-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {FUND_STAGE_LABELS[stage]}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {FUND_STAGE_DESCRIPTIONS[stage]}
                                            </p>
                                            {stageData && (
                                                <div className="mt-2 text-xs text-gray-500">
                                                    <div>Updated: {formatDate(stageData.timestamp)}</div>
                                                    <div>By: {stageData.officerName}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            {isFinanceOfficer && isNext && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStageTransition(stage)}
                                                >
                                                    Mark as {FUND_STAGE_LABELS[stage]}
                                                </Button>
                                            )}
                                            {isFinanceOfficer && !isNext && !isCurrent && (
                                                <Button size="sm" disabled>
                                                    {isCompleted ? 'Completed' : 'Locked'}
                                                </Button>
                                            )}
                                            {!isFinanceOfficer && (
                                                <span className="text-sm text-gray-500">
                                                    {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default FundFlowTimeline;
