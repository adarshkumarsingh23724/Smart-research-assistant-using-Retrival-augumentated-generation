import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronLeft, Download, ExternalLink, FileText, Bot, Maximize2
} from 'lucide-react';
import { fetchCourses, getCourseFileUrl } from '../api';

const MaterialDetails = () => {
    const { courseId, fileName } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [material, setMaterial] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewerExpanded, setViewerExpanded] = useState(false);

    useEffect(() => {
        const getDetails = async () => {
            try {
                const courses = await fetchCourses();
                const foundCourse = courses.find(c => c.id === courseId);
                setCourse(foundCourse);

                if (foundCourse) {
                    const allMat = [
                        ...(foundCourse.materials || []),
                        ...(foundCourse.coursework || []).flatMap(c => c.materials || [])
                    ];
                    const foundMat = allMat.find(m => m.title === fileName);
                    setMaterial(foundMat);
                }
            } catch (error) {
                console.error("Error fetching material details:", error);
            } finally {
                setLoading(false);
            }
        };
        getDetails();
    }, [courseId, fileName]);

    // Check if we have a local PDF for this material
    const driveFiles = (material?.materials || []).map(m => m?.driveFile?.driveFile).filter(Boolean);
    const localPdf = driveFiles.find(df => df.title?.toLowerCase().endsWith('.pdf'));
    const isPdf = localPdf || fileName?.toLowerCase().endsWith('.pdf');
    const pdfViewUrl = localPdf
        ? getCourseFileUrl(courseId, localPdf.title, true)
        : getCourseFileUrl(courseId, fileName, true);
    const downloadUrl = localPdf
        ? getCourseFileUrl(courseId, localPdf.title)
        : getCourseFileUrl(courseId, fileName);

    // Parse dates
    const fmtDate = (iso) => {
        if (!iso) return null;
        return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    if (loading) return (
        <div className="min-h-screen bg-mesh flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-100 border-b-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-400">Loading material…</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent text-[var(--text-main)] font-sans">
            {/* Top bar - Clean & Premium */}
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 md:px-10 py-5 flex items-center gap-5 sticky top-0 z-50 shadow-lg transition-all duration-300">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2.5 hover:bg-[var(--border-subtle)] rounded-full transition-all text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 border border-[var(--border-subtle)] active:scale-90"
                >
                    <ChevronLeft size={22} />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 leading-none mb-1">
                        {course?.name || 'Course'}
                    </p>
                    <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight truncate">
                        {fileName}
                    </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isPdf && (
                        <a
                            href={pdfViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 active:scale-95"
                        >
                            <Maximize2 size={13} /> Full Screen
                        </a>
                    )}
                    <a
                        href={downloadUrl}
                        download
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 active:scale-95"
                    >
                        <Download size={13} /> Download
                    </a>
                    {material?.alternateLink && (
                        <a
                            href={material.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-700 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 hover:text-white transition-all border border-gray-200 active:scale-95"
                        >
                            <ExternalLink size={13} /> Classroom
                        </a>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8 animate-in">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* PDF Viewer or Placeholder */}
                    <div className={`${isPdf ? 'lg:col-span-8' : 'lg:col-span-8'}`}>
                        {isPdf ? (
                            <div className={`bg-[var(--glass-bg)] rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-2xl transition-all duration-300 ${viewerExpanded ? 'h-screen' : 'h-[700px]'}`}>
                                <div className="flex items-center justify-between px-4 py-2 bg-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <FileText size={12} /> PDF Viewer
                                    </span>
                                    <button
                                        onClick={() => setViewerExpanded(!viewerExpanded)}
                                        className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        {viewerExpanded ? 'Collapse' : 'Expand'}
                                    </button>
                                </div>
                                <iframe
                                    src={pdfViewUrl}
                                    title={fileName}
                                    className="w-full"
                                    style={{ height: 'calc(100% - 40px)' }}
                                    allow="fullscreen"
                                />
                            </div>
                        ) : (
                            <div className="h-80 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-8 shadow-sm">
                                <FileText size={48} className="text-gray-200 mb-4" />
                                <h3 className="text-base font-black text-gray-400 mb-2 uppercase tracking-tight">
                                    Preview Not Available
                                </h3>
                                <p className="text-sm text-gray-300 font-medium mb-6 max-w-xs leading-relaxed">
                                    This file type cannot be previewed here. Download or open it in Google Classroom.
                                </p>
                                <div className="flex gap-3">
                                    <a
                                        href={downloadUrl}
                                        download
                                        className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg"
                                    >
                                        <Download size={14} /> Download
                                    </a>
                                    {material?.alternateLink && (
                                        <a
                                            href={material.alternateLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-5 py-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors border border-indigo-100"
                                        >
                                            <ExternalLink size={14} /> Classroom
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Attached drive files list */}
                        {driveFiles.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Attached Files</h3>
                                <div className="space-y-2">
                                    {driveFiles.map((df, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all shadow-sm">
                                            <FileText size={16} className="text-gray-400 shrink-0" />
                                            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{df.title}</span>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={getCourseFileUrl(courseId, df.title, true)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
                                                >
                                                    View
                                                </a>
                                                <a
                                                    href={getCourseFileUrl(courseId, df.title)}
                                                    download
                                                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100 flex items-center gap-1"
                                                >
                                                    <Download size={10} /> Save
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metadata sidebar */}
                    <div className="lg:col-span-4 space-y-5">
                        {/* Material info */}
                        <div className="glass-card rounded-2xl p-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2">
                                <FileText size={12} /> Material Info
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Title</span>
                                    <span className="text-sm font-bold text-[var(--text-main)]">{fileName}</span>
                                </div>
                                {course?.name && (
                                    <div>
                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Course</span>
                                        <span className="text-sm font-bold text-[var(--text-main)]">{course.name}</span>
                                    </div>
                                )}
                                {material?.updateTime && (
                                    <div>
                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Last Updated</span>
                                        <span className="text-sm font-bold text-[var(--text-main)]">{fmtDate(material.updateTime)}</span>
                                    </div>
                                )}
                                {material?.creationTime && (
                                    <div>
                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Created</span>
                                        <span className="text-sm font-bold text-[var(--text-main)]">{fmtDate(material.creationTime)}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Local Files</span>
                                    <span className={`text-sm font-bold ${driveFiles.length > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                        {driveFiles.length > 0 ? `${driveFiles.length} file(s) available` : 'No local files'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI chat shortcut */}
                        <Link
                            to={`/course/${courseId}/stream`}
                            className="block p-7 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-2xl group hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden active:scale-[0.98]"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300">
                                        <Bot size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">AI Chat</span>
                                </div>
                                <p className="text-lg font-bold text-[var(--text-main)] mb-1">Study with AI</p>
                                <p className="text-[12px] text-[var(--text-muted)] font-medium leading-relaxed">
                                    Get exam-focused answers synthesized from this and all course materials.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MaterialDetails;
