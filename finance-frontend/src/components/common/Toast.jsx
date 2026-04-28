import React, { useEffect, useState } from 'react';

const Toast = ({ msg, type = 'INFO', onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) setTimeout(onClose, 300); // Wait for fade-out
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        'INFO': 'bg-indigo-500',
        'SUCCESS': 'bg-emerald-500',
        'ALERT': 'bg-red-500',
        'WARNING': 'bg-amber-500'
    };

    if (!isVisible) return null;

    return (
        <div className={`fixed top-6 right-6 ${bgColors[type] || bgColors.INFO} text-white px-6 py-3 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 border border-white/20 backdrop-blur-md`}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-semibold tracking-wide">{msg}</span>
            <button 
                onClick={() => setIsVisible(false)}
                className="ml-4 text-white/60 hover:text-white transition-colors"
            >
                ✕
            </button>
        </div>
    );
};

export default Toast;
