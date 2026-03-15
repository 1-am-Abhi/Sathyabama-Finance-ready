import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, CheckCircle, DollarSign, UserPlus, FileText, X, User, Settings, ChevronDown, Menu, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

const TopBar = ({ title, subtitle, onMenuClick }) => {
    const { user, logout } = useAuth();
    const { notifications, markAsRead: contextMarkAsRead } = useNotifications();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const notificationRef = useRef(null);
    const profileRef = useRef(null);
    const timeoutRef = useRef(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const profilePhoto = localStorage.getItem('profile_photo');

    useEffect(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDarkMode(true);
        } else {
            setIsDarkMode(false);
        }
    }, []);

    const toggleTheme = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setIsDarkMode(true);
        }
    };



    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };

        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications]);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

    // Get notification icon and color based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'project_approval':
            case 'success':
                return { Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' };
            case 'fund_request':
            case 'finance':
                return { Icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' };
            case 'faculty_assignment':
                return { Icon: UserPlus, color: 'text-maroon-600', bg: 'bg-maroon-50' };
            case 'report_ready':
            case 'summary':
                return { Icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' };
            case 'error':
            case 'rejection':
                return { Icon: X, color: 'text-red-600', bg: 'bg-red-50' };
            default:
                return { Icon: Bell, color: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    // Format timestamp to relative time
    const getRelativeTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const now = new Date();
        const then = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
        const diff = now - then;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    };

    // Handle notification click
    const handleNotificationClick = (notification) => {
        contextMarkAsRead(notification.id);
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
        }
        setShowNotifications(false);
    };

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-8 py-4 relative">
            {/* Mobile Search Overlay */}
            {isSearchOpen && (
                <div className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex items-center px-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="relative flex-1 mr-4">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:bg-slate-800 dark:text-white"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    alert("Global search is coming soon! Please use the filters on specific pages.");
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setIsSearchOpen(false)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <Menu className="w-6 h-6 dark:text-gray-200" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Search */}
                    {/* Search */}
                    {/* Search */}
                    <div className="flex items-center">
                        <button
                            className="md:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            onClick={() => setIsSearchOpen(true)}
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        <div className="hidden md:block relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 w-64 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        alert("Global search is coming soon! Please use the filters on specific pages.");
                                    }
                                }}
                            />
                        </div>
                    </div>



                    <div className="flex items-center gap-3">
                        {/* User Profile with Dropdown */}
                        <div
                            className="relative"
                            ref={profileRef}
                            onMouseEnter={() => {
                                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                                setShowProfileMenu(true);
                            }}
                            onMouseLeave={() => {
                                timeoutRef.current = setTimeout(() => {
                                    setShowProfileMenu(false);
                                }, 250);
                            }}
                        >
                            {/* Profile Trigger */}
                            <div
                                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg px-2 py-1.5 transition-colors h-10"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                <div className="w-8 h-8 md:w-8 md:h-8 bg-maroon-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-maroon-100 dark:border-maroon-900 overflow-hidden">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()
                                    )}
                                </div>
                                <div className="hidden md:block text-right">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">{user?.name || 'User'}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-none mt-1">{user?.role || 'Role'}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            </div>

                            {/* Profile Dropdown Menu */}
                            {showProfileMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden">
                                    <div className="py-2">
                                        <button
                                            onClick={() => {
                                                const basePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'FACULTY' ? '/faculty' : '/finance';
                                                navigate(`${basePath}/profile`);
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
                                        >
                                            <User className="w-4 h-4" />
                                            <span className="text-sm font-medium">Profile</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const basePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'FACULTY' ? '/faculty' : '/finance';
                                                navigate(`${basePath}/settings`);
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
                                        >
                                            <Settings className="w-4 h-4" />
                                            <span className="text-sm font-medium">Settings</span>
                                        </button>
                                        <div className="border-t border-gray-100 dark:border-slate-800 my-1"></div>
                                        <button
                                            onClick={() => {
                                                logout();
                                                navigate('/login');
                                            }}
                                            className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-3 text-red-600 dark:text-red-400"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="text-sm font-medium">Logout</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Theme Toggle After Dropdown */}
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
