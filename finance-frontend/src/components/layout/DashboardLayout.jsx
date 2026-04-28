import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../shared/Sidebar';
import TopBar from '../shared/TopBar';

const DashboardLayout = () => {
    return (
        <div className="flex min-h-screen bg-lightBg text-lightText dark:bg-darkBg dark:text-darkText">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col">
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
