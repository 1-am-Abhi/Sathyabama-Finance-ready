import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { LayoutProvider, useLayout } from '../../contexts/LayoutContext';

const DashboardLayoutContent = ({ children }) => {
    const { title, description } = useLayout();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const mainRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo(0, 0);
        }
    }, [location.pathname]);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar title={title} subtitle={description} onMenuClick={() => setIsSidebarOpen(true)} />
                <main ref={mainRef} className="flex-1 overflow-auto">
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
