import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
    Cpu,
    Compass,
    Shield,
    ChevronRight,
    BookOpen
} from 'lucide-react';
import { fetchCourses } from '../api';

const Sidebar = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchCourses();
                setCourses(data || []);
            } catch (err) {
                console.error("Sidebar loading error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const avatarColors = [
        'bg-blue-100 text-blue-600',
        'bg-indigo-100 text-indigo-600',
        'bg-emerald-100 text-emerald-600',
        'bg-orange-100 text-orange-600',
        'bg-pink-100 text-pink-600',
        'bg-purple-100 text-purple-600',
        'bg-teal-100 text-teal-600',
        'bg-rose-100 text-rose-600',
    ];

    return (
        <aside className="w-72 h-screen bg-[var(--glass-bg)] backdrop-blur-2xl border-r border-[var(--border-subtle)] flex flex-col fixed left-0 top-0 z-[60] shadow-2xl transition-all duration-300">
            {/* Logo area - Clean and School-centric */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 transition-transform active:scale-95">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:rotate-12 transition-all duration-300">
                        <BookOpen size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-[var(--text-main)] tracking-tight block leading-none">AI Tutor</span>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1 block">Contextual RAG</span>
                    </div>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 overflow-y-auto scrollbar-none">
                {/* Core Hub */}
                <div className="mb-4 pr-3">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => `
                            flex items-center gap-4 px-6 py-3 rounded-r-full transition-all text-[14px] font-medium
                            ${isActive ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)]'}
                        `}
                    >
                        <Compass className={`${window.location.pathname === '/' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} size={20} />
                        Dashboard
                    </NavLink>
                </div>

                <div className="w-full h-px bg-gray-100 dark:bg-slate-800 my-2" />

                {/* Course List */}
                <div className="mt-4">
                    <div className="px-6 flex items-center mb-2">
                        <h4 className="text-[12px] font-medium tracking-wide text-gray-500 dark:text-gray-500">
                            Enrolled
                        </h4>
                    </div>

                    {loading ? (
                        <div className="px-3 pr-4 space-y-2 mt-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex items-center gap-4 py-2 px-3">
                                    <div className="w-9 h-9 rounded-full shimmer shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-3 w-3/4 rounded-md shimmer" />
                                        <div className="h-2 w-1/2 rounded-md shimmer" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-0.5 pr-3 mt-1">
                            {courses.map((course, idx) => {
                                const colorClass = avatarColors[idx % avatarColors.length];
                                const firstLetter = course.name ? course.name.charAt(0).toUpperCase() : '?';
                                
                                return (
                                    <NavLink
                                        key={course.id}
                                        to={`/course/${course.id}/classwork`}
                                        className={({ isActive }) => `
                                            flex items-center gap-4 px-6 py-2.5 rounded-r-full transition-all group relative cursor-pointer active:scale-95
                                            ${isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400'
                                                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-gray-200'}
                                        `}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-medium shrink-0 transition-transform group-hover:scale-105 ${colorClass}`}>
                                                    {firstLetter}
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className={`text-[14px] truncate leading-snug ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-[var(--text-main)] font-medium'}`}>
                                                        {course.name}
                                                    </span>
                                                    {(course.section || course.descriptionHeading) && (
                                                        <span className="text-[12px] text-[var(--text-muted)] truncate leading-snug group-hover:opacity-80 transition-opacity">
                                                            {course.section || course.descriptionHeading}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    )}
                </div>
            </nav>

            {/* Footer - Subtle Status Indicator */}
            <div className="p-5 mt-auto border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--border-subtle)] rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                            <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75" />
                        </div>
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            Server Online
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
