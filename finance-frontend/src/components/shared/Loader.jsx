import React from 'react';

const Loader = ({ size = "md", message = "Loading data..." }) => {
    const sizeClasses = {
        sm: "w-5 h-5 border-2",
        md: "w-8 h-8 border-3",
        lg: "w-12 h-12 border-4"
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 w-full">
            <div className={`${sizeClasses[size]} border-maroon-600/20 border-t-maroon-600 rounded-full animate-spin mb-4`} />
            {message && (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );
};

export default Loader;
