import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { extractYearsFromArray } from '../../utils/yearUtils';

const HistoryTable = ({ data, columns, title }) => {
    // Extract unique years from the data
    const years = extractYearsFromArray(data);

    return (
        <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white mt-6">
            <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">
                    {title || 'History'}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-gray-200">
                                {columns.map((col, idx) => (
                                    <TableHead key={idx} className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center py-8 text-gray-400 text-sm">
                                        No history records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, idx) => (
                                    <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                                        {columns.map((col, colIdx) => (
                                            <TableCell key={colIdx} className="text-sm text-gray-700">
                                                {col.render ? col.render(row[col.key], row) : row[col.key]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default HistoryTable;
