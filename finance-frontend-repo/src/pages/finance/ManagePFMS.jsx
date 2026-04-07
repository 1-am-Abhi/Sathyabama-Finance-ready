import React, { useState } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import TopBar from '../../components/shared/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

const ManagePFMS = () => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        projectId: '',
        pfmsProjectId: '',
        principalInvestigator: '',
        govtOrganization: '',
        sanctionOrderNo: '',
        sanctionOrderDate: '',
        installmentNumber: '',
        amountReleased: '',
        creditDate: '',
        utrNumber: '',
        ucStatus: 'PENDING'
    });

    // Mock data
    const pfmsEntries = [
        {
            id: 1,
            projectTitle: 'AI Research Lab',
            pfmsProjectId: 'PFMS2024001',
            principalInvestigator: 'Dr. Ramesh Kumar',
            govtOrganization: 'DST',
            amountReleased: 1500000,
            creditDate: '2024-01-15',
            ucStatus: 'SUBMITTED'
        },
        {
            id: 2,
            projectTitle: 'IoT Smart Campus',
            pfmsProjectId: 'PFMS2024002',
            principalInvestigator: 'Dr. Priya Nair',
            govtOrganization: 'AICTE',
            amountReleased: 2000000,
            creditDate: '2024-01-20',
            ucStatus: 'PENDING'
        }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('PFMS Entry:', formData);
        alert('PFMS entry created successfully!');
        setShowForm(false);
        setFormData({
            projectId: '',
            pfmsProjectId: '',
            principalInvestigator: '',
            govtOrganization: '',
            sanctionOrderNo: '',
            sanctionOrderDate: '',
            installmentNumber: '',
            amountReleased: '',
            creditDate: '',
            utrNumber: '',
            ucStatus: 'PENDING'
        });
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />

            <div className="flex-1 ml-64">
                <TopBar title="PFMS Management" subtitle="Public Financial Management System data" />

                <div className="p-8">
                    <div className="mb-8 flex justify-end items-center">
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
                                                <option value="1">AI Research Lab</option>
                                                <option value="2">IoT Smart Campus</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="principalInvestigator">PI (Principal Investigator) *</Label>
                                            <Input
                                                id="principalInvestigator"
                                                name="principalInvestigator"
                                                value={formData.principalInvestigator}
                                                onChange={handleChange}
                                                placeholder="e.g., Dr. Ramesh Kumar"
                                                required
                                            />
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
                                        <TableHead>PI</TableHead>
                                        <TableHead>Govt Org</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Credit Date</TableHead>
                                        <TableHead>UC Status</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pfmsEntries.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">{entry.projectTitle}</TableCell>
                                            <TableCell>{entry.pfmsProjectId}</TableCell>
                                            <TableCell>{entry.principalInvestigator}</TableCell>
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
                                                <Button size="sm" variant="outline">Edit</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
};

export default ManagePFMS;
