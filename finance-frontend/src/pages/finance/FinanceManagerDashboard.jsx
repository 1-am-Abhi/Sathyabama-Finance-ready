import React, { useState, useEffect } from 'react';
import FundSourceCard from './finance/FundSourceCard';
import FundSourceCardSkeleton from './finance/FundSourceCardSkeleton';
import DepartmentFundingTable from './finance/DepartmentFundingTable';
import UpdateFundSourceModal from './finance/UpdateFundSourceModal';
import FinancialAnalytics from './finance/FinancialAnalytics';
import { Label } from '../../components/ui/label';
import { useFundSourcesOverview, useDepartmentFunding, useUpdateFundSource } from '../../hooks/useFinance';
import { Building2, Landmark, AlertCircle, CircleDollarSign } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useCentres } from '../../hooks/useCentres';

const FinanceManagerDashboard = () => {
    const { setLayout } = useLayout();
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const { centres } = useCentres();

    useEffect(() => {
        setLayout("Finance Dashboard", "Overview of total funding, research center allocations, and financial analytics");
    }, [setLayout]);


    const [fundSourceModalOpen, setFundSourceModalOpen] = useState(false);
    const [selectedFundSource, setSelectedFundSource] = useState(null);

    // Fetch fund sources overview
    const {
        data: fundSourcesData,
        isLoading: isLoadingFundSources,
        isError: isErrorFundSources,
    } = useFundSourcesOverview();



    // Fetch department funding (only when department is selected)
    const {
        data: departmentFundingData,
        isLoading: isLoadingDepartmentFunding,
    } = useDepartmentFunding(selectedDepartmentId);

    // Update fund source mutation
    const updateFundSourceMutation = useUpdateFundSource();

    const handleDepartmentChange = (e) => {
        setSelectedDepartmentId(e.target.value);
    };

    const getFundSource = (name) => {
        const sources = Array.isArray(fundSourcesData) ? fundSourcesData : [];
        const source = sources.find(f => f && (f.name === name || f.type === name));
        return source || { totalAllocated: 0, totalUsed: 0, remainingBalance: 0, count: 0 };
    };

    const handleEditFundSource = (type, title, currentAmount) => {
        setSelectedFundSource({
            type,
            title,
            currentAmount,
        });
        setFundSourceModalOpen(true);
    };

    const handleFundSourceUpdate = async (payload) => {
        try {
            await updateFundSourceMutation.mutateAsync(payload);
            const updatedAt = String(Date.now());
            localStorage.setItem('fundSourcesUpdatedAt', updatedAt);
            window.dispatchEvent(new CustomEvent('fund-sources-updated', { detail: { updatedAt } }));
            setFundSourceModalOpen(false);
            setSelectedFundSource(null);
        } catch (error) {
            console.error('Failed to update fund source:', error);
            throw error;
        }
    };

    return (
        <div className="p-8">
            {/* Fund Sources Overview Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Fund Sources Overview</h2>

                {isErrorFundSources ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-900">
                                    Failed to load fund sources data
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                    Please try refreshing the page or contact support if the issue persists.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Director's Innovation Fund Card */}
                        {isLoadingFundSources ? (
                            <FundSourceCardSkeleton />
                        ) : (
                            <FundSourceCard
                                title="Director's Innovation Fund"
                                data={getFundSource('INSTITUTIONAL')}
                                icon={Building2}
                                colorClass="bg-blue-50 text-blue-700"
                                onEdit={() => handleEditFundSource(
                                    'INSTITUTIONAL',
                                    "Director's Innovation Fund",
                                    getFundSource('INSTITUTIONAL').totalAllocated
                                )}
                            />
                        )}

                        {/* PFMS Funds Card */}
                        {isLoadingFundSources ? (
                            <FundSourceCardSkeleton />
                        ) : (
                            <FundSourceCard
                                title="PFMS Funds"
                                data={getFundSource('PFMS')}
                                icon={Landmark}
                                colorClass="bg-purple-50 text-purple-700"
                                onEdit={() => handleEditFundSource(
                                    'PFMS',
                                    'PFMS Funds',
                                    getFundSource('PFMS').totalAllocated
                                )}
                            />
                        )}

                        {/* Other Grants Card — Others / External Grants */}
                        {isLoadingFundSources ? (
                            <FundSourceCardSkeleton />
                        ) : (
                            <FundSourceCard
                                title="Other's Fund"
                                data={getFundSource('OTHERS')}
                                icon={CircleDollarSign}
                                colorClass="bg-emerald-50 text-emerald-700"
                                onEdit={() => handleEditFundSource(
                                    'OTHERS',
                                    "Other's Fund (External / Others)",
                                    getFundSource('OTHERS').totalAllocated
                                )}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Financial Analytics Charts */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Financial Analytics</h2>
                {isLoadingFundSources ? (
                    <div className="h-[300px] w-full bg-gray-200 animate-pulse rounded-lg"></div>
                ) : (
                    <FinancialAnalytics data={fundSourcesData} />
                )}
            </div>

            {/* Research Center-wise Funding Management Section */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Research Center-wise Funding Management
                </h2>

                {/* Research Center Filter */}
                <div className="mb-6">
                    <Label htmlFor="department" className="text-base font-semibold">
                        Select Research Center
                    </Label>
                    <select
                        id="department"
                        value={selectedDepartmentId}
                        onChange={handleDepartmentChange}
                        className="mt-2 flex h-11 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="">
                            Select a research center
                        </option>
                        {(centres ?? []).map((dept, idx) => {
                            const id = dept?._id || `dept-${idx}`;
                            return (
                                <option key={id} value={id}>
                                    {dept.name || "Unknown Center"}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Research Center Funding Table */}
                <DepartmentFundingTable
                    data={departmentFundingData}
                    isLoading={isLoadingDepartmentFunding}
                />
            </div>

            {/* Update Fund Source Modal */}
            <UpdateFundSourceModal
                isOpen={fundSourceModalOpen}
                onClose={() => setFundSourceModalOpen(false)}
                fundSource={selectedFundSource}
                onSubmit={handleFundSourceUpdate}
                isLoading={updateFundSourceMutation.isPending}
            />
        </div>
    );
};

export default FinanceManagerDashboard;
