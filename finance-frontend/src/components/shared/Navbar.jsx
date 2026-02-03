import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { Button } from '../ui/button';
import { LogOut, Home, FileText, DollarSign, Users, Building2 } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getNavItems = () => {
        switch (user?.role) {
            case ROLES.ADMIN:
                return [
                    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
                    { label: 'Approve Projects', path: '/admin/approve-projects', icon: FileText },
                    { label: 'Assign Faculty', path: '/admin/assign-faculty', icon: Users },
                    { label: 'Fund Requests', path: '/admin/fund-requests', icon: DollarSign },
                    { label: 'Reports', path: '/admin/reports', icon: FileText },
                ];
            case ROLES.FACULTY:
                return [
                    { label: 'Dashboard', path: '/faculty/dashboard', icon: Home },
                    { label: 'My Projects', path: '/faculty/projects', icon: FileText },
                    { label: 'Request Funds', path: '/faculty/request-funds', icon: DollarSign },
                    { label: 'Documents', path: '/faculty/documents', icon: FileText },
                ];
            case ROLES.FINANCE_OFFICER:
                return [
                    { label: 'Dashboard', path: '/finance/dashboard', icon: Home },
                    { label: 'Fund Flow', path: '/finance/fund-flow', icon: DollarSign },
                    { label: 'PFMS', path: '/finance/pfms', icon: FileText },
                    { label: 'Internships', path: '/finance/internships', icon: Users },
                    { label: 'Reports', path: '/finance/reports', icon: FileText },
                ];
            default:
                return [];
        }
    };

    const getRoleBadgeColor = () => {
        switch (user?.role) {
            case ROLES.ADMIN:
                return 'bg-gradient-to-r from-purple-500 to-pink-500';
            case ROLES.FACULTY:
                return 'bg-gradient-to-r from-blue-500 to-cyan-500';
            case ROLES.FINANCE_OFFICER:
                return 'bg-gradient-to-r from-green-500 to-emerald-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Sathyabama Research Hub
                                </h1>
                                <p className="text-xs text-gray-500">Finance Management Portal</p>
                            </div>
                        </div>
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                            {getNavItems().map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="font-semibold text-gray-900 text-sm">{user?.name}</div>
                            <div className={`text-xs text-white px-2 py-0.5 rounded-full inline-block mt-1 ${getRoleBadgeColor()}`}>
                                {user?.role?.replace('_', ' ')}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
