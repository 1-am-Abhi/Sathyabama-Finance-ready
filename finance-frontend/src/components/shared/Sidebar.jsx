import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { ROLES } from '../../constants/roles';
import {
    LogOut, Home, FileText, IndianRupee, Users, Building2,
    Settings, CheckCircle, BarChart3, Clock, Calendar, TrendingUp, ChevronDown, ChevronRight, Briefcase, GraduationCap, X, Sparkles, ShieldCheck, History
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const { getNotificationsByRole } = useNotifications();

    // Filter unread notifications to show dots
    const filteredNotifications = getNotificationsByRole(user?.role);
    const unreadNotifications = filteredNotifications.filter(n => !n.read);

    const navigate = useNavigate();
    const location = useLocation();
    const profilePhoto = localStorage.getItem(`profile_photo_${user?._id || user?.id}`);
    const [expandedMenu, setExpandedMenu] = useState({});

    const toggleMenu = (label) => {
        setExpandedMenu(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Helper to check if item has a related unread notification
    const hasUnread = (path) => {
        if (!path) return false;
        // Check if any unread notification's actionUrl matches the path exactly or loosely
        return unreadNotifications.some(n => n.actionUrl && n.actionUrl.includes(path));
    };

    const getNavItems = () => {
        switch (user?.role) {
            case ROLES.ADMIN:
                return [
                    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
                    { label: 'Projects', path: '/admin/approve-projects', icon: CheckCircle },
                    { label: 'Manage Faculty / Projects', path: '/admin/assign-faculty', icon: Users },
                    { label: 'Fund Requests', path: '/admin/fund-requests', icon: IndianRupee },
                    { label: 'Equipment Requests', path: '/admin/equipment-requests', icon: Briefcase },
                    { label: 'OD Requests', path: '/admin/od-requests', icon: Clock },
                    { label: 'Event Requests', path: '/admin/event-requests', icon: Calendar },
                    { label: 'Revenue Approvals', path: '/admin/revenue-approvals', icon: TrendingUp },
                    { label: 'Internship Approvals', path: '/admin/internship-approvals', icon: Users },
                    { label: 'Document Verification', path: '/admin/documents', icon: ShieldCheck },
                    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
                ];
            case ROLES.FACULTY:
                return [
                    { label: 'Dashboard', path: '/faculty/dashboard', icon: Home },
                    { label: 'My Projects', path: '/faculty/projects', icon: FileText },
                    { label: 'Request Funds', path: '/faculty/request-funds', icon: IndianRupee },
                    { label: 'Documents', path: '/faculty/documents', icon: FileText },
                    { label: 'OD Request', path: '/faculty/od-request', icon: Clock },
                    { label: 'Event Requests', path: '/faculty/event-requests', icon: Calendar },
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
                        path: '/faculty/academic-support'
                    },
                    {
                        label: 'AI Proposal Assistant',
                        icon: Sparkles,
                        path: '/faculty/ai-generator'
                    },
                ];
            case ROLES.FINANCE_OFFICER:
                return [
                    { label: 'Dashboard', path: '/finance/dashboard', icon: Home },
                    { label: 'Disbursements', path: '/finance/disbursements', icon: CheckCircle }, // Modified from 'Fund Releases' to 'Disbursements'
                    { label: 'Disbursal History', path: '/finance/disbursal-history', icon: History },
                    { label: 'Revenue Verification', path: '/finance/revenue-verification', icon: TrendingUp }, // New
                    { label: 'PFMS Tracking', path: '/finance/pfms', icon: FileText },
                    { label: 'Equipment Disbursements', path: '/finance/equipment-disbursements', icon: Briefcase },
                    { label: 'Internship Fees', path: '/finance/internships', icon: Users },
                    { label: 'Settlement', path: '/finance/reports', icon: Clock },
                    { label: 'Financial Reports', path: '/finance/financial-reports', icon: BarChart3 }, // New
                ];
            default:
                return [];
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#7d1935] to-[#a01d45] text-white h-full flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:flex-shrink-0 shadow-xl md:shadow-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Close Button (Mobile) */}
                <button
                    onClick={onClose}
                    className="md:hidden absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
                >
                    <X className="w-5 h-5" />
                </button>
                {/* Logo */}
                <div className="p-4 border-b border-maroon-700/50">
                    <div className="flex flex-col items-center space-y-2">
                        <img
                            src="/sathyabama_header.png"
                            alt="Sathyabama Institute of Science and Technology"
                            className="w-full h-auto max-h-16 object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="hidden w-10 h-10 bg-amber-500 rounded-lg items-center justify-center shadow-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-6 border-b border-maroon-700/50 bg-maroon-900/30">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-maroon-600 rounded-full border-2 border-maroon-400 flex items-center justify-center font-bold overflow-hidden">
                            {profilePhoto ? (
                                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{user?.name}</p>
                            <p className="text-xs text-maroon-200">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {getNavItems().map((item) => {
                        const Icon = item.icon;
                        const itemHasUnread = hasUnread(item.path);

                        if (item.subItems) {
                            return (
                                <div key={item.label}>
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        className={`flex items-center justify-between w-full px-6 py-3 transition-colors hover:bg-maroon-800/50 text-white relative`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Icon className="w-5 h-5" />
                                            <span className="text-sm font-medium">{item.label}</span>
                                            {/* Sub item parent unread dot (assume any subitem has unread) */}
                                        </div>
                                        {expandedMenu[item.label] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    {expandedMenu[item.label] && (
                                        <div className="bg-maroon-900/40">
                                            {item.subItems.map((subItem) => {
                                                const subItemHasUnread = hasUnread(subItem.path);
                                                return (
                                                    <NavLink
                                                        key={subItem.path}
                                                        to={subItem.path}
                                                        onClick={onClose}
                                                        className={({ isActive }) =>
                                                            `flex items-center space-x-3 pl-14 pr-6 py-2 transition-colors relative ${isActive
                                                                ? 'text-amber-400 font-medium'
                                                                : 'text-maroon-100 hover:text-white hover:bg-maroon-800/30'
                                                            }`
                                                        }
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="text-sm">{subItem.label}</span>
                                                            {subItemHasUnread && (
                                                                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                                                            )}
                                                        </div>
                                                    </NavLink>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex items-center justify-between px-6 py-3 transition-colors relative ${isActive
                                        ? 'bg-[#5c1227] border-l-4 border-amber-400'
                                        : 'hover:bg-maroon-800/50'
                                    }`
                                }
                            >
                                <div className="flex items-center space-x-3">
                                    <Icon className="w-5 h-5" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </div>
                                {itemHasUnread && (
                                    <span className="flex h-2.5 w-2.5 mr-2">
                                        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Settings & Logout */}
                <div className="border-t border-maroon-700/50">
                    <Link
                        to={user?.role === 'ADMIN' ? '/admin/settings' : user?.role === 'FACULTY' ? '/faculty/settings' : '/finance/settings'}
                        onClick={onClose}
                        className={`flex items-center space-x-3 px-6 py-3 w-full transition-colors ${location.pathname.includes('/settings')
                            ? 'bg-[#5c1227] border-l-4 border-amber-400'
                            : 'hover:bg-maroon-800/50'
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        <span className="text-sm font-medium">Settings</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-6 py-3 w-full hover:bg-maroon-800/50 transition-colors text-amber-200"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
