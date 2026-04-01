
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useLayout } from '../../contexts/LayoutContext';

import apiClient from '../../api/client';

const ManagePFMS = () => {
    const { setLayout } = useLayout();
    const [pfmsEntries, setPfmsEntries] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        setLayout("PFMS Management", "Public Financial Management System data");
        fetchData();
    }, [setLayout]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pfmsRes, projRes] = await Promise.all([
                apiClient.get('/finance/pfms'),
                apiClient.get('/projects')
            ]);
            setPfmsEntries(pfmsRes.data.data);
            setProjects(projRes.data.data);
        } catch (error) {
            console.error('Error fetching PFMS data:', error);
        } finally {
            setLoading(false);
        }
    };
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        projectId: '',
        pfmsProjectId: '',
        govtOrganization: '',
        sanctionOrderNo: '',
        sanctionOrderDate: '',
        installmentNumber: '',
        amountReleased: '',
        creditDate: '',
        utrNumber: '',
        ucStatus: 'PENDING'
    });


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/finance/pfms', formData);
            alert('PFMS entry created successfully!');
            setShowForm(false);
            setFormData({
                projectId: '',
                pfmsProjectId: '',
                govtOrganization: '',
                sanctionOrderNo: '',
                sanctionOrderDate: '',
                installmentNumber: '',
                amountReleased: '',
                creditDate: '',
                utrNumber: '',
                ucStatus: 'PENDING'
            });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save PFMS entry');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        {/* Title handled by Layout */}
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : 'Add PFMS Entry'}
                    </Button>
                </div>


                {showForm && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>New PFMS Entry</CardTitle>
                            <CardDescription>Add PFMS details for a project</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="projectId">Project *</Label>
                                        <select
                                            id="projectId"
                                            name="projectId"
                                            value={formData.projectId}
                                            onChange={handleChange}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            required
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map(proj => (
                                                <option key={proj._id} value={proj._id}>{proj.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="pfmsProjectId">PFMS Project ID *</Label>
                                        <Input
                                            id="pfmsProjectId"
                                            name="pfmsProjectId"
                                            value={formData.pfmsProjectId}
                                            onChange={handleChange}
                                            placeholder="e.g., PFMS2024001"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="govtOrganization">Government Organization *</Label>
                                        <Input
                                            id="govtOrganization"
                                            name="govtOrganization"
                                            value={formData.govtOrganization}
                                            onChange={handleChange}
                                            placeholder="e.g., DST, AICTE"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sanctionOrderNo">Sanction Order Number *</Label>
                                        <Input
                                            id="sanctionOrderNo"
                                            name="sanctionOrderNo"
                                            value={formData.sanctionOrderNo}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sanctionOrderDate">Sanction Order Date *</Label>
                                        <Input
                                            id="sanctionOrderDate"
                                            name="sanctionOrderDate"
                                            type="date"
                                            value={formData.sanctionOrderDate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="installmentNumber">Installment Number *</Label>
                                        <Input
                                            id="installmentNumber"
                                            name="installmentNumber"
                                            type="number"
                                            value={formData.installmentNumber}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="amountReleased">Amount Released (₹) *</Label>
                                        <Input
                                            id="amountReleased"
                                            name="amountReleased"
                                            type="number"
                                            value={formData.amountReleased}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="creditDate">Credit Date *</Label>
                                        <Input
                                            id="creditDate"
                                            name="creditDate"
                                            type="date"
                                            value={formData.creditDate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="utrNumber">UTR / Transaction ID *</Label>
                                        <Input
                                            id="utrNumber"
                                            name="utrNumber"
                                            value={formData.utrNumber}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="ucStatus">UC Status *</Label>
                                        <select
                                            id="ucStatus"
                                            name="ucStatus"
                                            value={formData.ucStatus}
                                            onChange={handleChange}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            required
                                        >
                                            <option value="PENDING">Pending</option>
                                            <option value="SUBMITTED">Submitted</option>
                                            <option value="APPROVED">Approved</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4">
                                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">Save PFMS Entry</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>PFMS Entries</CardTitle>
                        <CardDescription>All PFMS records in the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project</TableHead>
                                    <TableHead>PFMS ID</TableHead>
                                    <TableHead>Govt Org</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Credit Date</TableHead>
                                    <TableHead>UC Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pfmsEntries.length > 0 ? pfmsEntries.map((entry) => (
                                    <TableRow key={entry._id}>
                                        <TableCell className="font-medium">{entry.Project?.title || 'Unknown Project'}</TableCell>
                                        <TableCell>{entry.pfmsProjectId}</TableCell>
                                        <TableCell>{entry.govtOrganization}</TableCell>
                                        <TableCell>₹{(entry.amountReleased / 100000).toFixed(1)}L</TableCell>
                                        <TableCell>{new Date(entry.creditDate).toLocaleDateString('en-IN')}</TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded ${entry.ucStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                    entry.ucStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {entry.ucStatus}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="outline">View</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                                            No PFMS entries found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ManagePFMS;
