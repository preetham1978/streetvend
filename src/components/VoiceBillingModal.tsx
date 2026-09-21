import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Check, Plus, Minus, Trash2, AlertTriangle, RefreshCw, Sparkles, Globe, Lock, CheckCircle2, ChevronDown, ShoppingBag } from 'lucide-react';
import { PlanTier, isTierAtLeast } from '../config/pricing';
import { Product } from '../lib/database.types';
import { cn } from '../lib/utils';

interface VoiceBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddItemsToCart: (itemsToAdd: { product: Product; quantity: number }[]) => void;
    products: Product[];
    currentPlan: PlanTier;
    onUpgradeClick: () => void;
}

export interface MatchedVoiceItem {
    id: string;
    productId: string;
    productName: string;
    selectedProduct: Product;
    quantity: number;
    price: number;
    confidence: 'high' | 'medium' | 'low';
    matchScore: number;
    rawPhrase?: string;
}

const NUMBER_WORDS: Record<string, number> = {
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'ek': 1, 'ekk': 1, '1k': 1,
    'do': 2, 'doo': 2, 'doh': 2, 'double': 2,
    'teen': 3, 'tin': 3, 'triple': 3,
    'char': 4, 'chaar': 4,
    'paanch': 5, 'panch': 5, 'pancha': 5,
    'chhah': 6, 'chha': 6, 'che': 6,
    'saat': 7, 'sat': 7,
    'aath': 8, 'ath': 8,
    'nau': 9, 'no': 9, 'noo': 9,
    'das': 10, 'dass': 10,
    'plate': 1, 'full': 1, 'half': 1
};

function stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;

    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matchCount = 0;
    words1.forEach(w1 => {
        if (words2.some(w2 => w2.includes(w1) || w1.includes(w2) || (w1.length > 3 && w2.length > 3 && Math.abs(w1.length - w2.length) <= 2 && w1.substring(0, 3) === w2.substring(0, 3)))) {
            matchCount++;
        }
    });

    if (words1.length > 0 && matchCount > 0) {
        return Math.min(1.0, matchCount / Math.max(words1.length, words2.length));
    }

    // Levenshtein distance fallback
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    const distance = track[s2.length][s1.length];
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen === 0 ? 1.0 : (maxLen - distance) / maxLen;
}

