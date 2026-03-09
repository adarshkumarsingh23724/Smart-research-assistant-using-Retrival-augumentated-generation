import React, { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UploadCloud, File as FileIcon, X, CheckCircle2, AlertCircle, Loader2, Bot } from 'lucide-react';
import { uploadCourseFile } from '../api';
import ChatInterface from './ChatInterface';

const UploadMaterial = () => {
    const { course } = useOutletContext();
    const [fileQueue, setFileQueue] = useState([]); // Array of { file: File, id: string, status: 'pending' | 'uploading' | 'success' | 'error', message?: string }
    const [dragActive, setDragActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFilesToQueue(Array.from(e.dataTransfer.files));
        }
    }, []);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            addFilesToQueue(Array.from(e.target.files));
        }
    };

    const addFilesToQueue = (newFiles) => {
        const validTypes = [
            'application/pdf', 
            'text/plain', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        
        const prepared = newFiles.map(f => {
            const isValid = validTypes.includes(f.type) || f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.docx') || f.name.toLowerCase().endsWith('.pptx') || f.name.toLowerCase().endsWith('.txt');
            return {
                file: f,
                id: Math.random().toString(36).substr(2, 9),
                status: isValid ? 'pending' : 'error',
                message: isValid ? '' : 'Unsupported file type'
            };
        });

        setFileQueue(prev => [...prev, ...prepared]);
    };

    const removeFile = (id) => {
        setFileQueue(prev => prev.filter(item => item.id !== id));
    };

    const handleUploadAll = async () => {
        if (fileQueue.length === 0 || !course) return;
        
        const pendingFiles = fileQueue.filter(f => f.status === 'pending' || f.status === 'error' && f.message !== 'Unsupported file type');
        if (pendingFiles.length === 0) return;

        setIsProcessing(true);

        for (const item of pendingFiles) {
            // Update status to uploading
            setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

            try {
                const res = await uploadCourseFile(course.id, item.file);
                // Update status to success
                setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', message: res.message } : f));
            } catch (error) {
                // Update status to error
                setFileQueue(prev => prev.map(f => f.id === item.id ? { 
                    ...f, 
                    status: 'error', 
                    message: error.response?.data?.detail || 'Upload failed' 
                } : f));
            }
        }

        setIsProcessing(false);
    };

    const clearQueue = () => {
        setFileQueue([]);
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in space-y-8 pb-20">
            {/* Split Section: Upload on Left/Top, Header on Right/Top */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Info Text */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden h-full border border-[var(--border-subtle)] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
                        
                        <h2 className="text-2xl font-black text-[var(--text-main)] mb-3 relative z-10 flex items-center gap-2 uppercase tracking-tight">
                            <UploadCloud className="text-fuchsia-600 dark:text-fuchsia-500" size={24} />
                            Ingest Multiple Notes
                        </h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-muted)] relative z-10 space-y-3">
                            <p className="leading-relaxed font-bold">
                                Drag and drop as many files as you need. Our RAG pipeline will:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-xs opacity-80 font-bold uppercase tracking-tight">
                                <li>Split files into optimal semantic chunks</li>
                                <li>Generate high-dimensional embeddings</li>
                                <li>Store in ChromaDB for sub-millisecond retrieval</li>
                                <li>Ground AI answers in these specific materials</li>
                            </ul>
                            <p className="text-[11px] text-[var(--text-muted)] italic mt-4 border-t border-[var(--border-subtle)] pt-4">
                                Supports: .pdf, .docx, .pptx, .txt
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dropzone & Queue */}
                <div className="lg:col-span-7 space-y-4">
                    <div 
                        className={`w-full relative rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 min-h-[160px] text-center
                            ${dragActive 
                                ? 'border-indigo-600 bg-indigo-600/5 dark:border-indigo-400 dark:bg-indigo-400/5' 
                                : 'border-[var(--border-subtle)] bg-[var(--glass-bg)] hover:border-indigo-600/30 dark:hover:border-white/20 shadow-xl'}
                            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            multiple
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleChange}
                            accept=".pdf,.txt,.docx,.pptx"
                            disabled={isProcessing}
                        />
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3 shadow-sm">
                                <UploadCloud size={24} />
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">Click or drag files to add to queue</h3>
                        </div>
                    </div>

                    {/* File Queue List */}
                    {fileQueue.length > 0 && (
                        <div className="glass-card rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 bg-[var(--glass-bg)] transition-all duration-300">
                            <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/5 dark:bg-black/20">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                    Upload Queue ({fileQueue.length})
                                </span>
                                <button 
                                    onClick={clearQueue}
                                    disabled={isProcessing}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 disabled:opacity-50"
                                >
                                    Clear Queue
                                </button>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto scrollbar-none divide-y divide-[var(--border-subtle)]">
                                {fileQueue.map((item) => (
                                    <div key={item.id} className="p-4 flex items-center gap-4 group">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 
                                            ${item.status === 'success' ? 'bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 
                                              item.status === 'error' ? 'bg-rose-600/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 
                                              'bg-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                                            {item.status === 'uploading' ? <Loader2 size={18} className="animate-spin" /> : <FileIcon size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[var(--text-main)] truncate leading-none mb-1">
                                                {item.file.name}
                                            </p>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] leading-none uppercase tracking-tight">
                                                {(item.file.size / 1024 / 1024).toFixed(2)} MB • {item.status.toUpperCase()}
                                            </p>
                                        </div>
                                        {item.status === 'pending' || item.status === 'error' ? (
                                            <button 
                                                onClick={() => removeFile(item.id)}
                                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 rounded-lg transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        ) : item.status === 'success' ? (
                                            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-500" />
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-black/5 dark:bg-black/40 border-t border-[var(--border-subtle)]">
                                <button
                                    onClick={handleUploadAll}
                                    disabled={isProcessing || !fileQueue.some(f => f.status === 'pending' || (f.status === 'error' && f.message !== 'Unsupported file type'))}
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                                >
                                    {isProcessing ? (
                                        <><Loader2 size={16} className="animate-spin" /> Processing Queue...</>
                                    ) : (
                                        <><UploadCloud size={18} /> Process & Ingest Into Vector DB</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Learning Hub Section (Dedicated Chat) */}
            <div className="glass-card rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden min-h-[600px] flex flex-col transition-all duration-300">
                <div className="px-8 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/5 dark:bg-black/20">
                    <div>
                        <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2 uppercase tracking-tight">
                            <Bot className="text-indigo-600 dark:text-indigo-400" size={22} />
                            Integrated AI Study Assistant
                        </h3>
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                            Grounded in {course?.name} materials
                        </p>
                    </div>
                </div>
                <div className="flex-1 p-4 md:p-6 bg-transparent">
                    <ChatInterface courseId={course?.id} />
                </div>
            </div>
        </div>
    );
};

export default UploadMaterial;
