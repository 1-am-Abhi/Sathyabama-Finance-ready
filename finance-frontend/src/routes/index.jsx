import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../components/auth/LoginPage';
import { ROLES } from '../constants/roles';
import DashboardLayout from '../components/shared/DashboardLayout';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import CreateProject from '../pages/admin/CreateProject';
import ApproveProjects from '../pages/admin/ApproveProjects';
import AssignFaculty from '../pages/admin/AssignFaculty';
import ApproveFundRequests from '../pages/admin/ApproveFundRequests';
import ODRequests from '../pages/admin/ODRequests';
import EventRequests from '../pages/admin/EventRequests';
import AdminReports from '../pages/admin/AdminReports';
import Settings from '../components/shared/Settings';
import Profile from '../pages/shared/Profile';

import FacultyDashboard from '../pages/faculty/FacultyDashboard';
import FacultyProjects from '../pages/faculty/FacultyProjects';
import FacultyRequestFunds from '../pages/faculty/FacultyRequestFunds';
import FacultyODRequest from '../pages/faculty/FacultyODRequest';
import FacultyDocuments from '../pages/faculty/FacultyDocuments';
import ConsultancyRevenueSummary from '../pages/faculty/ConsultancyRevenue/RevenueSummary';
import MyRevenueRecords from '../pages/faculty/ConsultancyRevenue/MyRevenueRecords';
import AddRevenueRecord from '../pages/faculty/ConsultancyRevenue/AddRevenueRecord';
import EquipmentMyRequests from '../pages/faculty/EquipmentFinancialRecords/MyRequests';
import EquipmentAddRequest from '../pages/faculty/EquipmentFinancialRecords/AddRequest';
import AcademicSupportDashboard from '../pages/shared/AcademicSupportDashboard';

// Finance Pages
import FinanceDashboard from '../pages/finance/FinanceDashboard';
import ManageFundFlow from '../pages/finance/ManageFundFlow';
import ManagePFMS from '../pages/finance/ManagePFMS';
import VerifyInternshipFees from '../pages/finance/VerifyInternshipFees';

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
        <AuthProvider>
            <Router>
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
                                        <Route path="od-requests" element={<ODRequests />} />
                                        <Route path="event-requests" element={<EventRequests />} />
                                        <Route path="reports" element={<AdminReports />} />
                                        <Route
                                            path="settings"
                                            element={<Settings />}
                                        />
                                        <Route
                                            path="profile"
                                            element={<Profile />}
                                        />
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
                                        <Route path="documents" element={<FacultyDocuments />} />
                                        <Route path="revenue/dashboard" element={<ConsultancyRevenueSummary />} />
                                        <Route path="revenue/records" element={<MyRevenueRecords />} />
                                        <Route path="revenue/add" element={<AddRevenueRecord />} />
                                        <Route path="equipment/dashboard" element={<EquipmentMyRequests />} />
                                        <Route path="equipment/add" element={<EquipmentAddRequest />} />
                                        <Route path="/academic-support" element={<AcademicSupportDashboard />} />
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
                                        <Route path="dashboard" element={<FinanceDashboard />} />
                                        <Route path="fund-flow" element={<ManageFundFlow />} />
                                        <Route path="pfms" element={<ManagePFMS />} />
                                        <Route path="internships" element={<VerifyInternshipFees />} />
                                        <Route path="reports" element={<FinanceDashboard />} />
                                    </Routes>
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* 404 Route */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default AppRoutes;
