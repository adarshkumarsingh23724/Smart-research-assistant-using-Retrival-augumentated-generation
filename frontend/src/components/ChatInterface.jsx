import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Sparkles, Bot, Settings2, ChevronDown, Eye } from 'lucide-react';

const MODELS_DATA = [
    {
        group: 'Production',
        items: [
            { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', sub: 'Default · Fast', emoji: '⚡', vision: false },
            { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',   sub: 'Ultra Fast',          emoji: '🚀', vision: false },
            { id: 'openai/gpt-oss-120b',     label: 'GPT-OSS 120B',   sub: 'OpenAI · Powerful',   emoji: '🧠', vision: true  },
            { id: 'openai/gpt-oss-20b',      label: 'GPT-OSS 20B',    sub: 'OpenAI · Compact',    emoji: '💡', vision: false },
        ]
    },
    {
        group: 'Preview Models',
        items: [
            { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', sub: 'Preview · Multimodal', emoji: '🦙', vision: true  },
            { id: 'qwen/qwen3-32b',                             label: 'Qwen3 32B',         sub: 'Preview · Reasoning', emoji: '🌐', vision: false },
        ]
    }
];

const QUICK_QUESTIONS = [
    'Summarize the key topics in 5 bullet points',
    'What are the most important exam questions?',
    'Explain the main concepts simply',
    'List all formulas / definitions',
];

// ── Code block copy button ───────────────────────────────────────────────────
const CodeBlock = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Friendly display name for language badge
    const langDisplay = language
        ? language.charAt(0).toUpperCase() + language.slice(1).toLowerCase()
        : 'Code';

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-white/10 shadow-xl bg-[#0d1117]">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-2">
                    {/* Traffic light dots */}
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    <span className="ml-2 text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                        {langDisplay}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-300 transition-all border border-white/5 hover:border-indigo-500/30"
                >
                    {copied
                        ? <><Check size={12} className="text-emerald-400" /> Copied!</>
                        : <><Copy size={12} /> Copy</>
                    }
                </button>
            </div>
            {/* Code body */}
            <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-200 font-mono">
                <code>{code}</code>
            </pre>
        </div>
    );
};

// ── Lightweight markdown renderer ────────────────────────────────────────────
const MarkdownMessage = ({ content }) => {
    if (!content) return null;

    try {
        // ── Step 1: split into code blocks and text segments ────────────────
        const segments = [];
        const codeRe = /```(\w*)\n?([\s\S]*?)```/g;
        let cursor = 0;
        let m;
        while ((m = codeRe.exec(content)) !== null) {
            if (m.index > cursor) {
                segments.push({ type: 'text', content: content.slice(cursor, m.index) });
            }
            segments.push({ type: 'code', language: m[1] || 'text', code: m[2] });
            cursor = m.index + m[0].length;
        }
        if (cursor < content.length) {
            segments.push({ type: 'text', content: content.slice(cursor) });
        }
        // Nothing parsed — treat whole thing as text
        if (segments.length === 0) {
            segments.push({ type: 'text', content });
        }

        // ── Step 2: inline renderer (bold + inline-code) ────────────────────
        const renderInline = (src, key) => {
            const parts = [];
            const re = /(\*\*(.*?)\*\*|`([^`]+)`)/g;
            let last = 0;
            let match;
            while ((match = re.exec(src)) !== null) {
                if (match.index > last) {
                    parts.push(<span key={`t-${last}`}>{src.slice(last, match.index)}</span>);
                }
                if (match[0].startsWith('**')) {
                    parts.push(<strong key={`b-${match.index}`} className="font-bold">{match[2]}</strong>);
                } else {
                    parts.push(
                        <code key={`c-${match.index}`} className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 text-[12px] font-mono border border-indigo-500/20">
                            {match[3]}
                        </code>
                    );
                }
                last = match.index + match[0].length;
            }
            if (last < src.length) parts.push(<span key={`t-end-${key}`}>{src.slice(last)}</span>);
            return parts.length > 0 ? parts : [<span key={key}>{src}</span>];
        };

        // ── Step 3: render each text line ───────────────────────────────────
        const renderTextLines = (text, segIdx) =>
            text.split('\n').map((line, i) => {
                const t = line.trim();
                if (!t) return <div key={`${segIdx}-${i}`} className="h-1.5" />;

                // Numbered list: "1. Item"
                const numM = t.match(/^(\d+)\.\s+(.+)/);
                if (numM) return (
                    <div key={`${segIdx}-${i}`} className="flex gap-2.5 items-start ml-1 my-0.5">
                        <span className="text-indigo-400 font-bold shrink-0 min-w-[20px] text-right">{numM[1]}.</span>
                        <span>{renderInline(numM[2], `${segIdx}-${i}`)}</span>
                    </div>
                );

                // Bullet: "- " or "• "
                if (t.startsWith('- ') || t.startsWith('• ')) return (
                    <div key={`${segIdx}-${i}`} className="flex gap-2 items-start ml-1 my-0.5">
                        <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                        <span>{renderInline(t.replace(/^[-•]\s+/, ''), `${segIdx}-${i}`)}</span>
                    </div>
                );

                // Normal paragraph line
                return (
                    <div key={`${segIdx}-${i}`} className="leading-relaxed">
                        {renderInline(t, `${segIdx}-${i}`)}
                    </div>
                );
            });

        // ── Step 4: assemble ────────────────────────────────────────────────
        return (
            <div className="space-y-1 text-[var(--text-main)]">
                {segments.map((seg, idx) =>
                    seg.type === 'code'
                        ? <CodeBlock key={idx} language={seg.language} code={seg.code} />
                        : <div key={idx}>{renderTextLines(seg.content, idx)}</div>
                )}
            </div>
        );
    } catch (err) {
        // Fallback: show raw text, never show a blank bubble
        return <div className="whitespace-pre-wrap text-[var(--text-main)]">{content}</div>;
    }
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
    const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const [marksDropdownOpen, setMarksDropdownOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const modelDropdownRef = useRef(null);
    const marksDropdownRef = useRef(null);

    // Get current model details
    const currentModelDetails = MODELS_DATA.flatMap(g => g.items).find(m => m.id === selectedModel) || MODELS_DATA[0].items[0];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
                setModelDropdownOpen(false);
            }
            if (marksDropdownRef.current && !marksDropdownRef.current.contains(event.target)) {
                setMarksDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <div className="flex flex-col h-full bg-[var(--bg-main)]">
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

            {/* Input Area */}
            <div className="relative group mt-auto bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl transition-all hover:border-indigo-500/30 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 flex items-end p-2 gap-2">
                
                {/* Left Controls: Model & Marks Dropdowns flex container */}
                <div className="flex items-center gap-2 mb-1 pl-1">
                    
                    {/* Model Dropdown */}
                    <div className="relative" ref={modelDropdownRef}>
                        <button
                            onClick={() => {
                                setModelDropdownOpen(!modelDropdownOpen);
                                setMarksDropdownOpen(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 dark:bg-black/10 dark:hover:bg-black/20 rounded-xl text-[12px] font-bold text-[var(--text-main)] transition-colors border border-[var(--border-subtle)] shadow-sm"
                        >
                            <span className="text-[14px]">{currentModelDetails.emoji}</span>
                            <span className="truncate max-w-[100px]">{currentModelDetails.label}</span>
                            {/* Vision badge on trigger */}
                            {currentModelDetails.vision && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                    <Eye size={8} />Vision
                                </span>
                            )}
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Model Dropdown Menu */}
                        {modelDropdownOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-72 bg-[var(--bg-main)]/95 backdrop-blur-xl rounded-[24px] shadow-2xl border border-[var(--border-subtle)] overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-2 space-y-3 overflow-y-auto max-h-[350px] scrollbar-thin scrollbar-thumb-[var(--border-subtle)]">
                                    {MODELS_DATA.map((group, gIdx) => (
                                        <div key={gIdx} className="mb-2 last:mb-0">
                                            <div className="px-3 pb-2 pt-1 text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                                {group.group}
                                            </div>
                                            <div className="space-y-0.5">
                                                {group.items.map((item) => {
                                                    const isSelected = selectedModel === item.id;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => {
                                                                setSelectedModel(item.id);
                                                                setModelDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left flex items-center justify-between px-3 py-3 rounded-xl transition-colors border border-transparent ${
                                                                isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-[var(--border-subtle)]'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg">{item.emoji}</span>
                                                                <div>
                                                                    <div className="text-[14px] font-bold text-[var(--text-main)]">
                                                                        {item.label}
                                                                    </div>
                                                                    <div className="text-[12px] font-semibold text-[var(--text-muted)] mt-0.5">
                                                                        {item.sub}
                                                                    </div>
                                                                    {/* Vision / Text-only capability pill */}
                                                                    {item.vision ? (
                                                                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                                                            <Eye size={8} /> Vision capable
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                                            Text only
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                                                    <Check size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {/* Divider after group except last */}
                                            {gIdx < MODELS_DATA.length - 1 && (
                                                <div className="mt-2 h-px bg-[var(--border-subtle)] w-full" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Marks Dropdown */}
                    <div className="relative" ref={marksDropdownRef}>
                        <button
                            onClick={() => {
                                setMarksDropdownOpen(!marksDropdownOpen);
                                setModelDropdownOpen(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 dark:bg-black/10 dark:hover:bg-black/20 rounded-xl text-[12px] font-bold text-[var(--text-main)] transition-colors border border-[var(--border-subtle)] shadow-sm whitespace-nowrap"
                        >
                            <span className="text-indigo-500 dark:text-indigo-400 font-black">{selectedMarks}</span>
                            <span>Marks</span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${marksDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Marks Dropdown Menu */}
                        {marksDropdownOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-32 bg-[var(--bg-main)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 p-1.5">
                                <div className="px-2 pb-1 pt-1 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">Format</div>
                                <div className="space-y-0.5 mt-1">
                                    {[2, 5, 10].map((m) => {
                                        const isSelected = selectedMarks === m;
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    setSelectedMarks(m);
                                                    setMarksDropdownOpen(false);
                                                }}
                                                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-[13px] font-bold text-[var(--text-main)] border border-transparent ${
                                                    isSelected ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-[var(--border-subtle)]'
                                                }`}
                                            >
                                                <span className="flex-1">{m} Marks</span>
                                                {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Textarea Field */}
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about this course..."
                    rows="1"
                    className="flex-1 bg-transparent py-3 px-2 text-[14px] text-[var(--text-main)] focus:outline-none resize-none font-bold placeholder-[var(--text-muted)] min-w-0"
                    style={{ minHeight: '44px' }}
                />
                
                {/* Send Button */}
                <button
                    onClick={() => {
                        handleSend();
                    }}
                    disabled={!input.trim() || loading}
                    className="mb-1 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 shadow-md flex items-center justify-center shrink-0"
                >
                    <Send size={18} />
                </button>
            </div>

            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center mt-3">
                Powered by RAG · Press Enter to send
            </p>
        </div>
    );
};

export default ChatInterface;
