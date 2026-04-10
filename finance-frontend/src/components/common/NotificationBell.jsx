import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, ExternalLink, Trash2 } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'ALERT': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getTypeStyles = (type) => {
        switch (type) {
            case 'SUCCESS': return 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800';
            case 'ALERT': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800';
            default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                aria-label="Notifications"
            >
                <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-gray-600 dark:text-gray-400'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-white dark:border-slate-900 shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider italic">Notifications</h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">You have {unreadCount} unread messages</p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead.mutate()}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-tighter flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full transition-all"
                                >
                                    <Check className="w-3 h-3" /> Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {isLoading ? (
                                <div className="p-10 flex flex-col items-center justify-center space-y-3">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-xs text-gray-400 italic">Syncing notifications...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-gray-400">
                                        <Bell className="w-6 h-6 opacity-20" />
                                    </div>
                                    <p className="text-xs text-gray-400 italic">No notifications yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                    {(notifications || []).map((notif) => (
                                        <div
                                            key={notif._id}
                                            className={`p-4 transition-all hover:bg-gray-50 dark:hover:bg-slate-800/50 relative group ${!notif.isRead ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <div className="flex gap-4">
                                                <div className={`mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${getTypeStyles(notif.type)}`}>
                                                    {getTypeIcon(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h4 className={`text-xs font-bold ${notif.isRead ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'} truncate`}>
                                                            {notif.title}
                                                        </h4>
                                                        <span className="text-[9px] text-gray-400 italic shrink-0 whitespace-nowrap ml-2">
                                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[11px] leading-relaxed mb-2 ${notif.isRead ? 'text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {notif.message}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        {!notif.isRead && (
                                                            <button
                                                                onClick={() => markAsRead.mutate(notif._id)}
                                                                className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"
                                                            >
                                                                Mark read
                                                            </button>
                                                        )}
                                                        {notif.relatedId && (
                                                            <button className="text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest flex items-center gap-1">
                                                                View Details <ExternalLink className="w-2.5 h-2.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="absolute top-4 right-4 h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-center">
                                <button className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-widest italic">
                                    View older history
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
