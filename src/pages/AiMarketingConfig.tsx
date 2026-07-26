import React, { useState } from 'react';
import { 
    Store, 
    MapPin, 
    Tag, 
    MessageCircle, 
    Sparkles, 
    Copy, 
    Check, 
    RotateCcw, 
    Send, 
    FileText, 
    Phone, 
    Globe, 
    ShoppingBag, 
    Sliders, 
    HelpCircle, 
    Zap,
    ExternalLink,
    Wand2
} from 'lucide-react';
import { useMarketingConfig, MarketingConfig } from '../lib/MarketingConfigContext';
import { Link } from 'react-router-dom';

export default function AiMarketingConfig() {
    const { config, updateConfig, resetToDefaults, applyPreset } = useMarketingConfig();
    const [copied, setCopied] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    const [activeTab, setActiveTab] = useState<'placeholders' | 'test_generator'>('placeholders');
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // AI Generation test state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState<string>('');

    const handleChange = (field: keyof MarketingConfig, value: string) => {
        updateConfig({ [field]: value });
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
    };

    const handleCopyPreview = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 1500);
    };

    const compiledPreviewText = 
        `🔥 *${config.discountAmount.toUpperCase()} AT ${config.storeName.toUpperCase()}!* 🔥\n` +
        `${config.audienceGreeting}! ${config.tagline}.\n\n` +
        `Get our famous *${config.signatureDishes}* today and use code *${config.discountCode}* for *${config.discountAmount}*!\n\n` +
        `📍 *Location:* ${config.location}\n` +
        `📲 *Order / WhatsApp:* ${config.whatsappNumber}\n` +
        `🔗 *Order Link:* ${config.orderLink}\n\n` +
        `👉 ${config.callToAction}\n` +
        `_${config.customNote}_`;

    const handleGenerateAiPromo = async () => {
        setIsGenerating(true);
        try {
            const prompt = `Write a high-converting WhatsApp marketing message for:
Store Name: ${config.storeName}
Tagline: ${config.tagline}
Location: ${config.location}
Discount Code: ${config.discountCode}
Discount Offer: ${config.discountAmount}
Signature Items: ${config.signatureDishes}
WhatsApp Number: ${config.whatsappNumber}
Call To Action: ${config.callToAction}
Custom Note: ${config.customNote}

STRICT REQUIREMENT:
1. Embed the exact store name "${config.storeName}" and discount code "${config.discountCode}".
2. Include WhatsApp formatting like *bold text* and relevant emojis.
3. Keep it punchy, engaging, and under 120 words.`;

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, language: 'en' })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.text) {
                    setGeneratedText(data.text);
                } else {
                    setGeneratedText(compiledPreviewText);
                }
            } else {
                setGeneratedText(compiledPreviewText);
            }
        } catch (e) {
            console.error('Failed to generate AI marketing promo', e);
            setGeneratedText(compiledPreviewText);
        } finally {
            setIsGenerating(false);
        }
    };

    const tokensList = [
        { code: '{STORE_NAME}', label: 'Store Name', val: config.storeName },
        { code: '{LOCATION}', label: 'Location', val: config.location },
        { code: '{DISCOUNT_CODE}', label: 'Discount Code', val: config.discountCode },
        { code: '{DISCOUNT_AMOUNT}', label: 'Discount Amount', val: config.discountAmount },
        { code: '{SIGNATURE_DISHES}', label: 'Signature Dishes', val: config.signatureDishes },
        { code: '{WHATSAPP_NUMBER}', label: 'WhatsApp', val: config.whatsappNumber },
        { code: '{ORDER_LINK}', label: 'Order Link', val: config.orderLink },
        { code: '{TAGLINE}', label: 'Tagline', val: config.tagline },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-[#18181c] via-[#1f1f26] to-[#18181c] border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xl">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Personalization Engine</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary">
                        AI Marketing Configuration
                    </h1>
                    <p className="text-xs sm:text-sm text-text-tertiary mt-1 max-w-2xl">
                        Configure store-specific placeholders, custom offer tokens, and brand voices. Every AI campaign automatically injects these parameters so messages are 100% personalized to your store.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {savedNotice && (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-fade-in">
                            <Check className="w-3.5 h-3.5" /> Auto Saved
                        </span>
                    )}
                    <button
                        onClick={resetToDefaults}
                        className="px-4 py-2.5 rounded-xl bg-bg-surface-inset hover:bg-bg-surface text-text-secondary font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reset placeholders to original defaults"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Defaults</span>
                    </button>
                    <Link
                        to="/ai-insights"
                        className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
                    >
                        <Wand2 className="w-4 h-4" />
                        <span>Open AI Insights</span>
                    </Link>
                </div>
            </div>

            {/* Quick Presets Selection Bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-text-tertiary flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand-500" />
                        <span>1-Click Industry Presets</span>
                    </span>
                    <span className="text-[11px] text-text-tertiary hidden sm:inline">
                        Click any preset to pre-fill store placeholders instantly
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <button
                        onClick={() => applyPreset('kebab')}
                        className="p-3.5 rounded-2xl bg-[#1a1a1e] hover:bg-[#222228] border border-border-subtle hover:border-brand-500/50 text-left transition-all cursor-pointer group"
                    >
                        <div className="text-lg mb-1">🍢</div>
                        <div className="font-bold text-xs text-text-primary group-hover:text-brand-400">Kebab & Grill</div>
                        <div className="text-[10px] text-text-tertiary truncate">Preetham's Kabab</div>
                    </button>

                    <button
                        onClick={() => applyPreset('chaat')}
                        className="p-3.5 rounded-2xl bg-[#1a1a1e] hover:bg-[#222228] border border-border-subtle hover:border-brand-500/50 text-left transition-all cursor-pointer group"
                    >
                        <div className="text-lg mb-1">🍲</div>
                        <div className="font-bold text-xs text-text-primary group-hover:text-brand-400">Chaat Corner</div>
                        <div className="text-[10px] text-text-tertiary truncate">Gupta Chaat</div>
                    </button>

                    <button
                        onClick={() => applyPreset('dosa')}
                        className="p-3.5 rounded-2xl bg-[#1a1a1e] hover:bg-[#222228] border border-border-subtle hover:border-brand-500/50 text-left transition-all cursor-pointer group"
                    >
                        <div className="text-lg mb-1">🫓</div>
                        <div className="font-bold text-xs text-text-primary group-hover:text-brand-400">South Tiffin</div>
                        <div className="text-[10px] text-text-tertiary truncate">Sri Krishna Dosa</div>
                    </button>

                    <button
                        onClick={() => applyPreset('kirana')}
                        className="p-3.5 rounded-2xl bg-[#1a1a1e] hover:bg-[#222228] border border-border-subtle hover:border-brand-500/50 text-left transition-all cursor-pointer group"
                    >
                        <div className="text-lg mb-1">🛒</div>
                        <div className="font-bold text-xs text-text-primary group-hover:text-brand-400">Kirana & Grocery</div>
                        <div className="text-[10px] text-text-tertiary truncate">Neighborhood Store</div>
                    </button>

                    <button
                        onClick={() => applyPreset('organic')}
                        className="p-3.5 rounded-2xl bg-[#1a1a1e] hover:bg-[#222228] border border-border-subtle hover:border-brand-500/50 text-left transition-all cursor-pointer group col-span-2 sm:col-span-1"
                    >
                        <div className="text-lg mb-1">🍎</div>
                        <div className="font-bold text-xs text-text-primary group-hover:text-brand-400">Fruits & Veggies</div>
                        <div className="text-[10px] text-text-tertiary truncate">Green Organics</div>
                    </button>
                </div>
            </div>

            {/* Main Content Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Placeholder Configuration Form (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#141417] border border-border-subtle rounded-3xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <Sliders className="w-5 h-5 text-brand-500" />
                                <span>Store Placeholders & Offer Parameters</span>
                            </h2>
                            <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20">
                                Live Saved
                            </span>
                        </div>

                        <div className="space-y-4">
                            {/* Store Name & Location */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <Store className="w-3.5 h-3.5 text-brand-500" /> Store Name <span className="text-text-tertiary font-mono">({`{STORE_NAME}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.storeName}
                                        onChange={(e) => handleChange('storeName', e.target.value)}
                                        placeholder="e.g. Preetham's Kabab"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-brand-500" /> Store Location <span className="text-text-tertiary font-mono">({`{LOCATION}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.location}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                        placeholder="e.g. MG Road Gate 2"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Tagline & Signature Items */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Brand Tagline <span className="text-text-tertiary font-mono">({`{TAGLINE}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.tagline}
                                        onChange={(e) => handleChange('tagline', e.target.value)}
                                        placeholder="e.g. Charcoal Grilled Goodness"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <ShoppingBag className="w-3.5 h-3.5 text-brand-500" /> Signature Dish(es) <span className="text-text-tertiary font-mono">({`{SIGNATURE_DISHES}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.signatureDishes}
                                        onChange={(e) => handleChange('signatureDishes', e.target.value)}
                                        placeholder="e.g. Chicken Tikka & Seekh Kabab"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Discount Code & Discount Amount */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <Tag className="w-3.5 h-3.5 text-brand-500" /> Discount Code <span className="text-text-tertiary font-mono">({`{DISCOUNT_CODE}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.discountCode}
                                        onChange={(e) => handleChange('discountCode', e.target.value)}
                                        placeholder="e.g. KABAB20"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-mono font-bold text-brand-400 focus:outline-none focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5 text-brand-500" /> Offer Amount / Promo <span className="text-text-tertiary font-mono">({`{DISCOUNT_AMOUNT}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.discountAmount}
                                        onChange={(e) => handleChange('discountAmount', e.target.value)}
                                        placeholder="e.g. 20% OFF or Buy 1 Get 1"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Contact Number & Order Link */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-brand-500" /> WhatsApp Number <span className="text-text-tertiary font-mono">({`{WHATSAPP_NUMBER}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.whatsappNumber}
                                        onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                                        placeholder="e.g. +91 9900112233"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <Globe className="w-3.5 h-3.5 text-brand-500" /> Online Order Link <span className="text-text-tertiary font-mono">({`{ORDER_LINK}`})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.orderLink}
                                        onChange={(e) => handleChange('orderLink', e.target.value)}
                                        placeholder="e.g. https://streetvend.ai/cart"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Greeting & Call to Action */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5">
                                        Audience Greeting
                                    </label>
                                    <input
                                        type="text"
                                        value={config.audienceGreeting}
                                        onChange={(e) => handleChange('audienceGreeting', e.target.value)}
                                        placeholder="e.g. Hey Kebab Lover"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5">
                                        Call-to-Action (CTA)
                                    </label>
                                    <input
                                        type="text"
                                        value={config.callToAction}
                                        onChange={(e) => handleChange('callToAction', e.target.value)}
                                        placeholder="e.g. Show message at counter for instant discount!"
                                        className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Custom Note */}
                            <div>
                                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1.5">
                                    Custom Note / Fine Print
                                </label>
                                <input
                                    type="text"
                                    value={config.customNote}
                                    onChange={(e) => handleChange('customNote', e.target.value)}
                                    placeholder="e.g. Valid today only. Freshly prepared on order!"
                                    className="w-full bg-[#1b1b1f] border border-[#2e2e36] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Interactive Placeholder Token Reference Box */}
                    <div className="bg-[#141417] border border-border-subtle rounded-3xl p-6 shadow-lg">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-brand-500" />
                            <span>Available Placeholder Variables (Click to Copy)</span>
                        </h3>
                        <p className="text-xs text-text-tertiary mb-4">
                            You can copy any variable token below to use in your custom AI prompts or external WhatsApp templates:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {tokensList.map((t) => (
                                <button
                                    key={t.code}
                                    onClick={() => handleCopyToken(t.code)}
                                    className="px-2.5 py-1.5 rounded-xl bg-[#1d1d23] hover:bg-brand-500/20 border border-[#2d2d38] hover:border-brand-500/50 text-xs font-mono font-bold text-brand-400 flex items-center gap-1.5 transition-all cursor-pointer"
                                    title={`Copy ${t.code} (${t.val})`}
                                >
                                    <span>{t.code}</span>
                                    {copiedToken === t.code ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-3 h-3 text-text-tertiary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Realtime WhatsApp Live Preview (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#141417] border border-border-subtle rounded-3xl p-6 shadow-lg sticky top-24">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                                <MessageCircle className="w-4 h-4 text-emerald-400" />
                                <span>WhatsApp Live Preview</span>
                            </div>
                            <span className="text-[10px] font-bold text-text-tertiary bg-[#1c1c22] px-2 py-0.5 rounded-md">
                                {config.storeName}
                            </span>
                        </div>

                        {/* WhatsApp Phone Mockup Container */}
                        <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl overflow-hidden shadow-2xl">
                            {/* Chat Header */}
                            <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                                        {config.storeName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white truncate max-w-[160px]">
                                            {config.storeName}
                                        </div>
                                        <div className="text-[10px] text-emerald-400 font-medium">Official Business Account</div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-text-tertiary font-mono">Today</span>
                            </div>

                            {/* Chat Message Bubble Body */}
                            <div className="p-4 bg-[radial-[#0b141a]] bg-opacity-95 text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed font-sans min-h-[220px]">
                                <div className="bg-[#005c4b] text-[#e9edef] rounded-xl rounded-tr-none p-3.5 shadow-md border border-[#007a63] relative">
                                    {compiledPreviewText}
                                    <div className="text-[9px] text-[#8696a0] text-right mt-2 font-mono">
                                        10:42 AM ✓✓
                                    </div>
                                </div>
                            </div>

                            {/* Chat Action Footer */}
                            <div className="p-3 bg-[#202c33] border-t border-[#2a3942] flex items-center justify-between gap-2">
                                <button
                                    onClick={() => handleCopyPreview(compiledPreviewText)}
                                    className="flex-1 py-2 px-3 rounded-xl bg-[#2a3942] hover:bg-[#344652] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copied ? 'Copied Message!' : 'Copy Preview Text'}</span>
                                </button>
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(compiledPreviewText)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Test WA</span>
                                </a>
                            </div>
                        </div>

                        {/* Test AI Generation Engine Button */}
                        <div className="mt-6 pt-4 border-t border-border-subtle">
                            <button
                                onClick={handleGenerateAiPromo}
                                disabled={isGenerating}
                                className="w-full py-3.5 rounded-2xl primary-button-gradient text-white font-extrabold text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>{isGenerating ? 'AI Crafting Promo...' : 'Test AI Campaign Generator'}</span>
                            </button>

                            {generatedText && (
                                <div className="mt-4 p-4 rounded-2xl bg-[#1a1a20] border border-[#2d2d38] text-xs space-y-2">
                                    <div className="flex items-center justify-between text-brand-400 font-bold text-[11px]">
                                        <span className="flex items-center gap-1">
                                            <Wand2 className="w-3.5 h-3.5" /> AI Generated Result
                                        </span>
                                        <button
                                            onClick={() => handleCopyPreview(generatedText)}
                                            className="text-text-tertiary hover:text-white"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <div className="text-text-primary whitespace-pre-wrap text-[11px] font-sans">
                                        {generatedText}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
