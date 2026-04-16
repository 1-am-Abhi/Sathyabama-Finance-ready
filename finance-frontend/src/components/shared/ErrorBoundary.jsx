import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl max-w-lg w-full text-center border border-red-100 dark:border-red-900/30">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                            We've encountered an unexpected issue rendering this component. Try reloading the page.
                        </p>
                        <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg text-left overflow-auto max-h-40 mb-6">
                            <code className="text-xs text-red-600 dark:text-red-400 break-words">
                                {this.state.error?.message || 'Unknown render error'}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-maroon-600 hover:bg-maroon-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors w-full"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
