import React from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/button';

const TopBar = ({ title, subtitle }) => {
    const { user } = useAuth();
    const { theme, setTheme, toggleTheme } = useTheme();

    return (
        <div className="bg-sathyabama-maroon dark:bg-slate-900 border-b border-white/10 dark:border-slate-800 px-8 py-4 transition-colors duration-200">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
                </div>

                <div className="flex items-center space-x-6">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="pl-10 pr-4 py-2 border border-white/20 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/50 w-64 bg-white/10 dark:bg-slate-800 text-white dark:text-white placeholder-gray-300 dark:placeholder-slate-400 transition-colors duration-200"
                        />
                    </div>

                    {/* Theme Toggle */}
                    <div className="flex items-center bg-white/10 dark:bg-slate-800 rounded-lg p-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme('light')}
                            className={`rounded-md p-1.5 h-8 w-8 hover:bg-white/20 dark:hover:bg-slate-700 ${theme === 'light'
                                ? 'bg-white shadow-sm text-sathyabama-maroon'
                                : 'text-gray-300 dark:text-slate-400'
                                }`}
                        >
                            <Sun className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme('dark')}
                            className={`rounded-md p-1.5 h-8 w-8 hover:bg-white/20 dark:hover:bg-slate-700 ${theme === 'dark'
                                ? 'bg-slate-700 shadow-sm text-blue-400'
                                : 'text-gray-300 dark:text-slate-400'
                                }`}
                        >
                            <Moon className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                        <Bell className="w-5 h-5 text-gray-200 dark:text-slate-400 cursor-pointer hover:text-white" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-sathyabama-gold rounded-full text-xs text-white flex items-center justify-center">
                            3
                        </span>
                    </div>

                    {/* User */}
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold border border-white/10">
                            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white dark:text-white">{user?.name}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
