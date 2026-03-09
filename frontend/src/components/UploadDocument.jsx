import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ingestDocument } from '../api';
import { motion } from 'framer-motion';

const UploadDocument = () => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error
    const [message, setMessage] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setMessage('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setStatus('uploading');
        try {
            const result = await ingestDocument(file);
            setStatus('success');
            setMessage(`Successfully processed ${result.chunks_added} chunks.`);
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('Failed to upload document. Please ensure the backend is running.');
        }
    };

    return (
        <div className="p-6 glass-card rounded-2xl shadow-2xl border border-white/5 max-w-md w-full mx-auto">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="text-indigo-400" />
                Knowledge Base
            </h2>

            <div className="mb-4">
                <label className="block w-full cursor-pointer bg-black/40 border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-indigo-500 hover:bg-white/5 transition-all">
                    <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-slate-500" />
                        <span className="text-sm text-slate-300">
                            {file ? file.name : "Click to upload PDF notes"}
                        </span>
                    </div>
                </label>
            </div>

            {file && status !== 'success' && (
                <button
                    onClick={handleUpload}
                    disabled={status === 'uploading'}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95"
                >
                    {status === 'uploading' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        "Upload & Process"
                    )}
                </button>
            )}

            {status === 'success' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-start gap-3 mt-4"
                >
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-green-200 font-medium">Success!</p>
                        <p className="text-green-300/80 text-sm">{message}</p>
                    </div>
                </motion.div>
            )}

            {status === 'error' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-3 mt-4"
                >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-200 font-medium">Error</p>
                        <p className="text-red-300/80 text-sm">{message}</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default UploadDocument;
