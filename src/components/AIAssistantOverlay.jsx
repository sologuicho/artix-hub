import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, Wand2, Lightbulb, GraduationCap, Copy, Check, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const AIAssistantOverlay = ({ isOpen, onClose, contextData = {}, onInsertText }) => {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('chat'); // chat, improve, ideas
    const [isExpanded, setIsExpanded] = useState(false);
    const location = useLocation();
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleAction = async (actionType, customPrompt = '') => {
        setLoading(true);
        setResponse('');

        try {
            const getCsrfToken = () => {
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'csrf') return value;
                }
                return null;
            };

            const endpoint = actionType === 'chat' ? 'chat' : 'improve';
            const body = {
                message: customPrompt || prompt,
                context: {
                    page: location.pathname,
                    ...contextData
                },
                mode: actionType
            };

            // Simulated backend call for demonstration if backend not ready
            // Replace with actual fetch to BACKEND_URL/api/ai/${endpoint}
            const res = await fetch(`${BACKEND_URL}/api/ai/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': getCsrfToken() || ''
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.ok) {
                setResponse(data.reply || data.improvedText || "I couldn't generate a response.");
            } else {
                setResponse("Error: " + (data.message || "Failed to process request"));
            }

        } catch (e) {
            console.error(e);
            setResponse("Connection error. Please check your API keys and server status.");
        } finally {
            setLoading(false);
        }
    };

    const QUICK_ACTIONS = [
        { id: 'improve', label: 'Improve Writing', icon: Wand2, prompt: "Improve the writing of the following text: " },
        { id: 'fix', label: 'Fix Grammar', icon: Check, prompt: "Fix grammar and spelling in: " },
        { id: 'creative', label: 'Brainstorm Ideas', icon: Lightbulb, prompt: "Generate 5 creative ideas about: " },
        { id: 'academic', label: 'Academic Tone', icon: GraduationCap, prompt: "Rewrite this in an academic tone: " },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Main Panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-3xl bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isExpanded ? 'h-[80vh]' : 'h-[600px]'} transition-all duration-500`}
            >
                {/* Glow Effects */}
                <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-purple-900/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-none">Artix AI Assistant</h2>
                            <p className="text-xs text-blue-400 font-medium mt-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Powered by Gemini 2.0 Flash
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                    {/* Quick Actions */}
                    <div className="flex gap-2 p-4 overflow-x-auto border-b border-white/5 no-scrollbar">
                        {QUICK_ACTIONS.map(action => (
                            <button
                                key={action.id}
                                onClick={() => {
                                    setPrompt(action.prompt + (contextData.selectedText || ""));
                                    inputRef.current?.focus();
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all whitespace-nowrap text-sm text-gray-300 hover:text-white hover:shadow-lg hover:shadow-purple-900/10"
                            >
                                <action.icon className="w-4 h-4" />
                                {action.label}
                            </button>
                        ))}
                    </div>

                    {/* Chat/Response Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {response ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="prose prose-invert prose-sm max-w-none p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="whitespace-pre-wrap leading-relaxed text-gray-200">{response}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    if (onInsertText) onInsertText(response);
                                                    onClose();
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                                            >
                                                <Check className="w-4 h-4" />
                                                Insert Text
                                            </button>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(response)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </button>
                                            <button
                                                onClick={() => { setResponse(''); setPrompt(''); }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Start Over
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 flex items-center justify-center mb-4 border border-white/5">
                                    <Bot className="w-8 h-8 text-white/20" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">How can I help you today?</h3>
                                <p className="max-w-md mx-auto">
                                    I can help you write, edit, brainstorm ideas, or fix your grammar.
                                    Select a quick action above or type your request below.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white/5 border-t border-white/5 backdrop-blur-xl">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl blur transition-opacity opacity-0 group-focus-within:opacity-100" />
                            <div className="relative flex items-end gap-2 bg-[#0A0A0A] border border-white/10 p-2 rounded-xl focus-within:border-white/20 transition-colors">
                                <textarea
                                    ref={inputRef}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAction('chat');
                                        }
                                    }}
                                    placeholder="Ask anything or paste text to improve..."
                                    className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 min-h-[48px] py-3"
                                    disabled={loading || !!response}
                                />
                                <button
                                    onClick={() => handleAction('chat')}
                                    disabled={!prompt || loading || !!response}
                                    className="p-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20"
                                >
                                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AIAssistantOverlay;
