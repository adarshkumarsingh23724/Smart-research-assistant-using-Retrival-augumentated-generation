import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLoginUrl } from '../api';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage = () => {
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const authStatus = searchParams.get('auth');
        const errorMsg = searchParams.get('msg');
        
        if (authStatus === 'error') {
            setError(errorMsg || 'Authentication failed. Please try again.');
        } else if (authStatus === 'success') {
            setSuccess(true);
            // Need to trigger the parent app component to realize we are authenticated
            window.location.href = '/';
        }
    }, [searchParams]);

    const handleLogin = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const authUrl = await getLoginUrl();
            if (authUrl) {
                window.location.href = authUrl;
            } else {
                setError("Could not get Google login URL");
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError("Failed to connect to backend server.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0p0f1a] flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-[#1a202c] shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
                
                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold mb-2 text-slate-800 dark:text-white mt-4">
                        Smart Research Assistant
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-10">
                        Sign in to access your Google Classroom courses and chat with your materials.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3 text-left">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                    
                    {success && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-3 text-left">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">Successfully signed in! Redirecting...</p>
                        </div>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={isLoading || success}
                        className="w-full relative group overflow-hidden rounded-2xl p-[1px] font-semibold flex items-center justify-center transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity"></span>
                        <div className="relative w-full bg-white dark:bg-[#0b0f1a] px-6 py-4 rounded-[15px] flex items-center justify-center gap-3 transition-all group-hover:bg-opacity-95 dark:group-hover:bg-opacity-90">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                            ) : (
                                <svg className="w-6 h-6" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                    <path fill="none" d="M0 0h48v48H0z"/>
                                </svg>
                            )}
                            <span className="text-slate-800 dark:text-slate-200">
                                {isLoading ? "Connecting to Google..." : "Sign in with Google"}
                            </span>
                        </div>
                    </button>
                    
                    <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
                        We only request access to view your Google Classroom materials to assist you with research.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
