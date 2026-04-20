import React, { useState, useEffect } from 'react';
import { useParams, Outlet, NavLink } from 'react-router-dom';
import { Zap, RefreshCw, Clock } from 'lucide-react';
import { syncCourse } from '../api';

const ClassDetails = () => {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    const gradients = [
        'from-indigo-500 to-violet-600',
        'from-blue-500 to-indigo-600',
        'from-violet-500 to-fuchsia-600',
        'from-emerald-500 to-teal-600',
        'from-rose-500 to-pink-600',
        'from-amber-500 to-orange-600',
        'from-cyan-500 to-blue-600',
        'from-pink-500 to-rose-600',
    ];

    let hash = 0;
    for (let i = 0; i < (courseId || "").length; i++) {
        hash = (courseId || "").charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIdx = Math.abs(hash) % gradients.length;

    useEffect(() => {
        const loadCourse = async () => {
            // Reset immediately so old course data never bleeds through
            setCourse(null);
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:8000/api/courses/${courseId}`);
                if (!res.ok) throw new Error('Course not found');
                const raw = await res.json();
                // Flatten: merge top-level + metadata into one flat object
                const meta = raw.metadata || {};
                setCourse({
                    ...raw,
                    announcements: meta.announcements || [],
                    coursework: meta.coursework || [],
                    materials: meta.materials || [],
                    local_files: meta.local_files || [],
                    last_sync: raw.last_sync || meta.last_sync,
                });
            } catch (err) {
                console.error("Failed to load course details", err);
            } finally {
                setLoading(false);
            }
        };
        loadCourse();
    }, [courseId]);


    const handleSync = async () => {
        setSyncing(true);
        setSyncMsg('');
        try {
            const res = await syncCourse(courseId, false);
            setSyncMsg(res.message || 'Sync started!');
        } catch {
            setSyncMsg('Sync failed.');
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncMsg(''), 5000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/5 border-b-indigo-500 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Loading course…</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-rose-500/10 text-rose-400 rounded-3xl flex items-center justify-center mb-2 shadow-inner">
                    <Zap size={36} />
                </div>
                <h2 className="text-2xl font-bold text-white">Course Not Found</h2>
                <p className="text-slate-500 text-sm">This course could not be loaded.</p>
            </div>
        );
    }

    // Last sync display
    let syncLabel = null;
    if (course.last_sync) {
        const d = new Date(course.last_sync);
        syncLabel = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="min-h-screen bg-transparent text-[var(--text-main)] font-sans flex flex-col">
            {/* Sticky Sub-Header */}
            <header className="px-8 py-5 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border-subtle)] sticky top-0 z-[55] transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Course identity */}
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradients[colorIdx]} flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0`}>
                            <Zap size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 leading-none mb-1.5 flex items-center gap-2">
                                <span className="w-2 h-0.5 bg-indigo-500/50 rounded-full"></span>
                                Active Course
                            </p>
                            <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight leading-tight truncate max-w-xs sm:max-w-sm md:max-w-lg">
                                {course.name}
                            </h2>
                            {syncLabel && (
                                <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
                                    <Clock size={12} className="text-gray-400 dark:text-gray-500" />
                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Synced {syncLabel}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Tab nav + sync button */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Sync Button */}
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            title="Sync course from Google Classroom"
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all disabled:opacity-40"
                        >
                            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                        </button>

                        {/* Tab picker */}
                        <div className="flex items-center gap-1 bg-[var(--border-subtle)] p-1.5 rounded-2xl backdrop-blur-sm border border-[var(--border-subtle)]">
                            <NavLink
                                to={`/course/${course.id}/classwork`}
                                className={({ isActive }) => `
                                    px-5 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all
                                    ${isActive ? 'bg-[var(--text-main)] text-[var(--bg-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                                `}
                            >
                                Classwork
                            </NavLink>
                            <NavLink
                                to={`/course/${course.id}/stream`}
                                className={({ isActive }) => `
                                    px-5 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all
                                    ${isActive ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                                `}
                            >
                                AI Chat
                            </NavLink>
                            <NavLink
                                to={`/course/${course.id}/assessments`}
                                className={({ isActive }) => `
                                    px-5 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all
                                    ${isActive ? 'bg-orange-600/10 dark:bg-orange-600/20 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                                `}
                            >
                                Assessments
                            </NavLink>
                            <NavLink
                                to={`/course/${course.id}/upload`}
                                className={({ isActive }) => `
                                    px-5 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all
                                    ${isActive ? 'bg-fuchsia-600/10 dark:bg-fuchsia-600/20 text-fuchsia-600 dark:text-fuchsia-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                                `}
                            >
                                Upload Notes
                            </NavLink>
                        </div>
                    </div>
                </div>

                {/* Sync message toast */}
                {syncMsg && (
                    <div className="mt-3 px-4 py-2 bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-800 rounded-xl text-xs font-medium text-indigo-700 dark:text-indigo-300 animate-in">
                        {syncMsg}
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto">
                <Outlet context={{ course, handleSync, syncing }} />
            </main>
        </div>
    );
};

export default ClassDetails;
