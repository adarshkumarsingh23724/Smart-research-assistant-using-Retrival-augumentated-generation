import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Files, Layers, Sparkles } from 'lucide-react';
import { fetchCourses } from '../api';
import CourseCard from '../components/CourseCard';

const Dashboard = () => {
    const [courses, setCourses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await fetchCourses();
            setCourses(data || []);
        } catch (err) {
            console.error("Failed to load courses", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalFiles = courses.reduce((acc, c) => acc + (c.file_count || 0), 0);

    return (
        <div className="min-h-screen bg-transparent text-[var(--text-main)] font-sans overflow-y-auto">
            {/* Hero Header (Clean & Interactive) */}
            <div className="sticky top-0 z-40 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 md:px-10 py-5 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm transition-transform active:scale-95">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-0.5">Academic Dashboard</p>
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)] leading-none">
                                My <span className="text-indigo-600 dark:text-indigo-400">Classes</span>
                            </h1>
                        </div>
                    </div>

                    <div className="relative group w-full sm:w-96 sm:mr-16 transition-all duration-300">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find a course..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-full py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-[14px] font-medium placeholder-[var(--text-muted)] shadow-lg"
                        />
                        {searchQuery && (
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                {filteredCourses.length} results
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-10">
                {/* Stats Row */}
                {!loading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12 animate-in text-[var(--text-main)]">
                        <div className="glass-card rounded-2xl p-6 flex items-center gap-5 transition-all hover:-translate-y-1 group">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-[var(--text-main)] leading-none mb-1">{courses.length}</p>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Courses</p>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6 flex items-center gap-5 transition-all hover:-translate-y-1 group">
                            <div className="w-12 h-12 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                <Files size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-[var(--text-main)] leading-none mb-1">{totalFiles}</p>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Files Synced</p>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6 flex items-center gap-5 transition-all hover:-translate-y-1 group col-span-2 sm:col-span-1">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                <Layers size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-[var(--text-main)] leading-none mb-1">{courses.filter(c => (c.file_count || 0) > 0).length}</p>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">With Materials</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Course Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-72 rounded-3xl shimmer" />
                        ))}
                    </div>
                ) : filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
                        {filteredCourses.map((course, idx) => (
                            <div key={course.id} className="animate-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                <CourseCard course={course} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 dark:border-slate-700/50 rounded-3xl text-center bg-white/50 dark:bg-slate-800/20">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 dark:from-indigo-500/10 to-violet-50 dark:to-violet-500/10 text-indigo-400 dark:text-indigo-500 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-inner">
                            <BookOpen size={36} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No Courses Found</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">
                            {searchQuery ? `No courses match "${searchQuery}". Try a different search.` : 'No course data available yet. Make sure the backend is running.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
