import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, CheckCircle, DollarSign, UserPlus, FileText, X, User, Settings, ChevronDown, Menu, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TopBar = ({ title, subtitle, onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const userId = user?.id || user?._id;

    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`/notifications/${userId}`);
            setNotifications(res.data.data || []);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const filteredNotifications = Array.isArray(notifications) ? notifications.filter(n => !n.isRead) : [];
    const unreadCount = filteredNotifications.length;

    const clearAll = async () => {
        try {
            await axios.patch(`/notifications/mark-all-read/${userId}`);
            fetchNotifications();
        } catch (error) {
            console.error("Failed to clear notifications", error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await axios.patch(`/notifications/read/${id}`);
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    useEffect(() => {
        if (userId) fetchNotifications();
    }, [userId]);
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

    if (!userId) {
        return (
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     <div className="animate-pulse w-8 h-8 bg-gray-100 dark:bg-slate-800 rounded-full"></div>
                </div>
            </div>
        );
    }

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
        markAsRead(notification._id || notification.id);
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
        }
        setShowNotifications(false);
    };

    // No need for local unreadCount calculation, it comes from context

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
                                    // Global search coming soon – no popup
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
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{subtitle}</p>
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
                                        // Global search coming soon – no popup
                                    }
                                }}
                            />
                        </div>
                    </div>



                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <Bell className="w-6 h-6 dark:text-gray-300" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right transition-all">
                                    <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">You have {unreadCount} unread alerts</p>
                                        </div>
                                    </div>

                                    <div className="max-h-[400px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center flex flex-col items-center">
                                                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                                    <Bell className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">You're all caught up!</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {(notifications || []).map((notification) => {
                                                    const { Icon, color, bg } = getNotificationIcon(notification.type?.toLowerCase());
                                                    return (
                                                        <div
                                                            key={notification._id || notification.id}
                                                            onClick={() => handleNotificationClick(notification)}
                                                            className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!notification.isRead && !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className={`mt-1 flex-shrink-0 w-10 h-10 ${bg} dark:bg-opacity-10 rounded-full flex items-center justify-center`}>
                                                                    <Icon className={`w-5 h-5 ${color}`} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className={`text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5`}>
                                                                        {notification.title || 'Notification'}
                                                                    </p>
                                                                    <p className={`text-sm ${!notification.isRead && !notification.read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                                                        {notification.message}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1.5">
                                                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                                                            {getRelativeTime(notification.createdAt || notification.time)}
                                                                        </span>
                                                                        {(!notification.isRead && !notification.read) && (
                                                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {(filteredNotifications || []).length > 0 && (
                                        <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                            <button 
                                                onClick={() => clearAll()}
                                                className="text-xs font-semibold text-maroon-600 hover:text-maroon-700 dark:text-maroon-400 transition-colors"
                                            >
                                                Mark all as read
                                            </button>
                                            
                                            <button 
                                                onClick={() => {
                                                    // In a real app we'd call an API to delete, but clearing locally works
                                                    // if clearAll is supported in context
                                                    if(typeof clearAll === 'function') clearAll();
                                                    setShowNotifications(false);
                                                }}
                                                className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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
                                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg px-2 py-1 transition-colors min-h-[40px]"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                <div className="flex-shrink-0 w-8 h-8 bg-maroon-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-maroon-100 dark:border-maroon-900 overflow-hidden shadow-sm">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()
                                    )}
                                </div>
                                <div className="hidden md:flex flex-col items-end overflow-hidden max-w-[150px]">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-maroon-600 dark:text-maroon-400 leading-tight mb-0.5 italic truncate w-full text-right">
                                        {user?.role === 'FACULTY' ? (user?.department || 'Faculty') : user?.role?.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-black text-slate-800 dark:text-white leading-tight tracking-tight italic truncate w-full text-right">
                                        {user?.name}
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
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
