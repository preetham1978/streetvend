import React, { useState } from 'react';
import { Mic, MicOff, X, Sparkles, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react';
import { useVoiceOrder } from '../hooks/useVoiceOrder';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from './UpgradeModal';
import { useI18n } from '../lib/I18nContext';
import { Product } from '../lib/database.types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface VoiceOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableProducts?: Product[];
    onAddItemsToCart?: (items: { product: Product; quantity: number }[]) => void;
}

export default function VoiceOrderModal({
    isOpen,
    onClose,
    availableProducts = [],
    onAddItemsToCart
}: VoiceOrderModalProps) {
    const { language } = useI18n();
    const { hasFeature } = usePlanLimits();
    const [parsedItems, setParsedItems] = useState<{ product: Product; quantity: number }[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('Press mic and speak order naturally (e.g., "2 Masala Dosa and 1 Cold Coffee")');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const { isListening, isProcessing: isRecordingProcessing, transcript, error, startListening, stopListening } = useVoiceOrder({
        language,
        onTranscriptComplete: (finalText, audioBase64, mimeType) => {
            handleProcessTranscript(finalText, audioBase64, mimeType);
        }
    });

    if (!isOpen) return null;

    if (!hasFeature('ai_voice_input')) {
        return (
            <UpgradeModal
                isOpen={isOpen}
                onClose={onClose}
                featureName="AI Voice Input (Boli Mode)"
                requiredTier="professional"
                message="AI Voice Order parsing (Boli Mode) allows hands-free voice billing in Hindi, English, Tamil, or Kannada. Upgrade to Professional or Enterprise to unlock voice input."
            />
        );
    }

    const isGlobalProcessing = isParsing || isRecordingProcessing;

    async function handleProcessTranscript(text: string, base64Audio?: string, mimeType?: string) {
        if (!text.trim() && !base64Audio) {
            setStatusMessage('No voice detected. Try again.');
            return;
        }
        setIsParsing(true);
        setStatusMessage(`AI is processing your order...`);

        try {
            const res = await fetch('/api/voice-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    transcript: text, 
                    audio: base64Audio,
                    mimeType,
                    products: availableProducts 
                })
            });

            if (res.ok) {
                const data = await res.json();
                const spokenText = data.transcript || text;
                const itemsList = data.order || data.items || [];

                if (itemsList.length > 0) {
                    const matched: { product: Product; quantity: number }[] = [];
                    itemsList.forEach((item: any) => {
                        const found = availableProducts.find(p => p.id === item.productId || p.name.toLowerCase().includes((item.name || '').toLowerCase()));
                        if (found) {
                            matched.push({ product: found, quantity: item.quantity || 1 });
                        }
                    });

                    if (matched.length > 0) {
                        setParsedItems(matched);
                        setStatusMessage(`Found ${matched.length} item(s) from voice order: "${spokenText}"`);
                    } else {
                        fallbackParse(spokenText);
                    }
                } else {
                    fallbackParse(spokenText);
                }
            } else {
                fallbackParse(text);
            }
        } catch (err) {
            console.error('Error in handleProcessTranscript:', err);
            fallbackParse(text);
        } finally {
            setIsParsing(false);
        }
    }

    function fallbackParse(text: string) {
        const lower = text.toLowerCase();
        const matched: { product: Product; quantity: number }[] = [];

        availableProducts.forEach(prod => {
            if (lower.includes(prod.name.toLowerCase())) {
                // Extract number preceding product name or default 1
                const regex = new RegExp(`(\\d+)\\s*${prod.name.toLowerCase()}`, 'i');
                const match = lower.match(regex);
                const qty = match ? parseInt(match[1], 10) : 1;
                matched.push({ product: prod, quantity: qty });
            }
        });

        if (matched.length > 0) {
            setParsedItems(matched);
            setStatusMessage(`Identified ${matched.length} item(s) in catalog!`);
        } else {
            setStatusMessage(`Could not automatically match products. Try speaking clearly e.g. "2 Sev Puri"`);
        }
    }

    const handleConfirmOrder = () => {
        if (parsedItems.length > 0 && onAddItemsToCart) {
            onAddItemsToCart(parsedItems);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl overflow-hidden"
                >
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="bg-bg-surface border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative text-center max-h-[95vh] overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col"
                    >
                        <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                        
                        <div className="flex-1">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-surface-inset transition-all cursor-pointer z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-extrabold uppercase tracking-widest border border-brand-500/20 mb-3 sm:mb-4">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Boli Voice Order</span>
                            </div>

                            <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-text-primary mb-1">
                                Speak Your Order
                            </h2>
                            <p className="text-[10px] sm:text-xs text-text-tertiary mb-4 sm:mb-6">
                                Hands-free billing for high-speed street stall counters
                            </p>

                            {/* Big Mic Button */}
                            <div className="mb-4 sm:mb-6 flex justify-center">
                                <button
                                    type="button"
                                    onClick={isListening ? stopListening : startListening}
                                    disabled={isGlobalProcessing}
                                    className={cn(
                                        "w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl disabled:opacity-50",
                                        isListening
                                            ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 scale-110'
                                            : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/30 hover:scale-105'
                                    )}
                                >
                                    {isListening ? <MicOff className="w-8 h-8 sm:w-10 sm:h-10" /> : <Mic className="w-8 h-8 sm:w-10 sm:h-10" />}
                                </button>
                            </div>

                            {/* Status / Transcript Box */}
                            <div className="bg-bg-surface-inset p-4 rounded-2xl border border-border-subtle mb-4 min-h-[80px] flex flex-col justify-center items-center">
                                {isGlobalProcessing ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
                                        <p className="text-xs font-bold text-brand-500 uppercase tracking-widest">{statusMessage}</p>
                                    </div>
                                ) : transcript ? (
                                    <p className="text-sm font-semibold text-brand-500 italic">"{transcript}"</p>
                                ) : (
                                    <p className="text-xs text-text-secondary leading-relaxed">{statusMessage}</p>
                                )}
                                {error && (
                                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 font-medium bg-red-500/10 p-2 rounded-xl border border-red-500/20 w-full text-left">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" /> 
                                        <span>{error}</span>
                                    </p>
                                )}
                            </div>

                            {/* Manual Text Input Fallback */}
                            <div className="mb-6 text-left">
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem('manualText') as HTMLInputElement;
                                        if (input && input.value.trim()) {
                                            handleProcessTranscript(input.value.trim());
                                        }
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        name="manualText"
                                        type="text"
                                        placeholder="Or type order (e.g. 2 Dosa)..."
                                        className="flex-1 px-3.5 py-3 rounded-xl bg-bg-surface-inset border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isGlobalProcessing}
                                        className="px-4 py-3 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                                    >
                                        Parse
                                    </button>
                                </form>
                            </div>

                            {/* Parsed Items Preview */}
                            {parsedItems.length > 0 && (
                                <div className="bg-bg-surface-inset p-4 rounded-2xl border border-border-subtle mb-6 text-left">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary block mb-2">
                                        Extracted Items:
                                    </span>
                                    <div className="space-y-2">
                                        {parsedItems.map((pi, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs font-bold text-white">
                                                <span>{pi.quantity}x {pi.product.name}</span>
                                                <span className="text-brand-500">₹{pi.product.price * pi.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Action */}
                        <div className="space-y-2 pt-2 pb-12 sm:pb-0">
                            <button
                                onClick={handleConfirmOrder}
                                disabled={parsedItems.length === 0}
                                className="w-full py-4 rounded-2xl primary-button-gradient text-white font-extrabold text-xs uppercase tracking-wider shadow-lg disabled:opacity-40 disabled:hover:scale-100 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Add {parsedItems.length} Item(s) to Bill</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-2xl bg-bg-surface-inset text-text-secondary font-bold text-xs hover:text-text-primary transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
