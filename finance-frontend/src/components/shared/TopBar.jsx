import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, CheckCircle, DollarSign, UserPlus, FileText, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ title, subtitle }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);
    const profilePhoto = localStorage.getItem('profile_photo');

    // Sample notification data
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            type: 'project_approval',
            title: 'Project Approved',
            message: 'AI-Powered Medical Diagnosis System has been approved',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            read: false,
            actionUrl: '/admin/approve-projects'
        },
        {
            id: 2,
            type: 'fund_request',
            title: 'New Fund Request',
            message: 'Dr. Sharma requested ₹15L for equipment purchase',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
            read: false,
            actionUrl: '/admin/fund-requests'
        },
        {
            id: 3,
            type: 'faculty_assignment',
            title: 'Faculty Assigned',
            message: 'Dr. Vikram Singh assigned to Smart Traffic Management',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            read: false,
            actionUrl: '/admin/assign-faculty'
        }
    ]);

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

    // Get notification icon and color based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'project_approval':
                return { Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' };
            case 'fund_request':
                return { Icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' };
            case 'faculty_assignment':
                return { Icon: UserPlus, color: 'text-maroon-600', bg: 'bg-maroon-50' };
            case 'report_ready':
                return { Icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' };
            default:
                return { Icon: Bell, color: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    // Format timestamp to relative time
    const getRelativeTime = (timestamp) => {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    };

    // Mark notification as read
    const markAsRead = (id) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    // Mark all as read
    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    // Handle notification click
    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
        }
        setShowNotifications(false);
    };

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-8 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                </div>

                <div className="flex items-center space-x-6">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 w-64 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500"
                        />
                    </div>

                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative focus:outline-none"
                        >
                            <Bell className="w-5 h-5 text-gray-600 cursor-pointer hover:text-maroon-800 transition-colors" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-xs text-white flex items-center justify-center shadow-sm">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden">
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>

                                {/* Notification List */}
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-gray-500">
                                            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                            <p className="text-sm">No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map((notification) => {
                                            const { Icon, color, bg } = getNotificationIcon(notification.type);
                                            return (
                                                <div
                                                    key={notification.id}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className={`px-4 py-3 border-b border-gray-100 dark:border-slate-800/50 cursor-pointer transition-colors ${notification.read ? 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50' : 'bg-maroon-50 dark:bg-maroon-900/20 hover:bg-maroon-100 dark:hover:bg-maroon-900/30'
                                                        }`}
                                                >
                                                    <div className="flex items-start space-x-3">
                                                        <div className={`${bg} p-2 rounded-lg flex-shrink-0`}>
                                                            <Icon className={`w-4 h-4 ${color}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between">
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {notification.title}
                                                                </p>
                                                                {!notification.read && (
                                                                    <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                                {notification.message}
                                                            </p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                {getRelativeTime(notification.timestamp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Footer */}
                                {notifications.length > 0 && (
                                    <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/20">
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-sm text-maroon-600 dark:text-maroon-400 hover:text-maroon-700 dark:hover:text-maroon-300 font-medium"
                                        >
                                            Mark all as read
                                        </button>
                                        <button
                                            onClick={() => setShowNotifications(false)}
                                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User */}
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-maroon-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-maroon-100 dark:border-maroon-900 overflow-hidden">
                            {profilePhoto ? (
                                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
