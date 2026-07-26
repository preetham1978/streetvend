import React, { useState, useEffect } from 'react';
import { Send, Sparkles, MessageCircle, Copy, Check, Users, Gift, ShieldAlert, Store, MapPin, Sliders } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from './UpgradeModal';
import { useI18n } from '../lib/I18nContext';
import { useAuth } from '../lib/auth';
import { mockDb } from '../lib/supabase';
import { useMarketingConfig } from '../lib/MarketingConfigContext';
import { Link } from 'react-router-dom';

function getDefaultItemForVendor(storeName: string, category: string, vendorId?: string, configSignature?: string): string {
    if (configSignature && configSignature.trim().length > 0) {
        return configSignature.trim();
    }

    // Check mockDb for matching products if available
    if (vendorId) {
        const vendorProds = mockDb.products.filter(p => p.vendorId === vendorId);
        if (vendorProds.length >= 2) {
            return `${vendorProds[0].name} & ${vendorProds[1].name}`;
        } else if (vendorProds.length === 1) {
            return vendorProds[0].name;
        }
    }

    const lowerName = storeName.toLowerCase();
    const lowerCat = category.toLowerCase();

    if (lowerName.includes('kabab') || lowerName.includes('kebab') || lowerCat.includes('meat') || lowerCat.includes('non-veg')) {
        return 'Chicken Tikka & Seekh Kabab';
    }
    if (lowerName.includes('dosa') || lowerCat.includes('south indian')) {
        return 'Masala Dosa & Filter Coffee';
    }
    if (lowerName.includes('organics') || lowerName.includes('green') || lowerCat.includes('fruit') || lowerCat.includes('veg')) {
        return 'Farm Fresh Apples & Spinach';
    }
    if (lowerName.includes('kirana') || lowerCat.includes('grocery')) {
        return 'Basmati Rice & Sunflower Oil';
    }
    if (lowerName.includes('chaat') || lowerCat.includes('street food')) {
        return 'Pani Puri & Aloo Tikki';
    }

    return 'Special Signature Combo';
}

function buildStoreCentricTemplate(
    storeName: string,
    location: string,
    segment: string,
    offerType: string,
    item: string,
    category: string,
    discountCode?: string,
    tagline?: string,
    cta?: string
): string {
    const uppercaseStore = storeName.toUpperCase();
    
    let audienceGreeting = "Hey Foodie";
    const lowerName = storeName.toLowerCase();
    const lowerCategory = category.toLowerCase();
    const lowerItem = item.toLowerCase();

    if (lowerName.includes("kabab") || lowerName.includes("kebab") || lowerCategory.includes("meat") || lowerItem.includes("kabab") || lowerItem.includes("kebab") || lowerItem.includes("chicken")) {
        audienceGreeting = "Hey Kebab & Foodie Lover";
    } else if (lowerName.includes("dosa") || lowerCategory.includes("south indian") || lowerItem.includes("dosa")) {
        audienceGreeting = "Hey Dosa Fan";
    } else if (lowerCategory.includes("fruit") || lowerCategory.includes("veggie") || lowerCategory.includes("organic")) {
        audienceGreeting = "Hey Health Enthusiast";
    } else if (lowerCategory.includes("grocery") || lowerCategory.includes("kirana")) {
        audienceGreeting = "Valued Customer";
    } else if (lowerCategory.includes("chaat") || lowerItem.includes("puri")) {
        audienceGreeting = "Hey Chaat Lover";
    }

    let segmentBadge = "SPECIAL PROMO";
    if (segment === 'regular') segmentBadge = "VIP REGULAR DISCOUNT";
    if (segment === 'weekend') segmentBadge = "WEEKEND SPECIAL";
    if (segment === 'inactive') segmentBadge = "WE MISS YOU SPECIAL";
    if (segment === 'high_spenders') segmentBadge = "PREMIUM MEMBER OFFER";

    let offerDetail = `Get your favorite *${item}* at a special price today!`;
    if (offerType === 'combo') {
        offerDetail = `Get your favorite *${item} Combo* with 20% OFF today!`;
    } else if (offerType === 'bogo') {
        offerDetail = `Buy 2 *${item}* & Get 1 FREE today!`;
    } else if (offerType === 'free_beverage') {
        offerDetail = `Order *${item}* & get a FREE refreshing cold drink!`;
    } else if (offerType === 'flat_discount') {
        offerDetail = `Get Flat ₹30 Cashback on UPI for *${item}*!`;
    }

    const codePart = discountCode ? ` Use Code: *${discountCode}*` : '';
    const taglinePart = tagline ? ` (${tagline})` : '';
    const ctaPart = cta || 'Show this WhatsApp message at counter!';

    return (
        `🔥 *${segmentBadge} AT ${uppercaseStore}!* 🔥\n` +
        `${audienceGreeting}! ${offerDetail}${taglinePart}${codePart}\n` +
        `📍 Visit us at ${location} or order direct at counter!\n` +
        `_${ctaPart}_`
    );
}

