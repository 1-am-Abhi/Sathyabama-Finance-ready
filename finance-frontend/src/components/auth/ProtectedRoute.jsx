import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role === 'FACULTY' && !user?.isProfileCompleted && !window.location.pathname.includes('/faculty/profile-setup')) {
        return <Navigate to="/faculty/profile-setup" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        // Redirect to appropriate dashboard based on role
        const dashboardPaths = {
            ADMIN: '/admin/dashboard',
            FACULTY: '/faculty/dashboard',
            FINANCE_OFFICER: '/finance/dashboard'
        };
        return <Navigate to={dashboardPaths[user?.role] || '/login'} replace />;
    }

    return children;
};

export default ProtectedRoute;
