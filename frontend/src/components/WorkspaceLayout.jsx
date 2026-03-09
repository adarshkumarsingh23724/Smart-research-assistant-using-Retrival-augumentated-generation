import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Sun, Moon, LogOut, User } from 'lucide-react';
import { getAuthStatus, logoutUser } from '../api';

const WorkspaceLayout = () => {
    const [user, setUser] = useState(null);
    const [isDark, setIsDark] = useState(() => {
        const theme = localStorage.getItem('theme');
        return theme ? theme === 'dark' : true;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    useEffect(() => {
        // Fetch user info for the top bar
        const fetchUser = async () => {
            const status = await getAuthStatus();
            if (status.authenticated && status.user) {
                setUser(status.user);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await logoutUser();
        window.location.href = '/';
    };

    return (
        <div className="flex min-h-screen bg-transparent dark:bg-transparent">
            {/* Persistent Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 ml-72 relative min-h-screen">
                {/* Global Bottom Bar - Bottom Right */}
                <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-4">
                    
                    {/* User Profile */}
                    {user && (
                        <div className="flex items-center gap-3 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--border-subtle)] px-4 py-2 rounded-full shadow-lg">
                            {user.picture ? (
                                <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <User size={16} />
                                </div>
                            )}
                            <span className="text-sm font-medium text-[var(--text-main)] hidden md:block">
                                {user.name || user.email}
                            </span>
                        </div>
                    )}

                    {/* Theme Toggle */}
                    <button 
                        onClick={() => setIsDark(!isDark)}
                        className="p-3 justify-center rounded-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--border-subtle)] text-[var(--text-main)] shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer group flex items-center"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <Sun size={20} className="text-amber-400 group-hover:rotate-90 transition-transform duration-500" />
                        ) : (
                            <Moon size={20} className="text-indigo-600 group-hover:rotate-12 transition-transform" />
                        )}
                    </button>

                    {/* Logout Button */}
                    <button 
                        onClick={handleLogout}
                        className="p-3 justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20 shadow-lg hover:bg-red-100 dark:hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>

                <div className="w-full">
                    <Outlet context={{ isDark }} />
                </div>
            </main>
        </div>
    );
};

export default WorkspaceLayout;
