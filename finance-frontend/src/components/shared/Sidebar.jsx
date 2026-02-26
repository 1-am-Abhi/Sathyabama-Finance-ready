import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { Button } from '../ui/button';
import {
    LogOut, Home, FileText, DollarSign, Users, Building2,
    Settings, CheckCircle, UserPlus, BarChart3, Clock, TrendingUp, ChevronDown, ChevronRight, Briefcase, GraduationCap
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [expandedMenu, setExpandedMenu] = useState({});

    const toggleMenu = (label) => {
        setExpandedMenu(prev => ({ ...prev, [label]: !prev[label] }));
    };

    console.log('Sidebar render - User:', user?.role, 'Path:', location.pathname);

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
                    {
                        label: 'Equipment and Consumable',
                        icon: Briefcase,
                        path: '/admin/equipment/dashboard'
                    },
                    {
                        label: 'Revenue Generated',
                        icon: TrendingUp,
                        path: '/admin/revenue/dashboard'
                    },
                    {
                        label: 'Academic Support',
                        icon: GraduationCap,
                        path: '/academic-support'
                    },
                ];
            case ROLES.FACULTY:
                return [
                    { label: 'Dashboard', path: '/faculty/dashboard', icon: Home },
                    { label: 'My Projects', path: '/faculty/projects', icon: FileText },
                    { label: 'Request Funds', path: '/faculty/request-funds', icon: DollarSign },
                    { label: 'OD Request', path: '/faculty/od-request', icon: Clock },
                    {
                        label: 'Equipment and Consumable',
                        icon: Briefcase,
                        path: '/faculty/equipment/dashboard'
                    },
                    {
                        label: 'Revenue Generated',
                        icon: TrendingUp,
                        path: '/faculty/revenue/dashboard'
                    },
                    {
                        label: 'Academic Support',
                        icon: GraduationCap,
                        path: '/academic-support'
                    },
                ];
            case ROLES.FINANCE_OFFICER:
                return [
                    { label: 'Dashboard', path: '/finance/dashboard', icon: Home },
                    { label: 'Fund Releases', path: '/finance/fund-flow', icon: DollarSign },
                    { label: 'PFMS Tracking', path: '/finance/pfms', icon: FileText },
                    { label: 'Internship Fees', path: '/finance/internships', icon: Users },
                    { label: 'Settlement', path: '/finance/reports', icon: Clock },
                ];
            default:
                return [];
        }
    };

    return (
        <div className="w-64 bg-gradient-to-b from-[#1e3a8a] to-[#1e40af] text-white min-h-screen flex flex-col fixed left-0 top-0">
            {/* Logo */}
            <div className="p-6 border-b border-blue-700/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold">Sathyabama</h1>
                        <p className="text-xs text-blue-200">Research Portal</p>
                    </div>
                </div>
            </div>

            {/* User Profile */}
            <div className="p-6 border-b border-blue-700/50 bg-blue-900/30">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-sm">{user?.name}</p>
                        <p className="text-xs text-blue-200">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4">
                {getNavItems().map((item) => {
                    const Icon = item.icon;
                    if (item.subItems) {
                        return (
                            <div key={item.label}>
                                <button
                                    onClick={() => toggleMenu(item.label)}
                                    className={`flex items-center justify-between w-full px-6 py-3 transition-colors hover:bg-blue-800/50 text-white`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Icon className="w-5 h-5" />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </div>
                                    {expandedMenu[item.label] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {expandedMenu[item.label] && (
                                    <div className="bg-blue-900/40">
                                        {item.subItems.map((subItem) => (
                                            <NavLink
                                                key={subItem.path}
                                                to={subItem.path}
                                                className={({ isActive }) =>
                                                    `flex items-center space-x-3 pl-14 pr-6 py-2 transition-colors ${isActive
                                                        ? 'text-yellow-400 font-medium'
                                                        : 'text-blue-100 hover:text-white hover:bg-blue-800/30'
                                                    }`
                                                }
                                            >
                                                <span className="text-sm">{subItem.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-6 py-3 transition-colors ${isActive
                                    ? 'bg-blue-700 border-l-4 border-yellow-400'
                                    : 'hover:bg-blue-800/50'
                                }`
                            }
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-medium">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Settings & Logout */}
            <div className="border-t border-blue-700/50">
                <button
                    className="flex items-center space-x-3 px-6 py-3 w-full hover:bg-blue-800/50 transition-colors"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">Settings</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-6 py-3 w-full hover:bg-blue-800/50 transition-colors text-red-300"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
