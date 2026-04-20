import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Brain, FileCode, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { generateAssessment } from '../api';

const Assessments = () => {
    const { course } = useOutletContext();
    const [topic, setTopic] = useState('');
    const [selectedFile, setSelectedFile] = useState('ALL');
    const [type, setType] = useState('quiz'); // 'quiz' | 'flashcard'
    const [count, setCount] = useState(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [assessmentData, setAssessmentData] = useState(null);

    // Quiz State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);

    // Flashcard State
    const [flashcardIndex, setFlashcardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim() && selectedFile === 'ALL') {
            setError("Please enter a topic or select a specific source material.");
            return;
        }

        setLoading(true);
        setError('');
        setAssessmentData(null);
        setQuizFinished(false);
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setScore(0);
        setShowExplanation(false);
        setFlashcardIndex(0);
        setIsFlipped(false);

        try {
            const payload = {
                topic: topic || "General Review", // Provide a fallback if topic is empty but a file is selected
                type,
                count: parseInt(count, 10),
            };
            if (selectedFile !== 'ALL') {
                payload.fileName = selectedFile;
            }
            
            const data = await generateAssessment(course.id, payload);
            setAssessmentData(data);
            if (type === 'quiz' && (!data.questions || data.questions.length === 0)) {
                setError("No questions generated. The topic might not be covered in the uploaded materials.");
            } else if (type === 'flashcard' && (!data.flashcards || data.flashcards.length === 0)) {
                setError("No flashcards generated. The topic might not be covered in the uploaded materials.");
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to generate assessment.");
        } finally {
            setLoading(false);
        }
    };

    // ------------- Quiz Handlers -------------
    const handleOptionSelect = (idx) => {
        if (selectedOption !== null) return; // Prevent changing answer
        setSelectedOption(idx);
        setShowExplanation(true);
        
        const q = assessmentData.questions[currentQuestionIndex];
        if (idx === q.correctIndex) {
            setScore(s => s + 1);
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < assessmentData.questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            setQuizFinished(true);
        }
    };

    // ----------- Flashcard Handlers -----------
    const nextCard = () => {
        setIsFlipped(false);
        setTimeout(() => setFlashcardIndex(i => Math.min(i + 1, assessmentData.flashcards.length - 1)), 150);
    };

    const prevCard = () => {
        setIsFlipped(false);
        setTimeout(() => setFlashcardIndex(i => Math.max(i - 1, 0)), 150);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-full">
            <div className="mb-8 flex items-center gap-3">
                <Brain className="w-8 h-8 text-orange-500" />
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Automated Assessments</h1>
                    <p className="text-sm text-[var(--text-muted)]">Generate quizzes and flashcards tailored to your course materials.</p>
                </div>
            </div>

            {/* Config Form */}
            {!assessmentData && !loading && (
                <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                    <form onSubmit={handleGenerate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">Topic (Optional)</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., 'React Hooks' or leave blank"
                                    className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">Source Material</label>
                                <select
                                    value={selectedFile}
                                    onChange={(e) => setSelectedFile(e.target.value)}
                                    className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none truncate"
                                >
                                    <option value="ALL">All Course Materials</option>
                                    {course.local_files?.map((file, idx) => (
                                        <option key={idx} value={file}>{file}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                                >
                                    <option value="quiz">Mock Quiz</option>
                                    <option value="flashcard">Flashcards</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">Quantity</label>
                                <select
                                    value={count}
                                    onChange={(e) => setCount(e.target.value)}
                                    className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                                >
                                    <option value="3">3 Items</option>
                                    <option value="5">5 Items</option>
                                    <option value="10">10 Items</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <Brain className="w-5 h-5" />
                            Generate Assessment
                        </button>
                    </form>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 border-4 border-white/5 border-b-orange-500 rounded-full animate-spin" />
                    <p className="text-orange-500 font-medium animate-pulse">Generating your {type}...</p>
                </div>
            )}

            {/* ----------------- QUIZ UI ----------------- */}
            {assessmentData && type === 'quiz' && assessmentData.questions?.length > 0 && (
                <div className="max-w-3xl mx-auto">
                    {quizFinished ? (
                        <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-2xl p-10 text-center shadow-lg">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                                <span className="text-4xl font-black text-white">{Math.round((score / assessmentData.questions.length) * 100)}%</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Quiz Complete!</h2>
                            <p className="text-[var(--text-muted)] mb-8">You scored {score} out of {assessmentData.questions.length}.</p>
                            
                            <button onClick={() => setAssessmentData(null)} className="px-6 py-3 bg-[var(--text-main)] text-[var(--bg-main)] font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
                                <RefreshCw className="w-4 h-4" />
                                Create New Assessment
                            </button>
                        </div>
                    ) : (
                        <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-sm font-bold text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full">
                                    Question {currentQuestionIndex + 1} of {assessmentData.questions.length}
                                </span>
                                <span className="text-sm font-medium text-[var(--text-muted)]">
                                    Score: {score}
                                </span>
                            </div>

                            <h2 className="text-xl font-bold text-[var(--text-main)] mb-8 leading-relaxed">
                                {assessmentData.questions[currentQuestionIndex].question}
                            </h2>

                            <div className="space-y-3">
                                {assessmentData.questions[currentQuestionIndex].options.map((opt, idx) => {
                                    const isCorrect = idx === assessmentData.questions[currentQuestionIndex].correctIndex;
                                    const isSelected = selectedOption === idx;
                                    
                                    let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-[var(--text-main)] ";
                                    
                                    if (selectedOption !== null) {
                                        if (isCorrect) {
                                            btnClass += "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                                        } else if (isSelected) {
                                            btnClass += "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400";
                                        } else {
                                            btnClass += "border-[var(--border-subtle)] opacity-50";
                                        }
                                    } else {
                                        btnClass += "border-[var(--border-subtle)] hover:border-orange-500/50 hover:bg-orange-500/5";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={selectedOption !== null}
                                            onClick={() => handleOptionSelect(idx)}
                                            className={btnClass}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{opt}</span>
                                                {selectedOption !== null && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                                {selectedOption !== null && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {showExplanation && (
                                <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
                                    <div className={`p-4 rounded-xl border ${selectedOption === assessmentData.questions[currentQuestionIndex].correctIndex ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        <p className="text-sm font-semibold mb-1 text-[var(--text-main)]">Explanation:</p>
                                        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                                            {assessmentData.questions[currentQuestionIndex].explanation}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={nextQuestion}
                                        className="mt-6 w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] font-bold rounded-xl hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
                                    >
                                        {currentQuestionIndex < assessmentData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ----------------- FLASHCARD UI ----------------- */}
            {assessmentData && type === 'flashcard' && assessmentData.flashcards?.length > 0 && (
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <button 
                            onClick={prevCard} 
                            disabled={flashcardIndex === 0}
                            className="p-2 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] disabled:opacity-30 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
                        </button>
                        
                        <span className="text-sm font-bold text-orange-500 bg-orange-500/10 px-4 py-1.5 rounded-full">
                            Card {flashcardIndex + 1} of {assessmentData.flashcards.length}
                        </span>
                        
                        <button 
                            onClick={nextCard} 
                            disabled={flashcardIndex === assessmentData.flashcards.length - 1}
                            className="p-2 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] disabled:opacity-30 transition-colors"
                        >
                            <ArrowRight className="w-5 h-5 text-[var(--text-main)]" />
                        </button>
                    </div>

                    {/* 3D Flip Container */}
                    <div className="relative w-full h-80 perspective-1000 mb-8 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                        <div className={`w-full h-full duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                            
                            {/* Front */}
                            <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-transform group-hover:scale-[1.02]">
                                <Brain className="w-12 h-12 text-white/20 absolute top-6 left-6" />
                                <h3 className="text-3xl font-bold text-white tracking-tight leading-tight">
                                    {assessmentData.flashcards[flashcardIndex].front}
                                </h3>
                                <p className="absolute bottom-6 text-white/50 text-xs font-medium uppercase tracking-widest">Click to reveal</p>
                            </div>

                            {/* Back */}
                            <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-[var(--glass-bg)] border-2 border-[var(--border-subtle)] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl">
                                <h3 className="text-xl font-medium text-[var(--text-main)] leading-relaxed">
                                    {assessmentData.flashcards[flashcardIndex].back}
                                </h3>
                            </div>

                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button onClick={() => setAssessmentData(null)} className="px-6 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] font-semibold rounded-xl transition-colors">
                            Start New Session
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Assessments;
