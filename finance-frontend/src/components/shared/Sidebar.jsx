import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { Button } from '../ui/button';
import {
    LogOut, Home, FileText, IndianRupee, Users, Building2,
    Settings, CheckCircle, UserPlus, BarChart3, Clock, Calendar, X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const profilePhoto = localStorage.getItem('profile_photo');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getNavItems = () => {
        switch (user?.role) {
            case ROLES.ADMIN:
                return [
                    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
                    { label: 'Projects', path: '/admin/approve-projects', icon: CheckCircle },
                    { label: 'Manage Faculty / Projects', path: '/admin/assign-faculty', icon: Users },
                    { label: 'Fund Requests', path: '/admin/fund-requests', icon: IndianRupee },
                    { label: 'OD Requests', path: '/admin/od-requests', icon: Clock },
                    { label: 'Event Requests', path: '/admin/event-requests', icon: Calendar },
                    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
                ];
            case ROLES.FACULTY:
                return [
                    { label: 'Dashboard', path: '/faculty/dashboard', icon: Home },
                    { label: 'My Projects', path: '/faculty/projects', icon: FileText },
                    { label: 'Request Funds', path: '/faculty/request-funds', icon: IndianRupee },
                    { label: 'Documents', path: '/faculty/documents', icon: FileText },
                ];
            case ROLES.FINANCE_OFFICER:
                return [
                    { label: 'Dashboard', path: '/finance/dashboard', icon: Home },
                    { label: 'Fund Releases', path: '/finance/fund-flow', icon: IndianRupee },
                    { label: 'PFMS Tracking', path: '/finance/pfms', icon: FileText },
                    { label: 'Internship Fees', path: '/finance/internships', icon: Users },
                    { label: 'Settlement', path: '/finance/reports', icon: Clock },
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
                <nav className="flex-1 py-4">
                    {getNavItems().map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-6 py-3 transition-colors ${isActive
                                    ? 'bg-[#5c1227] border-l-4 border-amber-400'
                                    : 'hover:bg-maroon-800/50'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Settings & Logout */}
                <div className="border-t border-maroon-700/50">
                    <Link
                        to="/admin/settings"
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
