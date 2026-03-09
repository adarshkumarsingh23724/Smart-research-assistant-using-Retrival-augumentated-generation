import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Bot, Zap, CheckCircle2, Loader2, BrainCircuit, RefreshCw
} from 'lucide-react';
import ChatInterface from './ChatInterface';
import { ingestFile } from '../api';

const Stream = () => {
    const { course, handleSync, syncing } = useOutletContext();
    
    // AI Ingestion State
    const [selectedFile, setSelectedFile] = useState('');
    const [ingestState, setIngestState] = useState('idle');
    const [ingestedFiles, setIngestedFiles] = useState(new Set());
    const [ingestBanner, setIngestBanner] = useState('');

    const gradients = [
        'from-indigo-900/40 via-indigo-950/20 to-black/40',
        'from-blue-900/40 via-blue-950/20 to-black/40',
        'from-violet-900/40 via-violet-950/20 to-black/40',
        'from-emerald-900/40 via-emerald-950/20 to-black/40',
    ];

    let hash = 0;
    for (let i = 0; i < (course?.id || "").length; i++) {
        hash = (course?.id || "").charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIdx = Math.abs(hash) % gradients.length;

    if (!course) return null;

    // Build the list of ALL Drive files available in this course (from GC classwork + materials)
    const gcFiles = [];
    const seen = new Set();
    const collectFiles = (items) => {
        for (const item of (items || [])) {
            for (const mat of (item.materials || [])) {
                const driveFile = mat?.driveFile?.driveFile;
                if (driveFile?.title && !seen.has(driveFile.title)) {
                    seen.add(driveFile.title);
                    gcFiles.push(driveFile.title);
                }
            }
        }
    };
    collectFiles(course.coursework || []);
    collectFiles(course.materials || []);

    // Files already ingested into ChromaDB (used to mark ✓ in dropdown)
    const alreadyIngested = new Set(course.local_files || []);

    // Fallback: if GC metadata has no files yet, show already-ingested files
    const dropdownFiles = gcFiles.length > 0 ? gcFiles : [...alreadyIngested];

    const doIngest = async () => {
        if (!selectedFile || ingestState === 'loading') return;
        setIngestState('loading');
        setIngestBanner('');
        try {
            await ingestFile(course.id, selectedFile);
            setIngestState('done');
            setIngestedFiles(prev => new Set([...prev, selectedFile]));
            setIngestBanner(`✓ "${selectedFile}" is now in AI Memory. Go ahead and ask questions!`);
            setTimeout(() => setIngestState('idle'), 3000);
            setTimeout(() => setIngestBanner(''), 7000);
        } catch {
            setIngestState('error');
            setTimeout(() => setIngestState('idle'), 4000);
        }
    };

    const bannerGradient = gradients[colorIdx];

    return (
        <div className="w-full max-w-[1400px] mx-auto px-6 py-8 animate-in">

            {/* Ingest success banner */}
            {ingestBanner && (
                <div className="mb-6 px-5 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-sm font-semibold text-emerald-400 flex items-center gap-3 animate-in shadow-sm">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    {ingestBanner}
                </div>
            )}

            {/* Hero Banner (Rounded & Soft) */}
            <div className={`w-full h-48 md:h-64 rounded-3xl mb-8 relative overflow-hidden bg-gradient-to-br ${bannerGradient} border border-[var(--border-subtle)] shadow-2xl flex flex-col justify-end p-6 md:p-8 transition-all duration-300`}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-1 drop-shadow-md">
                            {course.name}
                        </h1>
                        <p className="text-[15px] text-slate-400 font-medium">
                            AI Study Assistant
                        </p>
                    </div>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-5 right-5 bg-black/30 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[12px] font-bold text-white dark:text-indigo-300 flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Online
                </div>
            </div>

            <div className="flex flex-col gap-8 items-stretch">
                {/* AI Memory Control Panel */}
                <div className="glass-card rounded-3xl p-6 shadow-2xl border border-[var(--border-subtle)] bg-[var(--glass-bg)] transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="text-[15px] font-bold text-[var(--text-main)] flex items-center gap-2 mb-1.5 uppercase tracking-tight">
                                <BrainCircuit className="text-indigo-600 dark:text-indigo-400" size={18} /> Context Manager
                            </h3>
                            <p className="text-[11px] text-[var(--text-muted)] font-bold leading-relaxed max-w-xl">
                                Select a local course PDF to push directly into the AI's neural memory. Once loaded, you can ask exam-specific questions about it.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                            <select 
                                value={selectedFile} 
                                onChange={(e) => setSelectedFile(e.target.value)}
                                className="w-56 text-xs font-bold text-[var(--text-main)] bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all truncate shadow-inner"
                            >
                                <option value="" disabled className="bg-[var(--bg-main)]">Select a file to ingest...</option>
                                {dropdownFiles.map(f => (
                                    <option key={f} value={f} className="bg-[var(--bg-main)]">
                                        {alreadyIngested.has(f) || ingestedFiles.has(f) ? `✓ ${f} (In AI Memory)` : f}
                                    </option>
                                ))}
                            </select>
                            
                            <button
                                onClick={doIngest}
                                disabled={!selectedFile || ingestState === 'loading'}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-bold tracking-tight transition-all active:scale-95 shadow-sm active:shadow-inner ${
                                    ingestState === 'loading' ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' :
                                    ingestState === 'done' ? 'bg-emerald-500 text-white shadow-emerald-100 dark:shadow-none' :
                                    ingestState === 'error' ? 'bg-rose-500 text-white shadow-rose-100 dark:shadow-none' :
                                    'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 dark:hover:shadow-indigo-500/20'
                                } disabled:opacity-50 shrink-0 cursor-pointer`}
                            >
                                {ingestState === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Ingesting...</> :
                                 ingestState === 'done' ? <><CheckCircle2 size={16} /> Loaded</> :
                                 ingestState === 'error' ? 'Failed' :
                                 <><BrainCircuit size={16} /> Ingest File</>}
                            </button>
                        </div>
                        
                        <div className="hidden md:block w-px h-10 bg-white/5 mx-2" />
                        
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-slate-300 border border-indigo-100 dark:border-white/5 hover:bg-indigo-100 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-sm cursor-pointer"
                        >
                            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync Data'}
                        </button>
                    </div>
                </div>

                {/* Full Width AI Chat */}
                <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-[var(--border-subtle)] relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-24 -mt-24 pointer-events-none" />

                    <div className="flex items-center justify-between mb-4 relative z-10 border-b border-[var(--border-subtle)] pb-4">
                        <div>
                            <h3 className="text-xl font-black text-[var(--text-main)] mb-1 uppercase tracking-tight">AI Hub</h3>
                            <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-400">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                {ingestedFiles.size > 0 ? `${ingestedFiles.size} File${ingestedFiles.size > 1 ? 's' : ''} Ready in Memory` : 'Online & Ready'}
                            </div>
                        </div>
                        <div className="w-14 h-14 bg-indigo-600/10 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-600/10 dark:border-white/5 shadow-sm">
                            <Bot size={28} />
                        </div>
                    </div>

                    {/* Ingest hint when nothing loaded */}
                    {ingestedFiles.size === 0 && dropdownFiles.length > 0 && (
                        <div className="mb-5 px-5 py-4 bg-violet-600/10 dark:bg-violet-500/10 border border-violet-600/10 dark:border-white/5 rounded-2xl relative z-10">
                            <p className="text-sm font-bold text-violet-600 dark:text-violet-300 leading-relaxed">
                                💡 <strong className="font-black text-violet-700 dark:text-white uppercase tracking-tight">Pro Tip:</strong> Use the AI Context Manager above to ingest a specific PDF into memory before asking questions. This allows the AI to provide exact citations from your course material.
                            </p>
                        </div>
                    )}

                    <div className="min-h-[600px] relative z-10 flex flex-col">
                        <ChatInterface courseId={course.id} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Stream;
