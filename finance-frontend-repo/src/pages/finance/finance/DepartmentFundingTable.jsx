import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { formatCurrencyCompact } from '../../../utils/currency';
import UpdateFundingModal from './UpdateFundingModal';
import { Edit, TrendingUp } from 'lucide-react';

const DepartmentFundingTable = ({ data, isLoading }) => {
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleUpdateClick = (department) => {
        setSelectedDepartment(department);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedDepartment(null);
    };

    const handleUpdateSuccess = () => {
        // Success feedback can be added here
        console.log('Funding updated successfully');
    };

    if (isLoading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gray-50">
                    <CardTitle className="text-lg font-semibold">Research Center Funding Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <div className="h-12 bg-gray-200 rounded flex-1"></div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gray-50">
                    <CardTitle className="text-lg font-semibold">Research Center Funding Details</CardTitle>
                </CardHeader>
                <CardContent className="p-12">
                    <div className="text-center text-gray-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No funding data available</p>
                        <p className="text-sm mt-2">Select a research center to view funding details</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="border-b bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                    <CardTitle className="text-lg font-semibold dark:text-white">Research Center Funding Details</CardTitle>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Breakdown by fund source</p>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-slate-700 hover:bg-transparent">
                                    <TableHead className="font-semibold dark:text-slate-300">Research Center</TableHead>
                                    <TableHead className="font-semibold dark:text-slate-300">Fund Source</TableHead>
                                    <TableHead className="font-semibold text-right dark:text-slate-300">Total Allocated</TableHead>
                                    <TableHead className="font-semibold text-right dark:text-slate-300">Amount Released</TableHead>
                                    <TableHead className="font-semibold text-right dark:text-slate-300">Remaining Balance</TableHead>
                                    <TableHead className="font-semibold text-center dark:text-slate-300">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item, index) => (
                                    <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 dark:border-slate-700">
                                        <TableCell className="font-medium dark:text-slate-200">{item.departmentName}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={item.fundSource === 'COLLEGE' ? 'default' : 'secondary'}
                                                className={
                                                    item.fundSource === 'COLLEGE'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                                }
                                            >
                                                {item.fundSource === 'COLLEGE' ? 'College' : 'PFMS'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold dark:text-slate-200">
                                            {formatCurrencyCompact(item.totalAllocated)}
                                        </TableCell>
                                        <TableCell className="text-right text-orange-600 dark:text-orange-400 font-medium">
                                            {formatCurrencyCompact(item.amountReleased)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                                            {formatCurrencyCompact(item.remainingBalance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleUpdateClick(item)}
                                                className="hover:bg-blue-50 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                                            >
                                                <Edit className="w-4 h-4 mr-1" />
                                                Update
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Summary Section */}
                    {data.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-slate-400">Total Allocated</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                        {formatCurrencyCompact(
                                            data.reduce((sum, item) => sum + item.totalAllocated, 0)
                                        )}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-slate-400">Total Released</p>
                                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                                        {formatCurrencyCompact(
                                            data.reduce((sum, item) => sum + item.amountReleased, 0)
                                        )}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-slate-400">Total Remaining</p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                                        {formatCurrencyCompact(
                                            data.reduce((sum, item) => sum + item.remainingBalance, 0)
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Update Funding Modal */}
            <UpdateFundingModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                department={selectedDepartment}
                onSuccess={handleUpdateSuccess}
            />
        </>
    );
};

export default DepartmentFundingTable;