export default function VoiceBillingModal({
    isOpen,
    onClose,
    onAddItemsToCart,
    products,
    currentPlan,
    onUpgradeClick
}: VoiceBillingModalProps) {
    const isPlanUnlocked = isTierAtLeast(currentPlan, 'professional');

    const [isListening, setIsListening] = useState(false);
    const [language, setLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
    const [transcript, setTranscript] = useState('');
    const [micError, setMicError] = useState<string | null>(null);
    const [reviewedItems, setReviewedItems] = useState<MatchedVoiceItem[]>([]);
    const [unrecognizedPhrases, setUnrecognizedPhrases] = useState<string[]>([]);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    const recognitionRef = useRef<any>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // Explicit cleanup helper to turn off mic hardware indicator
    const stopMicrophoneMediaTracks = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn("Track stop error:", e);
                }
            });
            mediaStreamRef.current = null;
        }

        // Additional safeguard for browser audio streams
        try {
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach((audioEl) => {
                if (audioEl.srcObject) {
                    const stream = audioEl.srcObject as MediaStream;
                    if (stream && stream.getTracks) {
                        stream.getTracks().forEach(t => t.stop());
                    }
                    audioEl.srcObject = null;
                }
            });
        } catch (err) {
            console.warn("Error cleaning audio elements:", err);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.warn("Recognition stop error:", e);
            }
            recognitionRef.current = null;
        }
        stopMicrophoneMediaTracks();
        setIsListening(false);
    };

    const handleClose = () => {
        stopListening();
        setTranscript('');
        setReviewedItems([]);
        setUnrecognizedPhrases([]);
        setHasAnalyzed(false);
        setMicError(null);
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            stopListening();
        }
        return () => {
            stopListening();
        };
    }, [isOpen]);

    const startListening = async () => {
        setMicError(null);
        setTranscript('');

        // Request audio media stream first to ensure permission & capture handle
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
        } catch (err: any) {
            console.error("Microphone access error:", err);
            setMicError("Microphone access denied. Please grant mic permission in your browser to use voice billing.");
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMicError("Speech recognition is not supported in this browser mode. You can still type or select items manually.");
            stopMicrophoneMediaTracks();
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event: any) => {
                let currentText = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentText += event.results[i][0].transcript;
                }
                if (currentText.trim()) {
                    setTranscript(currentText);
                }
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech recognition error:", event.error);
                if (event.error === 'not-allowed') {
                    setMicError("Microphone permission was denied.");
                } else if (event.error === 'no-speech') {
                    // No speech captured yet, keep listening or prompt user
                } else {
                    setMicError(`Voice error (${event.error}). Please try again or tap items below.`);
                }
            };

            recognition.onend = () => {
                setIsListening(false);
                stopMicrophoneMediaTracks();
            };

            recognition.start();
        } catch (err: any) {
            console.error("Speech recognition start failed:", err);
            setMicError("Could not start speech recognition. Please check mic settings.");
            stopMicrophoneMediaTracks();
            setIsListening(false);
        }
    };

    // Analyze captured speech and match against products catalog
    const analyzeTranscript = (rawText: string) => {
        if (!rawText.trim() || products.length === 0) return;

        const textLower = rawText.toLowerCase().replace(/[,.:;!]/g, ' ');
        const tokens = textLower.split(/\s+/).filter(Boolean);

        const matchedList: MatchedVoiceItem[] = [];
        const usedProductIds = new Set<string>();

        // For each product in the catalog, calculate match score against transcript
        products.forEach(prod => {
            const prodNameLower = prod.name.toLowerCase();
            const score = stringSimilarity(textLower, prodNameLower);

            if (score >= 0.35 || textLower.includes(prodNameLower) || prodNameLower.split(' ').some(w => w.length > 3 && textLower.includes(w))) {
                // Determine quantity from near numbers in tokens or transcript
                let detectedQty = 1;
                
                // Find index of product name words in tokens
                const prodWords = prodNameLower.split(' ');
                const tokenIdx = tokens.findIndex(t => prodWords.some(pw => t.includes(pw) || pw.includes(t)));

                if (tokenIdx !== -1) {
                    // Check 2 words before or 2 words after for quantity numbers
                    const neighbors = [
                        tokens[tokenIdx - 1],
                        tokens[tokenIdx - 2],
                        tokens[tokenIdx + 1],
                        tokens[tokenIdx + 2]
                    ].filter(Boolean);

                    for (const n of neighbors) {
                        const parsedNum = parseInt(n, 10);
                        if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum <= 50) {
                            detectedQty = parsedNum;
                            break;
                        } else if (NUMBER_WORDS[n]) {
                            detectedQty = NUMBER_WORDS[n];
                            break;
                        }
                    }
                }

                let confidence: 'high' | 'medium' | 'low' = 'low';
                if (score >= 0.75 || textLower.includes(prodNameLower)) {
                    confidence = 'high';
                } else if (score >= 0.5) {
                    confidence = 'medium';
                }

                matchedList.push({
                    id: 'match_' + Math.random().toString(36).substring(2, 9),
                    productId: prod.id,
                    productName: prod.name,
                    selectedProduct: prod,
                    quantity: detectedQty,
                    price: prod.price,
                    confidence,
                    matchScore: score,
                    rawPhrase: prod.name
                });
                usedProductIds.add(prod.id);
            }
        });

        // Sort matched list by highest score
        matchedList.sort((a, b) => b.matchScore - a.matchScore);

        setReviewedItems(matchedList);

        // Find unmatched words or segments
        if (matchedList.length === 0) {
            setUnrecognizedPhrases([rawText]);
        } else {
            setUnrecognizedPhrases([]);
        }

        setHasAnalyzed(true);
    };

    const handleDoneListening = () => {
        stopListening();
        if (transcript) {
            analyzeTranscript(transcript);
        }
    };

    const handleUpdateQuantity = (id: string, delta: number) => {
        setReviewedItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleProductChange = (id: string, newProdId: string) => {
        const prod = products.find(p => p.id === newProdId);
        if (!prod) return;
        setReviewedItems(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    productId: prod.id,
                    productName: prod.name,
                    selectedProduct: prod,
                    price: prod.price,
                    confidence: 'high'
                };
            }
            return item;
        }));
    };

    const handleRemoveItem = (id: string) => {
        setReviewedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleAddManualItem = (prodId?: string) => {
        const targetProd = prodId ? products.find(p => p.id === prodId) : products[0];
        if (!targetProd) return;

        const newItem: MatchedVoiceItem = {
            id: 'match_' + Math.random().toString(36).substring(2, 9),
            productId: targetProd.id,
            productName: targetProd.name,
            selectedProduct: targetProd,
            quantity: 1,
            price: targetProd.price,
            confidence: 'high',
            matchScore: 1.0
        };

        setReviewedItems(prev => [...prev, newItem]);
        setUnrecognizedPhrases([]);
    };

    const handleConfirmAndAdd = () => {
        if (reviewedItems.length === 0) return;
        
        const payload = reviewedItems.map(item => ({
            product: item.selectedProduct,
            quantity: item.quantity
        }));

        stopListening();
        onAddItemsToCart(payload);
        handleClose();
    };

    if (!isOpen) return null;

    const totalCalculated = reviewedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
            <div className="bg-bg-surface rounded-t-[2rem] sm:rounded-3xl max-w-lg w-full border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] my-0 sm:my-auto animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-bg-surface-inset shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center shrink-0">
                            <Mic className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-text-primary truncate">AI Voice Billing</h3>
                                <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 text-[10px] font-extrabold uppercase shrink-0">
                                    Pro
                                </span>
                            </div>
                            <p className="text-xs text-text-tertiary truncate">Speak items naturally in English or Hindi</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-bg-base text-text-tertiary hover:text-text-primary transition-all cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                    {!isPlanUnlocked ? (
                        /* Locked Tier Notice */
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                                <Lock className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-lg text-text-primary">Voice Billing is Locked</h4>
                                <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                                    Speak items aloud in Hinglish/English to generate quick bills on busy counters. Available on Professional plan (₹299/mo) and above.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    handleClose();
                                    onUpgradeClick();
                                }}
                                className="w-full min-h-[48px] py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4" /> Upgrade to Unlock Voice Billing
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Language & Mic Control Section */}
                            <div className="bg-bg-surface-inset p-4 rounded-2xl border border-border-subtle space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                                        <Globe className="w-4 h-4 text-brand-500" /> Spoken Language:
                                    </div>
                                    <div className="flex rounded-xl bg-bg-surface p-1 border border-border-subtle text-xs font-bold w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => setLanguage('en-IN')}
                                            className={cn(
                                                "flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                                                language === 'en-IN' ? "bg-brand-500 text-white shadow-sm" : "text-text-tertiary hover:text-text-primary"
                                            )}
                                        >
                                            English (IN)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLanguage('hi-IN')}
                                            className={cn(
                                                "flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                                                language === 'hi-IN' ? "bg-brand-500 text-white shadow-sm" : "text-text-tertiary hover:text-text-primary"
                                            )}
                                        >
                                            Hindi / Hinglish
                                        </button>
                                    </div>
                                </div>

                                {/* Microphone Recording Button & Visualizer */}
                                <div className="text-center space-y-3 pt-2">
                                    {isListening ? (
                                        <div className="space-y-3">
                                            <div className="relative inline-flex items-center justify-center">
                                                <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-red-500/30"></span>
                                                <button
                                                    onClick={handleDoneListening}
                                                    className="relative w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-all cursor-pointer min-h-[64px] min-w-[64px]"
                                                >
                                                    <Mic className="w-8 h-8 animate-bounce" />
                                                </button>
                                            </div>
                                            <p className="text-xs font-extrabold text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Listening... Tap to stop & review
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <button
                                                onClick={startListening}
                                                className="w-16 h-16 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-xl shadow-brand-500/30 mx-auto active:scale-95 transition-all cursor-pointer min-h-[64px] min-w-[64px]"
                                            >
                                                <Mic className="w-8 h-8" />
                                            </button>
                                            <p className="text-xs font-bold text-text-secondary">
                                                Tap microphone button and speak order items (e.g., <span className="text-brand-500 font-medium">"2 plate pani puri, teen samosa"</span>)
                                            </p>
                                        </div>
                                    )}

                                    {/* Mic error message if any */}
                                    {micError && (
                                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2 text-left">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>{micError}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Live or Captured Transcript Preview */}
                                {transcript && (
                                    <div className="p-3 rounded-xl bg-bg-surface border border-brand-500/30 text-xs space-y-1">
                                        <div className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest">Captured Speech Transcript</div>
                                        <p className="font-mono text-text-primary text-sm italic">"{transcript}"</p>
                                        {!isListening && !hasAnalyzed && (
                                            <button
                                                onClick={() => analyzeTranscript(transcript)}
                                                className="mt-2 text-xs font-bold text-brand-500 hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" /> Analyze Catalog Matches
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* REVIEW SECTION: "Here's what I heard" */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                                    <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Review Detected Items ({reviewedItems.length})
                                    </h4>
                                    <span className="text-[11px] text-text-tertiary">
                                        Verify before adding
                                    </span>
                                </div>

                                {reviewedItems.length === 0 ? (
                                    <div className="text-center py-8 bg-bg-surface-inset rounded-2xl border border-dashed border-border-subtle space-y-2">
                                        <ShoppingBag className="w-8 h-8 text-text-tertiary mx-auto" />
                                        <p className="text-xs font-medium text-text-tertiary px-2">
                                            No items detected yet. Speak your order above or pick catalog items directly.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleAddManualItem()}
                                            className="text-xs font-bold text-brand-500 hover:underline inline-flex items-center gap-1 cursor-pointer pt-1 min-h-[40px]"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Manually Select Product
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {reviewedItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-3.5 rounded-2xl bg-bg-surface-inset border border-border-subtle space-y-2 hover:border-brand-500/30 transition-all"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    {/* Select dropdown to switch product if wrongly matched */}
                                                    <div className="flex-1">
                                                        <select
                                                            value={item.productId}
                                                            onChange={(e) => handleProductChange(item.id, e.target.value)}
                                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-3 py-2 font-bold text-xs text-text-primary focus:outline-none focus:border-brand-500 min-h-[40px]"
                                                        >
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.name} (₹{p.price})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Confidence Badge */}
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 border",
                                                        item.confidence === 'high' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                        item.confidence === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                        "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}>
                                                        {item.confidence === 'high' ? 'Exact Match' : item.confidence === 'medium' ? 'Fuzzy Match' : 'Review Match'}
                                                    </span>

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1 text-xs">
                                                    <div className="flex items-center gap-2 bg-bg-surface border border-border-subtle rounded-xl p-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(item.id, -1)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-surface-inset text-text-primary hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="w-6 text-center font-bold text-text-primary text-sm">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(item.id, 1)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-surface-inset text-text-primary hover:bg-brand-500 hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-[10px] text-text-tertiary">₹{item.price} × {item.quantity}</div>
                                                        <div className="font-extrabold text-sm text-brand-500">₹{item.price * item.quantity}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Unrecognized Spoken Phrases Section */}
                                        {unrecognizedPhrases.length > 0 && (
                                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                                    <span>Unrecognized spoken phrase:</span>
                                                </div>
                                                {unrecognizedPhrases.map((phrase, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        <p className="text-xs font-mono text-text-primary italic bg-bg-surface p-2 rounded-xl border border-border-subtle">
                                                            "{phrase}"
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        handleAddManualItem(e.target.value);
                                                                    }
                                                                }}
                                                                className="flex-1 bg-bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-text-primary min-h-[40px]"
                                                            >
                                                                <option value="">Select matching catalog item...</option>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name} (₹{p.price})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleAddManualItem()}
                                            className="w-full min-h-[44px] py-2.5 rounded-xl border border-dashed border-border-subtle text-text-secondary hover:text-brand-500 hover:border-brand-500/40 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" /> Add Another Item
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                {isPlanUnlocked && (
                    <div className="p-4 sm:p-5 border-t border-border-subtle bg-bg-surface-inset flex items-center justify-between gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                        <div>
                            <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest block">Total to Add</span>
                            <span className="text-lg sm:text-xl font-extrabold text-brand-500 font-sans">₹{totalCalculated}</span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-3.5 sm:px-4 py-3 min-h-[48px] rounded-2xl bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAndAdd}
                                disabled={reviewedItems.length === 0}
                                className="px-4 sm:px-6 py-3 min-h-[48px] rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Check className="w-4 h-4" /> Add ({reviewedItems.length}) Items
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
