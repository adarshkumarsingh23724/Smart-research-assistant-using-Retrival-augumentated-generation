import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, User, ArrowRight, FileText, Calendar, Download } from 'lucide-react';
import { fetchCourseFiles } from '../api';

const CourseCard = ({ course }) => {
    const [fileCount, setFileCount] = useState(course.file_count || 0);

    const gradients = [
        'bg-indigo-950/40',
        'bg-blue-950/40',
        'bg-teal-950/40',
        'bg-emerald-950/40',
        'bg-amber-950/40',
        'bg-purple-950/40',
        'bg-cyan-950/40',
        'bg-pink-950/40',
    ];
    const textColors = [
        'text-indigo-600', 'text-blue-600', 'text-violet-600',
        'text-emerald-600', 'text-rose-600', 'text-amber-600',
        'text-cyan-600', 'text-pink-600',
    ];
    const pillColors = [
        'bg-indigo-100 text-indigo-700',
        'bg-blue-100 text-blue-700',
        'bg-violet-100 text-violet-700',
        'bg-emerald-100 text-emerald-700',
        'bg-rose-100 text-rose-700',
        'bg-amber-100 text-amber-700',
        'bg-cyan-100 text-cyan-700',
        'bg-pink-100 text-pink-700',
    ];

    let hash = 0;
    for (let i = 0; i < (course.id || "").length; i++) {
        hash = (course.id || "").charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIdx = Math.abs(hash) % gradients.length;

    // Parse last sync date
    let syncLabel = 'Not synced';
    if (course.last_sync) {
        const d = new Date(course.last_sync);
        syncLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return (
        <div className="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.03] shadow-2xl h-[240px] border border-transparent hover:border-white/20">
            {/* Background Color/Gradient Layer */}
            <div className={`absolute inset-0 ${gradients[colorIdx]} transition-transform duration-700 group-hover:scale-110`} />
            
            {/* Subtle bottom gradient for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 opacity-80 group-hover:opacity-100 transition-opacity" />

            <Link 
                to={`/course/${course.id}/classwork`}
                className="absolute inset-0 z-20 flex flex-col justify-end p-5"
            >
                {/* Avatar floating in the middle-right area, more subtle */}
                <div className="absolute top-5 right-5 z-30 transition-all duration-500 group-hover:scale-110 group-hover:-translate-x-1">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md p-0.5 border border-white/20 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full rounded-full bg-white/90 dark:bg-slate-800 flex items-center justify-center">
                             <User size={20} className="text-gray-400 dark:text-slate-400" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>

                {/* Course Info at the bottom left */}
                <div className="relative z-30 transform transition-transform duration-500 group-hover:translate-x-1">
                    <h3 className="text-[20px] font-bold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-lg">
                        {course.name}
                    </h3>
                    
                    {course.section && (
                        <p className="text-[13px] font-medium text-white/70 mt-1 drop-shadow-md">
                            {course.section}
                        </p>
                    )}
                </div>
            </Link>

            {/* Quick Actions - hidden by default, appear on hover */}
            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
                <button 
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-90"
                    title={`Synced: ${syncLabel}`}
                >
                    <Calendar size={14} strokeWidth={2.5} />
                </button>
                <Link 
                    to={`/course/${course.id}/classwork`}
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-90"
                    title="Open Work"
                >
                    <FileText size={14} strokeWidth={2.5} />
                </Link>
            </div>

            {/* Top Right Options */}
            <button className="absolute right-4 top-4 z-40 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 opacity-0 group-hover:opacity-100">
                <MoreVertical size={18} />
            </button>
        </div>
    );
};

export default CourseCard;
