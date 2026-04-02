import { useState, useCallback } from 'react';

/**
 * Shared toast hook used site-wide to replace window.alert().
 * Returns { toast, showToast, ToastPortal }
 *
 * Usage:
 *   const { showToast, ToastPortal } = useToast();
 *   showToast('Done!');                  // green success
 *   showToast('Something broke', 'error'); // red error
 *   showToast('Heads up', 'info');       // blue info
 *
 *   // Render ToastPortal somewhere near the root of your component:
 *   return <div> ... <ToastPortal /> </div>;
 */
const useToast = () => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const ToastPortal = () => {
        if (!toast) return null;
        const colors = {
            success: 'bg-emerald-600',
            error: 'bg-red-600',
            info: 'bg-blue-600',
            warning: 'bg-amber-500',
        };
        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠',
        };
        return (
            <div
                className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold animate-in slide-in-from-top-2 duration-300 max-w-sm ${colors[toast.type] || colors.success}`}
            >
                <span className="text-base">{icons[toast.type] || icons.success}</span>
                <span className="flex-1">{toast.message}</span>
                <button
                    onClick={() => setToast(null)}
                    className="opacity-70 hover:opacity-100 text-lg leading-none ml-1"
                    aria-label="Close"
                >
                    &times;
                </button>
            </div>
        );
    };

    return { showToast, ToastPortal };
};

export default useToast;
