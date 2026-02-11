import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { LayoutProvider } from '../../contexts/LayoutContext';

const DashboardLayoutContent = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

const DashboardLayout = ({ children }) => {
    return (
        <LayoutProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </LayoutProvider>
    );
};

export default DashboardLayout;
