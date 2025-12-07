import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ menuItems, isOpen, toggleSidebar, activeTab, onTabChange }) => {
    const location = useLocation();

    const handleItemClick = (item) => {
        if (item.onClick) {
            item.onClick();
        } else if (onTabChange && item.key) {
            onTabChange(item.key);
        }
        // User requested sidebar to stay open until clicked again
        // toggleSidebar(); 
    };

    return (
        <div className="drawer-side z-50">
            <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>
            <ul className="menu p-4 w-80 min-h-full bg-slate-900 text-slate-200 border-r border-slate-800 shadow-2xl">
                {/* Sidebar Header */}
                {/* Sidebar Header */}
                <li className="mb-6">
                    <div className="flex items-center justify-between px-4 py-2 hover:bg-transparent cursor-default">
                        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">

                            <span className="text-xl font-bold text-emerald-400">GUC Events</span>
                        </Link>
                        <button onClick={toggleSidebar} className="btn btn-square btn-ghost btn-sm text-slate-400 hover:text-white hover:bg-slate-800">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </li>

                {menuItems.map((item, index) => {
                    // Check if item has children (nested menu)
                    if (item.children && item.children.length > 0) {
                        // Check if any child is active to keep the menu open or highlight parent
                        const isChildActive = item.children.some(child =>
                            activeTab ? activeTab === child.key : (child.path && location.pathname === child.path)
                        );

                        return (
                            <li key={index} className="mb-1">
                                <details open={isChildActive}>
                                    <summary className={`group px-4 py-3 rounded-xl transition-all duration-200 font-medium text-slate-400 hover:bg-slate-800 hover:text-white ${isChildActive ? 'text-emerald-400' : ''}`}>
                                        <span className="text-xl">{item.icon}</span>
                                        {item.label}
                                    </summary>
                                    <ul>
                                        {item.children.map((child, childIndex) => {
                                            const isActive = activeTab
                                                ? activeTab === child.key
                                                : (child.path && location.pathname === child.path);

                                            const childClass = `w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${isActive
                                                ? 'bg-emerald-600 text-white shadow-md'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                }`;

                                            return (
                                                <li key={`${index}-${childIndex}`} className="mb-1">
                                                    {child.onClick || onTabChange ? (
                                                        <button
                                                            className={childClass}
                                                            onClick={() => handleItemClick(child)}
                                                        >
                                                            <span className="text-lg">{child.icon}</span>
                                                            {child.label}
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            to={child.path}
                                                            className={childClass}
                                                        >
                                                            <span className="text-lg">{child.icon}</span>
                                                            {child.label}
                                                        </Link>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </details>
                            </li>
                        );
                    }

                    // Determine active state for non-nested items:
                    // 1. If activeTab is passed, match item.key
                    // 2. If item has a path, match location.pathname
                    const isActive = activeTab
                        ? activeTab === item.key
                        : (item.path && location.pathname === item.path);

                    const isButton = Boolean(onTabChange || item.onClick);

                    const itemClass = `w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`;

                    return (
                        <li key={index} className="mb-1">
                            {isButton ? (
                                <button
                                    className={itemClass}
                                    onClick={() => handleItemClick(item)}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    {item.label}
                                    {item.badge > 0 && (
                                        <span className="ml-auto bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </button>
                            ) : (
                                <Link
                                    to={item.path}
                                    className={itemClass}
                                    onClick={() => {
                                        // For links, we might still want to close on mobile, but user said "keep appearing"
                                        // We'll leave it open for now to be consistent
                                    }}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default Sidebar;
