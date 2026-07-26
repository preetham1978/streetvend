import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth';

export interface MarketingConfig {
    storeName: string;
    location: string;
    tagline: string;
    discountCode: string;
    discountAmount: string;
    signatureDishes: string;
    whatsappNumber: string;
    orderLink: string;
    audienceGreeting: string;
    callToAction: string;
    customNote: string;
    targetSegment: string;
    offerType: string;
}

const DEFAULT_MARKETING_CONFIG: MarketingConfig = {
    storeName: "Preetham's Kabab",
    location: "MG Road Metro Gate 2, Indiranagar",
    tagline: "Authentic Charcoal Tandoor & Kebabs",
    discountCode: "KABAB20",
    discountAmount: "20% OFF",
    signatureDishes: "Chicken Tikka & Seekh Kabab",
    whatsappNumber: "+91 9900112233",
    orderLink: "https://streetvend.ai/cart",
    audienceGreeting: "Hey Kebab & Foodie Lover",
    callToAction: "Show this WhatsApp message at counter for instant discount!",
    customNote: "Valid for today only. Freshly made on order!",
    targetSegment: "regular",
    offerType: "combo"
};

interface MarketingConfigContextType {
    config: MarketingConfig;
    updateConfig: (updates: Partial<MarketingConfig>) => void;
    resetToDefaults: () => void;
    applyPreset: (presetKey: string) => void;
}

const MarketingConfigContext = createContext<MarketingConfigContextType | undefined>(undefined);

const PRESETS: Record<string, Partial<MarketingConfig>> = {
    kebab: {
        storeName: "Preetham's Kabab",
        location: "MG Road Gate 2, Indiranagar",
        tagline: "Authentic Charcoal Tandoori & Kebabs",
        discountCode: "KABAB20",
        discountAmount: "20% OFF",
        signatureDishes: "Chicken Tikka & Seekh Kabab",
        audienceGreeting: "Hey Kebab & Foodie Lover",
        callToAction: "Show this WhatsApp message at counter for instant discount!",
        customNote: "Valid for today only. Hot & fresh from charcoal grill!"
    },
    chaat: {
        storeName: "Gupta Chaat Corner",
        location: "Main Market Circle, Ward 4",
        tagline: "Crispy Pani Puri & Chatpata Snacks",
        discountCode: "CHAAT15",
        discountAmount: "15% OFF",
        signatureDishes: "Pani Puri & Masala Aloo Tikki",
        audienceGreeting: "Hey Chaat Lover",
        callToAction: "Order at counter or WhatsApp for takeaway!",
        customNote: "Pure hygienic mineral water used for Pani Puri."
    },
    dosa: {
        storeName: "Sri Krishna Tiffin & Dosa Stall",
        location: "Station Road, Gate No 1",
        tagline: "Hot Butter Masala Dosa & Filter Coffee",
        discountCode: "DOSA25",
        discountAmount: "Buy 1 Get 1 Coffee Free",
        signatureDishes: "Ghee Roast Masala Dosa",
        audienceGreeting: "Hey Dosa Fan",
        callToAction: "Show message at counter to get free Filter Coffee!",
        customNote: "Made with authentic pure cow ghee."
    },
    kirana: {
        storeName: "Preetham Kirana & General Store",
        location: "Cross Road 5, Green Park",
        tagline: "Your Friendly Neighborhood Superstore",
        discountCode: "GROCERY50",
        discountAmount: "Flat ₹50 OFF on ₹500+",
        signatureDishes: "Basmati Rice & Sunflower Oil Pack",
        audienceGreeting: "Valued Neighborhood Customer",
        callToAction: "WhatsApp your order list for FREE doorstep delivery within 2 hours!",
        customNote: "Free home delivery on all orders above ₹300."
    },
    organic: {
        storeName: "Green Fresh Fruits & Organics",
        location: "Opposite City Hospital",
        tagline: "Farm Fresh Organic Produce Daily",
        discountCode: "FRESH10",
        discountAmount: "10% Cashback on UPI",
        signatureDishes: "Farm Fresh Shimla Apples & Organic Spinach",
        audienceGreeting: "Hey Health & Wellness Enthusiast",
        callToAction: "Order fresh morning baskets on WhatsApp!",
        customNote: "100% Pesticide-free & direct from local farmers."
    }
};

export const MarketingConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    const storageKey = `streetvend_marketing_config_${user?.id || 'guest'}`;

    const [config, setConfig] = useState<MarketingConfig>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return { ...DEFAULT_MARKETING_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Failed to load marketing config', e);
        }

        return {
            ...DEFAULT_MARKETING_CONFIG,
            storeName: user?.storeName || DEFAULT_MARKETING_CONFIG.storeName,
            location: DEFAULT_MARKETING_CONFIG.location,
            whatsappNumber: user?.phone || DEFAULT_MARKETING_CONFIG.whatsappNumber
        };
    });

    // Sync with user/branch updates if initial state was defaulted
    useEffect(() => {
        if (user?.storeName) {
            setConfig(prev => {
                const updated = {
                    ...prev,
                    storeName: prev.storeName === DEFAULT_MARKETING_CONFIG.storeName && user?.storeName ? user.storeName : prev.storeName,
                    location: prev.location === DEFAULT_MARKETING_CONFIG.location && prev.location,
                    whatsappNumber: prev.whatsappNumber === DEFAULT_MARKETING_CONFIG.whatsappNumber && user?.phone ? user.phone : prev.whatsappNumber
                };
                return updated;
            });
        }
    }, [user]);

    const updateConfig = (updates: Partial<MarketingConfig>) => {
        setConfig(prev => {
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem(storageKey, JSON.stringify(next));
            } catch (e) {
                console.error('Failed to save marketing config', e);
            }
            return next;
        });
    };

    const resetToDefaults = () => {
        const resetState = {
            ...DEFAULT_MARKETING_CONFIG,
            storeName: user?.storeName || DEFAULT_MARKETING_CONFIG.storeName,
            location: DEFAULT_MARKETING_CONFIG.location,
            whatsappNumber: user?.phone || DEFAULT_MARKETING_CONFIG.whatsappNumber
        };
        setConfig(resetState);
        try {
            localStorage.setItem(storageKey, JSON.stringify(resetState));
        } catch (e) {
            console.error('Failed to reset marketing config', e);
        }
    };

    const applyPreset = (presetKey: string) => {
        if (PRESETS[presetKey]) {
            updateConfig(PRESETS[presetKey]);
        }
    };

    return (
        <MarketingConfigContext.Provider value={{ config, updateConfig, resetToDefaults, applyPreset }}>
            {children}
        </MarketingConfigContext.Provider>
    );
};

export const useMarketingConfig = () => {
    const context = useContext(MarketingConfigContext);
    if (!context) {
        throw new Error('useMarketingConfig must be used within a MarketingConfigProvider');
    }
    return context;
};
