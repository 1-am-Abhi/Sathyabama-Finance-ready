import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../components/auth/LoginPage';
import { ROLES } from '../constants/roles';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import CreateProject from '../pages/admin/CreateProject';
import ApproveProjects from '../pages/admin/ApproveProjects';
import AssignFaculty from '../pages/admin/AssignFaculty';
import ApproveFundRequests from '../pages/admin/ApproveFundRequests';
import AdminReports from '../pages/admin/AdminReports';
import FinancialRecordsDashboard from '../pages/shared/FinancialRecordsDashboard';
import RevenueGeneratedDashboard from '../pages/shared/RevenueGeneratedDashboard';
import AcademicSupportDashboard from '../pages/shared/AcademicSupportDashboard';

// Faculty Pages
import FacultyDashboard from '../pages/faculty/FacultyDashboard';
import FacultyProjects from '../pages/faculty/FacultyProjects';
import FacultyRequestFunds from '../pages/faculty/FacultyRequestFunds';
import FacultyODRequest from '../pages/faculty/FacultyODRequest';


// Finance Pages
import FinanceDashboard from '../pages/finance/FinanceDashboard';
import ManageFundFlow from '../pages/finance/ManageFundFlow';
import ManagePFMS from '../pages/finance/ManagePFMS';
import VerifyInternshipFees from '../pages/finance/VerifyInternshipFees';

import DashboardLayout from '../components/layout/DashboardLayout';

const AppRoutes = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Authenticated Routes with Dashboard Layout */}
                    <Route element={<DashboardLayout />}>
                        {/* Admin Routes */}
                        <Route
                            path="/admin/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/projects"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <CreateProject />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/approve-projects"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <ApproveProjects />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/assign-faculty"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <AssignFaculty />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/fund-requests"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <ApproveFundRequests />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/reports"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <AdminReports />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/equipment/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <FinancialRecordsDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/revenue/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                    <RevenueGeneratedDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/academic-support"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FACULTY]}>
                                    <AcademicSupportDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Faculty Routes */}
                        <Route
                            path="/faculty/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                    <FacultyDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/faculty/projects"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                    <FacultyProjects />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/faculty/request-funds"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                    <FacultyRequestFunds />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/faculty/od-request"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                    <FacultyODRequest />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/faculty/equipment/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                    <FinancialRecordsDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/faculty/revenue/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                    <RevenueGeneratedDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Finance Officer Routes */}
                        <Route
                            path="/finance/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FINANCE_OFFICER]}>
                                    <FinanceDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/finance/fund-flow"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FINANCE_OFFICER]}>
                                    <ManageFundFlow />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/finance/pfms"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FINANCE_OFFICER]}>
                                    <ManagePFMS />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/finance/internships"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FINANCE_OFFICER]}>
                                    <VerifyInternshipFees />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/finance/reports"
                            element={
                                <ProtectedRoute allowedRoles={[ROLES.FINANCE_OFFICER]}>
                                    <FinanceDashboard />
                                </ProtectedRoute>
                            }
                        />
                    </Route>

                    {/* 404 Route */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default AppRoutes;
