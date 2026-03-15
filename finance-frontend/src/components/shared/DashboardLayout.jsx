import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { LayoutProvider, useLayout } from '../../contexts/LayoutContext';
import AIAssistantWidget from './AIAssistantWidget';

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
        <div className="flex h-screen bg-gray-50 dark:bg-background overflow-hidden transition-colors duration-500">
            {/* Ambient Background Glow for Dark Mode */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-100 transition-opacity duration-1000">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-maroon-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-amber-900/5 rounded-full blur-[100px]" />
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
                <TopBar title={title} subtitle={description} onMenuClick={() => setIsSidebarOpen(true)} />
                <main ref={mainRef} className="flex-1 overflow-auto bg-transparent">
                    {children}
                </main>
                <AIAssistantWidget />
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
