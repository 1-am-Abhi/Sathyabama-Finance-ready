import React, { useState, useEffect } from 'react';
import ProjectStatusBadge from './finance/ProjectStatusBadge';
import UpdateProjectStatusModal from './finance/UpdateProjectStatusModal';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { useDepartments, useProjects, useUpdateProjectStatus } from '../../hooks/useFinance';
import { useLayout } from '../../contexts/LayoutContext';
import { formatCurrency } from '../../utils/currency';
import { Search, Filter, Eye, Edit, Loader2 } from 'lucide-react';

const FundReleasesPage = () => {
    const { setLayout } = useLayout();
    const [filters, setFilters] = useState({
        departmentId: '',
        status: '',
        search: '',
    });

    useEffect(() => {
        setLayout("Fund Releases", "Manage and track project fund disbursements");
    }, [setLayout]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch departments and projects
    const { data: departmentsData, isLoading: isLoadingDepartments } = useDepartments();
    const { data: projectsData, isLoading: isLoadingProjects } = useProjects(filters);
    const updateProjectStatusMutation = useUpdateProjectStatus();

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            departmentId: '',
            status: '',
            search: '',
        });
    };

    const handleUpdateStatus = (project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handleStatusUpdate = async (payload) => {
        try {
            await updateProjectStatusMutation.mutateAsync({
                projectId: payload.projectId,
                statusData: payload,
            });
            setIsModalOpen(false);
            setSelectedProject(null);
        } catch (error) {
            console.error('Failed to update project status:', error);
            throw error;
        }
    };

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'PENDING_DEAN_APPROVAL', label: 'Pending Dean Approval' },
        { value: 'APPROVED_BY_DEAN', label: 'Approved by Dean' },
        { value: 'FUND_RELEASED', label: 'Fund Released' },
        { value: 'CHEQUE_RELEASED', label: 'Cheque Released' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'REJECTED', label: 'Rejected' },
    ];

    return (
        <div className="p-8">
                    {/* Filters Section */}
                    <Card className="mb-6 border-0 shadow-sm">
                        <CardHeader className="border-b bg-gray-50">
                            <CardTitle className="text-lg font-semibold flex items-center">
                                <Filter className="w-5 h-5 mr-2" />
                                Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Research Center Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="department">Research Center</Label>
                                    <select
                                        id="department"
                                        value={filters.departmentId}
                                        onChange={(e) => handleFilterChange('departmentId', e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        disabled={isLoadingDepartments}
                                    >
                                        <option value="">All Research Centers</option>
                                        {departmentsData?.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {statusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Search */}
                                <div className="space-y-2">
                                    <Label htmlFor="search">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="search"
                                            type="text"
                                            placeholder="Search by title or PI"
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Clear Filters Button */}
                            {(filters.departmentId || filters.status || filters.search) && (
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearFilters}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Projects Table */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="border-b bg-gray-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold">
                                    Projects ({projectsData?.length || 0})
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingProjects ? (
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                    <span className="ml-3 text-gray-600">Loading projects...</span>
                                </div>
                            ) : projectsData && projectsData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead className="font-semibold">Project Title</TableHead>
                                                <TableHead className="font-semibold">Research Center</TableHead>
                                                <TableHead className="font-semibold">Principal Investigator</TableHead>
                                                <TableHead className="font-semibold text-right">Requested</TableHead>
                                                <TableHead className="font-semibold text-right">Approved</TableHead>
                                                <TableHead className="font-semibold">Fund Source</TableHead>
                                                <TableHead className="font-semibold">Status</TableHead>
                                                <TableHead className="font-semibold text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {projectsData.map((project) => (
                                                <TableRow key={project.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium max-w-xs">
                                                        <div className="truncate" title={project.projectTitle}>
                                                            {project.projectTitle}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Submitted: {new Date(project.submittedDate).toLocaleDateString()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{project.departmentName}</TableCell>
                                                    <TableCell>{project.principalInvestigator}</TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(project.requestedAmount)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(project.approvedAmount)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                project.fundSource === 'COLLEGE'
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                                                    : 'bg-purple-50 text-purple-700 border-purple-300'
                                                            }
                                                        >
                                                            {project.fundSource}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <ProjectStatusBadge status={project.currentStatus} />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleUpdateStatus(project)}
                                                            disabled={
                                                                project.currentStatus === 'COMPLETED' ||
                                                                project.currentStatus === 'REJECTED'
                                                            }
                                                            className="hover:bg-blue-50"
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
                            ) : (
                                <div className="text-center p-12">
                                    <div className="text-gray-400 mb-2">
                                        <Search className="w-12 h-12 mx-auto" />
                                    </div>
                                    <p className="text-gray-600 font-medium">No projects found</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Try adjusting your filters or search criteria
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Update Status Modal */}
                    <UpdateProjectStatusModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedProject(null);
                        }}
                        project={selectedProject}
                        onSubmit={handleStatusUpdate}
                        isLoading={updateProjectStatusMutation.isPending}
                    />
                </div>
            );
};

export default FundReleasesPage;
