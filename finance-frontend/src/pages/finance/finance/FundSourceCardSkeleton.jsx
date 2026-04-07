import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';

const FundSourceCardSkeleton = () => {
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="h-6 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>

                    {/* Main amount */}
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-8 bg-gray-200 rounded w-40"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Used and Remaining */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                            <div className="h-6 bg-gray-200 rounded w-28"></div>
                        </div>
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                            <div className="h-6 bg-gray-200 rounded w-28 ml-auto"></div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FundSourceCardSkeleton;
