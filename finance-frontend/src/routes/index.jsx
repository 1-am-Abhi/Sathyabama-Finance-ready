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

// Faculty Pages
import FacultyDashboard from '../pages/faculty/FacultyDashboard';

// Finance Pages
import FinanceDashboard from '../pages/finance/FinanceDashboard';
import ManageFundFlow from '../pages/finance/ManageFundFlow';
import ManagePFMS from '../pages/finance/ManagePFMS';
import VerifyInternshipFees from '../pages/finance/VerifyInternshipFees';

const AppRoutes = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

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
                                <FacultyDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/faculty/request-funds"
                        element={
                            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                <FacultyDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/faculty/documents"
                        element={
                            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                                <FacultyDashboard />
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

                    {/* 404 Route */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default AppRoutes;
