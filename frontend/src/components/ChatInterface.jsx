import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Sparkles, Bot, Settings2 } from 'lucide-react';

const QUICK_QUESTIONS = [
    'Summarize the key topics in 5 bullet points',
    'What are the most important exam questions?',
    'Explain the main concepts simply',
    'List all formulas / definitions',
];

// Lightweight markdown renderer: handles **bold**, bullet points, and line breaks
const MarkdownMessage = ({ content }) => {
    const lines = content.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-2" />;

                // Render inline **bold** segments
                const renderBold = (text) => {
                    const parts = text.split(/\*\*(.*?)\*\*/g);
                    return parts.map((part, j) =>
                        j % 2 === 1
                            ? <strong key={j} className="font-bold text-[var(--text-main)]">{part}</strong>
                            : <span key={j}>{part}</span>
                    );
                };

                // Bullet point lines
                if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                    return (
                        <div key={i} className="flex gap-2 items-start ml-2">
                            <span className="text-indigo-400 font-bold mt-0.5">•</span>
                            <span>{renderBold(trimmed.replace(/^[-•]\s+/, ''))}</span>
                        </div>
                    );
                }

                // Section heading lines (e.g. **Definition:**)
                if (/^\*\*[^*]+:\*\*/.test(trimmed)) {
                    return (
                        <div key={i} className="mt-2 leading-snug">
                            {renderBold(trimmed)}
                        </div>
                    );
                }

                return <div key={i} className="leading-snug">{renderBold(trimmed)}</div>;
            })}
        </div>
    );
};

const ChatInterface = ({ courseId }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I\'m ready to help you study this course. Ask me anything — exam questions, summaries, explanations, or key concepts!'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState(null);
    const [selectedMarks, setSelectedMarks] = useState(5);
    const [selectedModel, setSelectedModel] = useState('deepseek-r1:1.5b');
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const copyToClipboard = (text, idx) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(null), 2000);
        });
    };

    const handleSend = async (question) => {
        const q = question || input.trim();
        if (!q || loading) return;

        const userMessage = { role: 'user', content: q };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        // Add a placeholder assistant message we'll stream into
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

        try {
            const payload = { 
                question: q, 
                marks: selectedMarks,
                model: selectedModel
            };
            if (courseId) payload.course_id = courseId;

            const response = await fetch('http://localhost:8000/ask/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                accumulated += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
                    return updated;
                });
                scrollToBottom();
            }

            // Mark streaming done
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: false };
                return updated;
            });

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: 'Sorry, I couldn\'t connect to the AI backend. Please ensure the server is running.',
                    streaming: false,
                };
                return updated;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-none min-h-0">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mr-2 mt-1 shadow-inner border border-indigo-600/10 dark:border-indigo-400/10">
                                <Bot size={14} />
                            </div>
                        )}
                            <div className={`relative max-w-[85%] ${msg.role === 'user' ? 'ml-8' : ''}`}>
                            <div className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-xl transition-all duration-200 ${
                                    msg.role === 'user'
                                        ? 'bg-indigo-600 text-white font-bold hover:bg-indigo-700'
                                        : 'bg-[var(--glass-bg)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-indigo-500/30'
                                }`}>
                                    {msg.role === 'assistant' && msg.content
                                        ? <MarkdownMessage content={msg.content} />
                                        : msg.content
                                    }
                                    {!msg.content && msg.streaming && (
                                        <span className="flex gap-1 py-1">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                    )}
                                    {msg.streaming && msg.content && (
                                        <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                                    )}
                                </div>
                                {/* Copy button for assistant messages */}
                                {msg.role === 'assistant' && msg.content && !msg.streaming && (
                                    <button
                                        onClick={() => copyToClipboard(msg.content, idx)}
                                        className="absolute top-2 -right-10 opacity-0 group-hover:opacity-100 transition-all p-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-full text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/50 shadow-2xl active:scale-95"
                                        title="Copy response"
                                    >
                                        {copiedIdx === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick questions */}
            {messages.length <= 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {QUICK_QUESTIONS.map((q, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(q)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-indigo-600 dark:text-indigo-300 bg-[var(--glass-bg)] hover:bg-[var(--border-subtle)] rounded-full border border-[var(--border-subtle)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xl"
                        >
                            <Sparkles size={14} className="text-indigo-500" />
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Wrapper with settings absolutely positioned if open */}
            <div className="relative group mt-auto">
                <div className="relative">
                    
                    {/* Floating Settings Panel */}
                    {showSettings && (
                        <div className="absolute bottom-full left-0 mb-3 ml-2 w-72 bg-[var(--bg-main)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--border-subtle)] p-4 z-50 animate-in fade-in slide-in-from-bottom-2">
                            {/* Format Selector */}
                            <div className="mb-4">
                                <span className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Answer Format</span>
                                <div className="flex flex-wrap gap-2">
                                    {[2, 5, 10].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setSelectedMarks(m)}
                                            className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-all ${
                                                selectedMarks === m
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-white/5 text-slate-400 border-white/5 hover:border-indigo-500 hover:text-indigo-400'
                                            }`}
                                        >
                                            {typeof m === 'number' ? `${m} Marks` : m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Model Selector */}
                            <div>
                                <span className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">AI Model</span>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => setSelectedModel('deepseek-r1:1.5b')}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                                            selectedModel === 'deepseek-r1:1.5b'
                                                ? 'bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-600/50 dark:border-emerald-500/50 shadow-sm'
                                                : 'bg-[var(--glass-bg)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10'
                                        }`}
                                    >
                                        <span className="text-sm">⚡</span> Fast Response (1.5B)
                                    </button>
                                    <button
                                        onClick={() => setSelectedModel('deepseek-r1:7b')}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                                            selectedModel === 'deepseek-r1:7b'
                                                ? 'bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-600/50 dark:border-purple-500/50 shadow-sm'
                                                : 'bg-[var(--glass-bg)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-purple-500/50 hover:text-purple-500 hover:bg-purple-500/10'
                                        }`}
                                    >
                                        <span className="text-sm">🧠</span> Deep Thinking (7B)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Left Settings Toggle Button */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`absolute left-3 bottom-3 p-2.5 rounded-xl transition-all shadow-xl flex items-center gap-2 cursor-pointer
                            ${showSettings 
                                ? 'bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-600/50 dark:border-indigo-500/50' 
                                : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-600/30'}`}
                        title="Configure settings"
                    >
                        <Settings2 size={18} />
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about this course..."
                        rows="2"
                        className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-14 pr-14 text-[14px] text-[var(--text-main)] focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none font-bold placeholder-[var(--text-muted)] shadow-2xl hover:border-indigo-500/30"
                    />
                    
                    {/* Send Button */}
                    <button
                        onClick={() => {
                            setShowSettings(false); // Close settings when sending
                            handleSend();
                        }}
                        disabled={!input.trim() || loading}
                        className="absolute right-3 bottom-3 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 shadow-md flex items-center justify-center cursor-pointer"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center mt-3">
                Powered by RAG · Press Enter to send
            </p>
        </div>
    );
};

export default ChatInterface;
