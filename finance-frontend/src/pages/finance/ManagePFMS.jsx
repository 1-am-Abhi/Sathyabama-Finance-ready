import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useLayout } from '../../contexts/LayoutContext';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useProjects, usePFMSTransactions, useCreatePFMSTransaction } from '../../hooks/useFinance';
import useToast from '../../hooks/useToast';

const ManagePFMS = () => {
    const { setLayout } = useLayout();
    const { showToast, ToastPortal } = useToast();
    const [showForm, setShowForm] = useState(false);

    const { data: pfmsEntries = [], isLoading: isLoadingPFMS } = usePFMSTransactions();
    const { data: projects = [] } = useProjects();
    const createPFMS = useCreatePFMSTransaction();

    useEffect(() => {
        setLayout("PFMS Tracking", "Monitor Public Financial Management System transactions");
    }, [setLayout]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createPFMS.mutateAsync(formData);
            showToast('PFMS entry recorded successfully!');
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
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to create PFMS entry', 'error');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleEdit = (entry) => {
        setFormData({
            projectId: entry.id.toString(), // or whatever field identifies the project
            pfmsProjectId: entry.pfmsProjectId,
            principalInvestigator: entry.principalInvestigator,
            govtOrganization: entry.govtOrganization,
            sanctionOrderNo: 'MOCK-ORDER-123',
            sanctionOrderDate: '2024-01-01',
            installmentNumber: '1',
            amountReleased: entry.amountReleased.toString(),
            creditDate: entry.creditDate,
            utrNumber: 'MOCK-UTR-789',
            ucStatus: entry.ucStatus
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="p-8">
                    <div className="mb-8 flex justify-end items-center">
                        <Button onClick={() => {
                            if (showForm) {
                                setShowForm(false);
                            } else {
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
                                setShowForm(true);
                            }
                        }}>
                            {showForm ? 'Cancel' : 'Add PFMS Entry'}
                        </Button>
                    </div>

                    {showForm && (
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle>{formData.pfmsProjectId ? 'Edit PFMS Entry' : 'New PFMS Entry'}</CardTitle>
                                <CardDescription>{formData.pfmsProjectId ? 'Update details for this PFMS record' : 'Add PFMS details for a project'}</CardDescription>
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
                                                {projects.map(project => (
                                                    <option key={project.id} value={project.id}>
                                                        {project.projectTitle}
                                                    </option>
                                                ))}
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
                                        <Button type="submit">{formData.pfmsProjectId ? 'Update Entry' : 'Save Entry'}</Button>
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
                                                <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>Edit</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
        </div>
    );
};

export default ManagePFMS;
