import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../components/auth/LoginPage';
import { ROLES } from '../constants/roles';
import DashboardLayout from '../components/shared/DashboardLayout';

// Admin Pages (lazy-loaded → per-route chunks)
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const CreateProject = lazy(() => import('../pages/admin/CreateProject'));
const ApproveProjects = lazy(() => import('../pages/admin/ApproveProjects'));
const AssignFaculty = lazy(() => import('../pages/admin/AssignFaculty'));
const ApproveFundRequests = lazy(() => import('../pages/admin/ApproveFundRequests'));
const ODRequests = lazy(() => import('../pages/admin/ODRequests'));
const EventRequests = lazy(() => import('../pages/admin/EventRequests'));
const ApproveEquipment = lazy(() => import('../pages/admin/ApproveEquipment'));
const AdminReports = lazy(() => import('../pages/admin/AdminReports'));
const AdminDocuments = lazy(() => import('../pages/admin/AdminDocuments'));
const AdminRevenue = lazy(() => import('../pages/admin/AdminRevenue'));
const AdminInternship = lazy(() => import('../pages/admin/AdminInternship'));
const AdminFacultyRequests = lazy(() => import('../pages/admin/AdminFacultyRequests'));
const Settings = lazy(() => import('../components/shared/Settings'));
const Profile = lazy(() => import('../pages/shared/Profile'));

// Faculty Pages
const FacultyDashboard = lazy(() => import('../pages/faculty/FacultyDashboard'));
const FacultyProjects = lazy(() => import('../pages/faculty/FacultyProjects'));
const FacultyRequestFunds = lazy(() => import('../pages/faculty/FacultyRequestFunds'));
const FacultyODRequest = lazy(() => import('../pages/faculty/FacultyODRequest'));
const FacultyEventRequests = lazy(() => import('../pages/faculty/FacultyEventRequests'));
const FacultyDocuments = lazy(() => import('../pages/faculty/FacultyDocuments'));
const ConsultancyRevenueSummary = lazy(() => import('../pages/faculty/ConsultancyRevenue/RevenueSummary'));
const MyRevenueRecords = lazy(() => import('../pages/faculty/ConsultancyRevenue/MyRevenueRecords'));
const AddRevenueRecord = lazy(() => import('../pages/faculty/ConsultancyRevenue/AddRevenueRecord'));
const EquipmentMyRequests = lazy(() => import('../pages/faculty/EquipmentFinancialRecords/MyRequests'));
const AcademicSupportDashboard = lazy(() => import('../pages/shared/AcademicSupportDashboard'));
const AIProposalGenerator = lazy(() => import('../pages/faculty/AIProposalGenerator'));
const ProfileSetup = lazy(() => import('../pages/faculty/ProfileSetup'));
const FacultySubmissionForm = lazy(() => import('../pages/faculty/FacultySubmissionForm'));

// Finance Pages
const FinanceDashboard = lazy(() => import('../pages/finance/FinanceDashboard'));
const FinanceManagerDashboard = lazy(() => import('../pages/finance/FinanceManagerDashboard'));
const FundReleasesPage = lazy(() => import('../pages/finance/FundReleasesPage'));
const ManagePFMS = lazy(() => import('../pages/finance/ManagePFMS'));
const VerifyInternshipFees = lazy(() => import('../pages/finance/VerifyInternshipFees'));
const FunctionFundRequestsPage = lazy(() => import('../pages/finance/FunctionFundRequestsPage'));
const DisbursementQueue = lazy(() => import('../pages/finance/DisbursementQueue'));
const EquipmentDisbursements = lazy(() => import('../pages/finance/EquipmentDisbursements'));
const RevenueVerification = lazy(() => import('../pages/finance/RevenueVerification'));
const FinancialReports = lazy(() => import('../pages/finance/FinancialReports'));
const DisbursalHistory = lazy(() => import('../pages/finance/DisbursalHistory'));
const FinanceFacultyRequests = lazy(() => import('../pages/finance/FinanceFacultyRequests'));

// Suspense fallback shown while a route chunk loads
const RouteFallback = () => (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-500 dark:text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
        <p className="text-sm font-medium">Loading...</p>
    </div>
);

