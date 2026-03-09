import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
    Menu,
    User,
    Grid
} from 'lucide-react';

const Navbar = ({ courseName, courseId }) => {
    return (
        <nav className="sticky top-0 z-50 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border-subtle)] shadow-2xl h-16 flex items-center px-4 md:px-6 transition-all duration-300">
            <div className="flex-1 flex items-center gap-4">
                {/* Hamburger Menu (Visual only) */}
                <button className="p-2.5 rounded-full hover:bg-[var(--border-subtle)] transition-all text-[var(--text-muted)] active:scale-90 focus:outline-none ring-1 ring-[var(--border-subtle)]">
                    <Menu size={24} />
                </button>
                
                {/* Branding / Course Title */}
                <Link to="/" className="flex items-center group transition-transform active:scale-[0.98]">
                    {courseName ? (
                        <h1 className="text-[18px] sm:text-[22px] font-semibold text-[var(--text-main)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {courseName}
                        </h1>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-[22px] font-bold text-[var(--text-main)] tracking-tight">Research <span className="text-indigo-600 dark:text-indigo-500">Matrix</span></span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Center: Google Classroom Style Tabs */}
            {courseId && (
                <div className="hidden md:flex flex-1 justify-center h-full">
                    <div className="flex h-full gap-2">
                        <NavLink 
                            to={`/course/${courseId}`} 
                            end
                            className={({ isActive }) => `
                                relative flex items-center justify-center px-6 h-full text-[14px] font-bold tracking-wide transition-all duration-300
                                ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] rounded-t-lg'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    AI Chat
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 rounded-t-full transition-all duration-300 animate-in fade-in slide-in-from-bottom-1"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                        <NavLink 
                            to={`/course/${courseId}/classwork`}
                            className={({ isActive }) => `
                                relative flex items-center justify-center px-6 h-full text-[14px] font-bold tracking-wide transition-all duration-300
                                ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] rounded-t-lg'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    Classwork
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 rounded-t-full transition-all duration-300 animate-in fade-in slide-in-from-bottom-1"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                        <NavLink 
                            to={`/course/${courseId}/matrix`}
                            className={({ isActive }) => `
                                relative flex items-center justify-center px-6 h-full text-[14px] font-bold tracking-wide transition-all duration-300
                                ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] rounded-t-lg'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    Matrix Ops
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 rounded-t-full transition-all duration-300 animate-in fade-in slide-in-from-bottom-1"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    </div>
                </div>
            )}

            {/* Right: Actions & Profile */}
            <div className="flex-1 flex items-center justify-end gap-2 md:gap-4">
                <button className="p-2.5 rounded-full hover:bg-[var(--border-subtle)] transition-all text-[var(--text-muted)] active:scale-90">
                    <Grid size={24} strokeWidth={1.5} />
                </button>
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-2xl transition-all cursor-pointer ring-1 ring-white/10 active:scale-90">
                    A
                </div>
            </div>
            
        </nav>
    );
};

export default Navbar;
