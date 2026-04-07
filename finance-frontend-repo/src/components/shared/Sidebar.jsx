import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { Button } from '../ui/button';
import {
    LogOut, Home, FileText, DollarSign, Users, Building2,
    Settings, CheckCircle, UserPlus, BarChart3, Clock
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getNavItems = () => {
        switch (user?.role) {
            case ROLES.ADMIN:
                return [
                    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
                    { label: 'Approve Projects', path: '/admin/approve-projects', icon: CheckCircle },
                    { label: 'Assign Faculty', path: '/admin/assign-faculty', icon: UserPlus },
                    { label: 'Fund Requests', path: '/admin/fund-requests', icon: DollarSign },
                    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
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
                    { label: 'Fund Releases', path: '/finance/fund-flow', icon: DollarSign },
                    { label: 'Function Requests', path: '/finance/function-requests', icon: FileText },
                    { label: 'PFMS Tracking', path: '/finance/pfms', icon: FileText },
                    { label: 'Internship Fees', path: '/finance/internships', icon: Users },
                ];
            default:
                return [];
        }
    };

    return (
        <div className="w-64 bg-white dark:bg-slate-950 text-gray-700 dark:text-gray-200 min-h-screen flex flex-col fixed left-0 top-0 transition-colors duration-200 border-r border-gray-200 dark:border-slate-800 shadow-sm">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-sathyabama-maroon rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-sathyabama-maroon dark:text-white">Sathyabama</h1>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Research Portal</p>
                    </div>
                </div>
            </div>

            {/* User Profile */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-sathyabama-maroon/10 dark:bg-sathyabama-maroon/20 rounded-full flex items-center justify-center font-bold text-sathyabama-maroon dark:text-sathyabama-gold border border-sathyabama-maroon/20">
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4">
                {getNavItems().map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 px-6 py-3 transition-colors ${isActive
                                ? 'bg-sathyabama-maroon/5 dark:bg-sathyabama-maroon/20 border-l-4 border-sathyabama-maroon text-sathyabama-maroon dark:text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800/50 text-gray-600 dark:text-slate-400 hover:text-sathyabama-maroon dark:hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-sathyabama-maroon dark:text-sathyabama-gold' : 'text-gray-400 dark:text-slate-500'}`} />
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Settings & Logout */}
            <div className="border-t border-gray-100 dark:border-slate-800">
                <button
                    className="flex items-center space-x-3 px-6 py-3 w-full hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-gray-600 dark:text-slate-400 hover:text-sathyabama-maroon dark:hover:text-white"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">Settings</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-6 py-3 w-full hover:bg-red-50 dark:hover:bg-slate-800/50 transition-colors text-red-600 dark:text-red-400 hover:text-red-700"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
