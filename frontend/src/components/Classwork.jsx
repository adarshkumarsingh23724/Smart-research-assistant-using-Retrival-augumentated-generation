import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
    FileText, Clock, ChevronRight, Search, Folder,
    ClipboardList, Download, ExternalLink, RefreshCw
} from 'lucide-react';
import { getCourseFileUrl } from '../api';

// ── Shared Individual File Row (Nested Attachment Style) ──────────────────
const FileRow = ({ item, courseId, accentColor, localFiles }) => {
    const isLocal = localFiles.includes(item?.driveFile?.driveFile?.title);
    const driveFile = item?.driveFile?.driveFile || {};
    const link = item?.alternateLink;
    const isDoc = driveFile.title?.toLowerCase().includes('.doc') || driveFile.title?.toLowerCase().includes('.pdf') || driveFile.title?.toLowerCase().includes('.ppt');
    const Icon = isDoc ? FileText : ExternalLink;
    return (
        <div className="group glass-card rounded-2xl transition-all duration-300 relative mt-4 hover:border-indigo-400 hover:shadow-indigo-500/10 hover:-translate-y-0.5">
            <Link to={`/course/${courseId}/material/${encodeURIComponent(driveFile.title || item.title)}`} className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20" />
            
            {/* Top row: Badge & Title */}
            <div className="px-5 py-4 flex items-start gap-4 pointer-events-none">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-indigo-600 dark:bg-indigo-500 shadow-sm shrink-0 group-hover:bg-indigo-700 dark:group-hover:bg-indigo-600 transition-colors group-hover:scale-105 duration-300`}>
                    <ClipboardList size={18} />
                </div>
                
                <div className="flex-1 min-w-0 pr-4 mt-0.5">
                    <h4 className="text-[15px] font-bold text-[var(--text-main)] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                        {item.title || driveFile.title || 'Untitled'}
                    </h4>
                    {item.creationTime && (
                        <span className="text-[12px] text-[var(--text-muted)] group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors font-medium">
                            Posted {new Date(item.creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Nested Attachment Container */}
            <div className="px-5 pb-5 z-10 relative">
                <div className="ml-14 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 border border-[var(--border-subtle)] rounded-xl bg-[var(--border-subtle)] hover:bg-[var(--glass-bg)] hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-lg cursor-pointer group/attach">
                    
                    {/* Attachment Icon & Name */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] shrink-0 group-hover/attach:scale-110 group-hover/attach:bg-indigo-600 group-hover/attach:text-white transition-all duration-300">
                            <Icon size={14} />
                        </div>
                        <span className="text-[13px] font-bold text-[var(--text-main)] truncate group-hover/attach:text-indigo-600 dark:group-hover/attach:text-indigo-400 transition-colors">
                            {driveFile.title || item.title}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {isLocal ? (
                            <>
                                <a
                                    href={getCourseFileUrl(courseId, driveFile.title, true)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white px-4 py-2 rounded-lg transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                                >
                                    View
                                </a>
                                <a
                                    href={getCourseFileUrl(courseId, driveFile.title)}
                                    download
                                    className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-gray-800 dark:hover:border-gray-600 transition-all shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-800"
                                >
                                    <Download size={13} /> Download
                                </a>
                            </>
                        ) : link ? (
                            <a
                                href={link || driveFile.alternateLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                            >
                                <ExternalLink size={13} /> Open
                            </a>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Section wrapper ───────────────────────────────────────────────────
const Section = ({ title, icon: Icon, count, accentColor, children }) => (
    <div className="mb-8">
        <div className="flex items-center justify-between mb-4 border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">
                {title}
            </h2>
            <span className="text-[13px] font-medium text-slate-500">{count} items</span>
        </div>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

// ── Main Classwork component ──────────────────────────────────────────
const Classwork = () => {
    const { course, handleSync, syncing } = useOutletContext();
    const [searchQuery, setSearchQuery] = useState('');

    const baseColors = ['indigo', 'blue', 'violet', 'emerald', 'rose', 'amber', 'cyan', 'pink'];
    let hash = 0;
    for (let i = 0; i < (course?.id || "").length; i++) {
        hash = (course?.id || "").charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIdx = Math.abs(hash) % baseColors.length;
    const accentColor = baseColors[colorIdx];

    if (!course) return null;

    const localFiles = course.local_files || [];
    const materials = course.materials || [];
    const coursework = course.coursework || [];
    const q = searchQuery.toLowerCase();

    const filteredMaterials = materials.filter(m => m.title?.toLowerCase().includes(q));
    const filteredCoursework = coursework.filter(c => c.title?.toLowerCase().includes(q));
    
    const total = filteredMaterials.length + filteredCoursework.length;

    return (
        <div className="w-full max-w-6xl mx-auto px-6 py-8 animate-in">

            {/* Top Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                    <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)] uppercase">
                        Classwork
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Search Component */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Filter topics..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-full py-2.5 pl-11 pr-4 text-[14px] text-[var(--text-main)] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-[var(--text-muted)] shadow-xl"
                        />
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold bg-[var(--glass-bg)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-indigo-500/50 transition-all disabled:opacity-50 shadow-xl active:scale-95"
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync Data'}
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {total === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center">
                    <Folder size={40} className="text-slate-800 mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                        {searchQuery ? `No results for "${searchQuery}"` : 'Classwork is empty'}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 font-medium max-w-sm">Use the Sync Classroom button above to pull the latest materials from Google Classroom.</p>
                </div>
            )}

            {filteredMaterials.length > 0 && (
                <Section title="Course Materials" icon={Folder} count={filteredMaterials.length} accentColor={accentColor}>
                    {filteredMaterials.map((item, idx) => (
                        <FileRow key={idx} item={item} courseId={course.id} accentColor={accentColor} localFiles={localFiles} />
                    ))}
                </Section>
            )}

            {filteredCoursework.length > 0 && (
                <Section title="Assignments" icon={ClipboardList} count={filteredCoursework.length} accentColor="indigo">
                    {filteredCoursework.map((item, idx) => (
                        <FileRow key={idx} item={item} courseId={course.id} accentColor="indigo" localFiles={localFiles} />
                    ))}
                </Section>
            )}

        </div>
    );
};

export default Classwork;
