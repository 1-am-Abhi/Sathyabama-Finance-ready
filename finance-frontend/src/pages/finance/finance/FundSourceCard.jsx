import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatCurrencyCompact } from '../../../utils/currency';
import { TrendingUp, Edit } from 'lucide-react';

const FundSourceCard = ({ title, data, icon: Icon, colorClass, onEdit }) => {
    // Always render — show zeros if no data yet
    const { totalAllocated = 0, totalUsed = 0, remainingBalance = 0 } = data || {};
    const usagePercentage = totalAllocated > 0
        ? ((totalUsed / totalAllocated) * 100).toFixed(1)
        : 0;

    return (
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className={`border-b ${colorClass} dark:border-slate-700 dark:bg-opacity-20`}>
                <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg font-semibold flex items-center">
                        {Icon && <Icon className="w-5 h-5 mr-2" />}
                        {title}
                    </CardTitle>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onEdit}
                        className="hover:bg-white/50 dark:hover:bg-slate-700/50 dark:border-slate-600 dark:text-white"
                    >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                    </Button>
                </div>
                <div className="text-xs opacity-70">
                    {usagePercentage}% utilized
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Total Allocated */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-slate-400">Total Allocated</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {formatCurrencyCompact(totalAllocated)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                {formatCurrency(totalAllocated)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Total Used */}
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-slate-400">Amount Used</p>
                            <p className="text-xl font-semibold text-orange-600 dark:text-orange-500 mt-1">
                                {formatCurrencyCompact(totalUsed)}
                            </p>
                        </div>
                        <div className="flex-1 text-right">
                            <p className="text-sm text-gray-600 dark:text-slate-400">Remaining</p>
                            <p className="text-xl font-semibold text-green-600 mt-1">
                                {formatCurrencyCompact(remainingBalance)}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FundSourceCard;
