import React, { useState } from 'react';
import { Mic, MicOff, X, Sparkles, Check, ShoppingBag, PlusCircle, AlertCircle } from 'lucide-react';
import { useVoiceOrder } from '../hooks/useVoiceOrder';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from './UpgradeModal';
import { useI18n } from '../lib/I18nContext';
import { Product } from '../lib/database.types';

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

    const { isListening, transcript, error, startListening, stopListening } = useVoiceOrder({
        language,
        onTranscriptComplete: (finalText) => {
            handleProcessTranscript(finalText);
        }
    });

    // Automatically start listening when modal opens
    // React.useEffect(() => {
    //     if (isOpen && hasFeature('ai_voice_input')) {
    //         startListening();
    //     }
    // }, [isOpen, hasFeature, startListening]);

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

    async function handleProcessTranscript(text: string) {
        if (!text.trim()) return;
        setIsParsing(true);
        setStatusMessage(`Processing voice transcript: "${text}"...`);

        try {
            const res = await fetch('/api/parse-voice-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: text, products: availableProducts })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    const matched: { product: Product; quantity: number }[] = [];
                    data.items.forEach((item: any) => {
                        const found = availableProducts.find(p => p.id === item.productId || p.name.toLowerCase().includes(item.name.toLowerCase()));
                        if (found) {
                            matched.push({ product: found, quantity: item.quantity || 1 });
                        }
                    });

                    if (matched.length > 0) {
                        setParsedItems(matched);
                        setStatusMessage(`Found ${matched.length} item(s) from voice order!`);
                    } else {
                        // Fallback matching
                        fallbackParse(text);
                    }
                } else {
                    fallbackParse(text);
                }
            } else {
                fallbackParse(text);
            }
        } catch (err) {
            console.error(err);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#141416] border border-[#28282e] rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative text-center mt-auto sm:mt-0">
                <div className="w-12 h-1 bg-[#28282e] rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-[#222228] transition-all cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-extrabold uppercase tracking-widest border border-brand-500/20 mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Boli Voice Order</span>
                </div>

                <h2 className="font-sans font-extrabold text-2xl text-text-primary mb-1">
                    Speak Your Order
                </h2>
                <p className="text-xs text-text-tertiary mb-6">
                    Hands-free billing for high-speed street stall counters
                </p>

                {/* Big Mic Button */}
                <div className="mb-6 flex justify-center">
                    <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
                            isListening
                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 scale-110'
                                : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/30 hover:scale-105'
                        }`}
                    >
                        {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                    </button>
                </div>

                {/* Status / Transcript Box */}
                <div className="bg-[#18181c] p-4 rounded-2xl border border-[#28282e] mb-6 min-h-[80px] flex flex-col justify-center items-center">
                    {transcript ? (
                        <p className="text-sm font-semibold text-brand-500 italic">"{transcript}"</p>
                    ) : (
                        <p className="text-xs text-text-secondary leading-relaxed">{statusMessage}</p>
                    )}
                    {error && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {error}
                        </p>
                    )}
                </div>

                {/* Parsed Items Preview */}
                {parsedItems.length > 0 && (
                    <div className="bg-[#1b1b1f] p-4 rounded-2xl border border-[#2d2d34] mb-6 text-left">
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

                {/* Confirm Action */}
                <div className="space-y-2">
                    <button
                        onClick={handleConfirmOrder}
                        disabled={parsedItems.length === 0}
                        className="w-full py-3.5 rounded-2xl primary-button-gradient text-white font-extrabold text-xs uppercase tracking-wider shadow-lg disabled:opacity-40 disabled:hover:scale-100 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add {parsedItems.length} Item(s) to Bill</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-2xl bg-[#222226] text-text-secondary font-bold text-xs hover:text-text-primary transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