const AppRoutes = () => {
    // Apply theme on initial load
    React.useEffect(() => {
        const storedSettings = localStorage.getItem('appearance_settings');
        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else if (theme === 'light') {
                document.documentElement.classList.remove('dark');
            } else if (theme === 'auto' || !theme) {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        };

        if (storedSettings) {
            const { theme } = JSON.parse(storedSettings);
            applyTheme(theme);
        } else {
            // Default to dark mode
            applyTheme('dark');
        }
    }, []);

    return (
        <Router>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Admin Routes wrapped in DashboardLayout */}
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                <DashboardLayout>
                                    <Routes>
                                        <Route path="dashboard" element={<AdminDashboard />} />
                                        <Route path="projects" element={<CreateProject />} />
                                        <Route path="approve-projects" element={<ApproveProjects />} />
                                        <Route path="assign-faculty" element={<AssignFaculty />} />
                                        <Route path="fund-requests" element={<ApproveFundRequests />} />
                                        <Route path="equipment-requests" element={<ApproveEquipment />} />
                                        <Route path="od-requests" element={<ODRequests />} />
                                        <Route path="event-requests" element={<EventRequests />} />
                                        <Route path="revenue-approvals" element={<AdminRevenue />} />
                                        <Route path="internship-approvals" element={<AdminInternship />} />
                                        <Route path="reports" element={<AdminReports />} />
                                        <Route path="documents" element={<AdminDocuments />} />
                                        <Route path="faculty-requests" element={<AdminFacultyRequests />} />
                                        <Route path="settings" element={<Settings />} />
                                        <Route path="profile" element={<Profile />} />
                                    </Routes>
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Faculty Routes */}
                    <Route
                        path="/faculty/*"
                        element={
                            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                <DashboardLayout>
                                    <Routes>
                                        <Route path="dashboard" element={<FacultyDashboard />} />
                                        <Route path="projects" element={<FacultyProjects />} />
                                        <Route path="request-funds" element={<FacultyRequestFunds />} />
                                        <Route path="od-request" element={<FacultyODRequest />} />
                                        <Route path="event-requests" element={<FacultyEventRequests />} />
                                        <Route path="documents" element={<FacultyDocuments />} />
                                        <Route path="revenue/dashboard" element={<ConsultancyRevenueSummary />} />
                                        <Route path="revenue/records" element={<MyRevenueRecords />} />
                                        <Route path="revenue/add" element={<AddRevenueRecord />} />
                                        <Route path="equipment/dashboard" element={<EquipmentMyRequests />} />
                                        <Route path="academic-support" element={<AcademicSupportDashboard />} />
                                        <Route path="ai-generator" element={<AIProposalGenerator />} />
                                        <Route path="submit-request" element={<FacultySubmissionForm />} />
                                        <Route path="settings" element={<Settings />} />
                                        <Route path="profile" element={<Profile />} />
                                    </Routes>
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Finance Officer Routes */}
                    <Route
                        path="/finance/*"
                        element={
                            <ProtectedRoute allowedRoles={[ROLES.FINANCE_OFFICER]}>
                                <DashboardLayout>
                                    <Routes>
                                        <Route path="dashboard" element={<FinanceManagerDashboard />} />
                                        <Route path="disbursements" element={<DisbursementQueue />} />
                                        <Route path="disbursal-history" element={<DisbursalHistory />} />
                                        <Route path="revenue-verification" element={<RevenueVerification />} />
                                        <Route path="fund-flow" element={<FundReleasesPage />} />
                                        <Route path="pfms" element={<ManagePFMS />} />
                                        <Route path="equipment-disbursements" element={<EquipmentDisbursements />} />
                                        <Route path="function-requests" element={<FunctionFundRequestsPage />} />
                                        <Route path="internships" element={<VerifyInternshipFees />} />
                                        <Route path="reports" element={<FinanceDashboard />} />
                                        <Route path="financial-reports" element={<FinancialReports />} />
                                        <Route path="faculty-requests" element={<FinanceFacultyRequests />} />
                                        <Route path="settings" element={<Settings />} />
                                        <Route path="profile" element={<Profile />} />
                                    </Routes>
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Full-screen Setup Route */}
                    <Route 
                        path="/faculty/profile-setup" 
                        element={
                            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                <ProfileSetup />
                            </ProtectedRoute>
                        } 
                    />

                    {/* 404 Route */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </Suspense>
        </Router>
    );
};

export default AppRoutes;
