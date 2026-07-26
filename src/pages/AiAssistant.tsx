import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { Bot, Send, Sparkles, User, Loader2, Mic, MicOff, Lock } from 'lucide-react';
import { useI18n } from '../lib/I18nContext';
import { usePlanLimits, PlanTier } from '../hooks/usePlanLimits';
import UpgradeModal from '../components/UpgradeModal';

export default function AiAssistantPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const { currentPlan, config, incrementAiUsage, getAiUsageToday, hasFeature } = usePlanLimits();

    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeModalConfig, setUpgradeModalConfig] = useState<{ name: string; tier: PlanTier; msg: string }>({
        name: 'AI Chat Queries',
        tier: 'starter',
        msg: 'Free tier allows up to 5 AI Chat queries per day. Upgrade to Starter or higher for unlimited AI Chat assistance.'
    });

    const aiUsageToday = getAiUsageToday();
    const isFreePlan = currentPlan === 'free';
    
    const ownerName = user?.ownerName || "Raju Sharma";
    const storeName = user?.storeName || "Raju's Chaat Corner";

    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
        { 
            role: 'ai', 
            text: `Hi ${ownerName}! I'm Streetvend, powered by VeloAI's Intelligence. Ask me about profits, stock, pricing, customers, or forecasts for ${storeName}.` 
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const suggestions = [
        "How can I increase profit?",
        "What are my top expenses?",
        "Show me sales forecast",
        "Suggest better pricing",
        "What should I reorder today?",
        "Who are my most loyal customers?"
    ];

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isLoading]);

    const handleSend = async (textToSend?: string) => {
        const query = textToSend || input;
        if (!query.trim() || isLoading) return;

        // Check query cap for Free Plan
        if (isFreePlan && !incrementAiUsage()) {
            setUpgradeModalConfig({
                name: 'Unlimited AI Chat Queries',
                tier: 'starter',
                msg: 'You have reached your Free daily limit of 5 AI Chat queries. Upgrade to Starter (₹299/mo) for unlimited AI chat assistance!'
            });
            setShowUpgradeModal(true);
            return;
        }

        const newHistory = [...chatHistory, { role: 'user' as const, text: query }];
        setChatHistory(newHistory);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: query, language: user?.language || 'en' })
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setChatHistory([...newHistory, { role: 'ai', text: data.text }]);
        } catch (err: any) {
            console.error('Chat error:', err);
            setChatHistory([...newHistory, { role: 'ai', text: `For ${storeName}, I recommend bundling high-margin items (like beverage + main dish) and setting up UPI payments to speed up daily sales!` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleVoiceInput = () => {
        if (!hasFeature('ai_voice_input')) {
            setUpgradeModalConfig({
                name: 'AI Voice Input (Boli Mode)',
                tier: 'professional',
                msg: 'AI Voice Input is available on Professional and Enterprise plans. Upgrade to speak orders and queries naturally in your native language!'
            });
            setShowUpgradeModal(true);
            return;
        }

        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Voice input is not supported in this browser mode. Please type your query.');
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = user?.language === 'hi' ? 'hi-IN' : 'en-US';

            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    setInput(transcript);
                    handleSend(transcript);
                }
                setIsListening(false);
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);

            recognition.start();
        } catch (e) {
            console.error(e);
            setIsListening(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            {/* Header Section */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-text-primary tracking-tight">
                        AI Assistant
                    </h1>
                    <p className="text-sm text-text-secondary font-medium mt-1">
                        Chat with AI about your business
                    </p>
                </div>
                <div>
                    {isFreePlan ? (
                        <button
                            type="button"
                            onClick={() => {
                                setUpgradeModalConfig({
                                    name: 'Unlimited AI Chat Queries',
                                    tier: 'starter',
                                    msg: 'Upgrade to Starter (₹299/mo) to unlock unlimited AI queries and daily business insights!'
                                });
                                setShowUpgradeModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-bg-surface-inset text-accent-pink border border-border-subtle text-xs font-bold rounded-full hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <span>{5 - aiUsageToday} / 5 Free Queries Left</span>
                            <Lock className="w-3 h-3" />
                        </button>
                    ) : (
                        <span className="px-3.5 py-1.5 bg-accent-green/10 text-accent-green border border-accent-green/20 text-xs font-bold rounded-full uppercase">
                            Unlimited AI Chat
                        </span>
                    )}
                </div>
            </div>

            {/* Suggested Prompts Pills */}
            <div className="flex flex-wrap items-center gap-2.5 mb-8 w-full min-w-0">
                {suggestions.map((sug, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(sug)}
                        className="px-4 py-2 rounded-full bg-bg-surface border border-border-subtle text-xs sm:text-sm font-medium text-text-primary hover:border-brand-500/50 hover:bg-bg-surface-inset transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                        {sug}
                    </button>
                ))}
            </div>

            {/* Chat Container Card */}
            <div className="bg-bg-surface border border-border-subtle rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between min-h-[440px] w-full min-w-0 overflow-x-hidden">
                {/* Messages Container */}
                <div className="space-y-6 mb-6 max-h-[500px] overflow-y-auto overflow-x-hidden pr-2 w-full min-w-0">
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex items-start gap-4 w-full min-w-0 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {msg.role === 'user' ? (
                                <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <User className="w-5 h-5" />
                                </div>
                            ) : null}

                            <div className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed max-w-[90%] sm:max-w-3xl min-w-0 break-words ${
                                msg.role === 'user' 
                                    ? 'bg-brand-500 text-white font-medium rounded-tr-none' 
                                    : 'bg-bg-base border border-border-subtle text-text-primary rounded-tl-none'
                            }`}>
                                {msg.role === 'ai' && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-brand-500 uppercase tracking-widest mb-2">
                                        <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                                        <span>STREETVEND</span>
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-start gap-4">
                            <div className="bg-bg-base border border-border-subtle p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-text-tertiary text-xs font-bold uppercase tracking-widest">
                                <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> Streetvend AI is thinking...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <div className="bg-bg-surface-inset border border-border-subtle rounded-2xl p-2.5 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`p-3 rounded-xl transition-all shrink-0 ${
                            isListening 
                                ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' 
                                : 'bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-surface-inset'
                        }`}
                        title={isListening ? "Listening..." : "Voice search (Boli Mode)"}
                    >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <input
                        type="text"
                        placeholder="Ask about profit, stock, pricing..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                        className="flex-1 bg-transparent border-none text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none px-2 font-normal"
                    />

                    <button
                        type="button"
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        className="p-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg transition-all disabled:opacity-40 disabled:hover:bg-brand-500 shrink-0 flex items-center justify-center cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName={upgradeModalConfig.name}
                requiredTier={upgradeModalConfig.tier}
                message={upgradeModalConfig.msg}
            />
        </div>
    );
}


