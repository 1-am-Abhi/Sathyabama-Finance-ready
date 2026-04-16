import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ 
    message = "No data available", 
    description = "There are no records to display at the moment.",
    icon: Icon = Inbox
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50/50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-600 mb-4">
                <Icon size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {message}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {description}
            </p>
        </div>
    );
};

export default EmptyState;