export default function MarketingMessageGenerator() {
    const { user } = useAuth();
    const { config } = useMarketingConfig();
    const { hasFeature } = usePlanLimits();
    const { language } = useI18n();

    const activeStoreName = config.storeName || user?.storeName || "Preetham's Kabab";
    const activeLocation = config.location || "Main Outlet";
    const activeCategory = user?.category || "Street Food";

    const [segment, setSegment] = useState('regular');
    const [offer, setOffer] = useState('combo');
    const [customItem, setCustomItem] = useState(() => 
        getDefaultItemForVendor(activeStoreName, activeCategory, user?.id, config.signatureDishes)
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Sync default item and initial text whenever config, user or branch changes
    useEffect(() => {
        const defaultDish = getDefaultItemForVendor(activeStoreName, activeCategory, user?.id, config.signatureDishes);
        setCustomItem(defaultDish);
        setGeneratedText(
            buildStoreCentricTemplate(activeStoreName, activeLocation, segment, offer, defaultDish, activeCategory, config.discountCode, config.tagline, config.callToAction)
        );
    }, [activeStoreName, activeLocation, activeCategory, user?.id, config.signatureDishes, config.discountCode, config.tagline, config.callToAction]);

    // Update preview when form parameters change
    const handleControlChange = (newSegment?: string, newOffer?: string, newItem?: string) => {
        const seg = newSegment !== undefined ? newSegment : segment;
        const off = newOffer !== undefined ? newOffer : offer;
        const itm = newItem !== undefined ? newItem : customItem;

        setGeneratedText(
            buildStoreCentricTemplate(activeStoreName, activeLocation, seg, off, itm, activeCategory, config.discountCode, config.tagline, config.callToAction)
        );
    };

    const handleGenerate = async () => {
        if (!hasFeature('ai_marketing_messages')) {
            setShowUpgradeModal(true);
            return;
        }

        setIsGenerating(true);
        try {
            const prompt = `Write a short, high-converting WhatsApp promotional message for the store "${activeStoreName}" (Owner: ${user?.ownerName || 'Vendor'}, Category: ${activeCategory}, Location: ${activeLocation}).
Tagline: ${config.tagline || ''}
Discount Code: ${config.discountCode || ''}
Offer Amount: ${config.discountAmount || ''}
WhatsApp Contact: ${config.whatsappNumber || ''}
Segment: ${segment}
Offer Type: ${offer}
Featured Item/Dish: ${customItem}

STRICT STORE-CENTRIC REQUIREMENTS:
1. Include the exact store name "${activeStoreName}" prominently in bold.
2. The message MUST be tailored strictly for "${activeStoreName}" and its featured item "${customItem}".
3. Include discount code "${config.discountCode}" if provided.
4. Do NOT mention generic or wrong store names.
5. Include appealing emojis, WhatsApp formatting (*bold* text), and a clear call-to-action for ${activeStoreName}.
6. Respond in language: ${language}.`;

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    language
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.text) {
                    setGeneratedText(data.text);
                }
            } else {
                setGeneratedText(
                    buildStoreCentricTemplate(activeStoreName, activeLocation, segment, offer, customItem, activeCategory)
                );
            }
        } catch (err) {
            console.error('Marketing message generation error', err);
            setGeneratedText(
                buildStoreCentricTemplate(activeStoreName, activeLocation, segment, offer, customItem, activeCategory)
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShareWhatsapp = () => {
        if (!hasFeature('ai_marketing_messages')) {
            setShowUpgradeModal(true);
            return;
        }

        const encoded = encodeURIComponent(generatedText);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    return (
        <div className="bg-[#141416] border border-[#28282e] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#28282e]">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-extrabold uppercase tracking-widest border border-brand-500/20 mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI MARKETING ENGINE</span>
                    </div>
                    <h2 className="font-sans font-extrabold text-2xl text-text-primary flex items-center gap-2 flex-wrap">
                        <span>AI WhatsApp Marketing Generator</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-tertiary">
                        <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 font-bold border border-brand-500/20 flex items-center gap-1">
                            <Store className="w-3 h-3 inline" /> {activeStoreName}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-text-tertiary" /> {activeLocation}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/ai-marketing"
                        className="px-4 py-2 rounded-xl bg-[#222228] hover:bg-[#2c2c34] text-brand-400 font-bold text-xs flex items-center gap-1.5 border border-brand-500/30 transition-all shadow-sm"
                    >
                        <Sliders className="w-3.5 h-3.5 text-brand-400" />
                        <span>Configure AI Placeholders</span>
                    </Link>
                </div>

                {!hasFeature('ai_marketing_messages') && (
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-amber-500/20 transition-all shrink-0"
                    >
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        <span>Enterprise Feature</span>
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-2">
                        Target Segment
                    </label>
                    <select
                        value={segment}
                        onChange={(e) => {
                            setSegment(e.target.value);
                            handleControlChange(e.target.value, undefined, undefined);
                        }}
                        className="w-full bg-[#1b1b1e] border border-[#2d2d34] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                    >
                        <option value="regular">Regular VIP Foodies (180+ customers)</option>
                        <option value="weekend">Weekend Snackers (95+ customers)</option>
                        <option value="inactive">Inactive Customers (15+ days away)</option>
                        <option value="high_spenders">High-Spenders (&gt;₹300/order)</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-2">
                        Offer Type
                    </label>
                    <select
                        value={offer}
                        onChange={(e) => {
                            setOffer(e.target.value);
                            handleControlChange(undefined, e.target.value, undefined);
                        }}
                        className="w-full bg-[#1b1b1e] border border-[#2d2d34] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                    >
                        <option value="combo">Combo Deal Special (20% Off)</option>
                        <option value="bogo">Buy 2 Get 1 Free</option>
                        <option value="free_beverage">Free Cold Beverage</option>
                        <option value="flat_discount">Flat ₹30 Cashback on UPI</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-2">
                        Featured Dish / Item
                    </label>
                    <input
                        type="text"
                        value={customItem}
                        onChange={(e) => {
                            setCustomItem(e.target.value);
                            handleControlChange(undefined, undefined, e.target.value);
                        }}
                        placeholder="e.g. Chicken Tikka & Seekh Kabab"
                        className="w-full bg-[#1b1b1e] border border-[#2d2d34] rounded-xl p-3 text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                    />
                </div>
            </div>

            <div className="mb-6">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-3.5 rounded-2xl primary-button-gradient text-white font-extrabold text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGenerating ? 'Generating AI Campaign...' : `Generate AI Promo for ${activeStoreName}`}</span>
                </button>
            </div>

            {/* Message Preview Box */}
            <div className="bg-[#18181c] border border-[#2d2d32] rounded-2xl p-5 mb-6 relative">
                <div className="flex items-center justify-between mb-3 text-xs text-text-tertiary">
                    <span className="font-bold uppercase tracking-widest flex items-center gap-1.5 text-accent-green">
                        <MessageCircle className="w-4 h-4 text-accent-green" /> WhatsApp Campaign Copy ({activeStoreName})
                    </span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(generatedText);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#222226] text-text-secondary hover:text-white font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>

                <div className="bg-[#121214] p-4 rounded-xl border border-[#25252a] text-xs leading-relaxed text-text-primary whitespace-pre-wrap font-sans">
                    {generatedText}
                </div>
            </div>

            {/* Broadcast Action */}
            <button
                onClick={handleShareWhatsapp}
                className="w-full py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
                <Send className="w-4 h-4" />
                <span>Launch WhatsApp Broadcast ({activeStoreName})</span>
            </button>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="AI Marketing Messages Generator"
                requiredTier="enterprise"
                message="AI Marketing Generator writes targeted promotional WhatsApp campaigns customized per customer segment and dispatches broadcasts instantly. Upgrade to Enterprise to unlock AI marketing tools."
            />
        </div>
    );
}
