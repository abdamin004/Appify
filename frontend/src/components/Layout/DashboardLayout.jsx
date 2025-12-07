import React, { useState } from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children, menuItems, activeTab, setActiveTab }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to closed

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="drawer">
            <input id="my-drawer-2" type="checkbox" className="drawer-toggle" checked={isSidebarOpen} onChange={toggleSidebar} />
            <div className="drawer-content flex flex-col min-h-screen bg-white">
                {/* Navbar */}
                <div className="w-full navbar bg-white border-b border-slate-200 sticky top-0 z-30">
                    <div className="flex-none">
                        <label htmlFor="my-drawer-2" aria-label="open sidebar" className="btn btn-square btn-ghost text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </label>
                    </div>
                    <div className="flex-1 px-2 mx-2">
                        <span className="text-xl font-bold text-emerald-700">
                            GUC Events
                        </span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6 lg:p-10 flex-grow bg-slate-50">
                    {children}
                </div>
            </div>

            <Sidebar
                menuItems={menuItems}
                isOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </div>
    );
};

export default DashboardLayout;
