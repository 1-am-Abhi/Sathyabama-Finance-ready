import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

const DateFilter = ({ selectedDate, onChange, placeholder = "Select Date" }) => {
    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
            <input
                type="date"
                className="pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-maroon-500 w-full"
                value={selectedDate || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
};

export default DateFilter;
