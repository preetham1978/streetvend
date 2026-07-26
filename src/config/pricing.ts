export type PlanTier = 'free' | 'starter' | 'professional' | 'growth' | 'enterprise';

export interface PlanConfig {
    id: PlanTier;
    name: string;
    tagline: string;
    monthlyPrice: number;
    annualMonthlyEquivalent: number;
    annualTotalPrice: number;
    maxDevices: number;
    maxProducts: number;
    aiQueryDailyLimit: number;
    allowedFeatures: string[];
    popular?: boolean;
    iconName: 'star' | 'flame' | 'zap' | 'rocket' | 'crown';
    desc: string;
    features: string[];
}

export const PLANS_CONFIG: Record<PlanTier, PlanConfig> = {
    free: {
        id: 'free',
        name: 'Free',
        tagline: 'Essential tools for micro-vendors starting their digital journey.',
        monthlyPrice: 0,
        annualMonthlyEquivalent: 0,
        annualTotalPrice: 0,
        maxDevices: 1,
        maxProducts: 20,
        aiQueryDailyLimit: 5,
        allowedFeatures: [
            'whatsapp_billing',
            'basic_store',
            'ai_chat'
        ],
        iconName: 'star',
        desc: 'Essential tools for micro-vendors starting their digital journey.',
        features: [
            'Single device login',
            'Up to 20 products',
            'WhatsApp billing',
            'Basic store page',
            'AI Chat (5 queries/day)'
        ]
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        tagline: 'The best value for growing carts and established street stalls.',
        monthlyPrice: 79,
        annualMonthlyEquivalent: Math.round(79 * 0.65),
        annualTotalPrice: Math.round(79 * 12 * 0.65),
        maxDevices: 1,
        maxProducts: Infinity,
        aiQueryDailyLimit: Infinity,
        allowedFeatures: [
            'whatsapp_billing',
            'custom_store',
            'print_bill',
            'sales_analytics',
            'ai_chat',
            'ai_smart_pricing',
            'ai_stock_predictions',
            'ai_daily_insights'
        ],
        iconName: 'flame',
        desc: 'The best value for growing carts and established street stalls.',
        features: [
            'Single device login',
            'Unlimited products',
            'Print bill feature',
            'Sales analytics',
            'AI Chat (Unlimited)',
            'AI Smart Pricing',
            'AI Stock Predictions',
            'AI Daily Insights'
        ]
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        tagline: 'Advanced intelligence for multi-device operations and teams.',
        monthlyPrice: 299,
        annualMonthlyEquivalent: Math.round(299 * 0.65),
        annualTotalPrice: Math.round(299 * 12 * 0.65),
        maxDevices: 3,
        maxProducts: Infinity,
        aiQueryDailyLimit: Infinity,
        allowedFeatures: [
            'whatsapp_billing',
            'custom_store',
            'store_qr',
            'print_bill',
            'sales_analytics',
            'advanced_analytics',
            'priority_support',
            'ai_chat',
            'ai_smart_pricing',
            'ai_stock_predictions',
            'ai_daily_insights',
            'ai_sales_forecast',
            'ai_customer_intelligence',
            'ai_voice_input'
        ],
        iconName: 'zap',
        desc: 'Advanced intelligence for multi-device operations and teams.',
        features: [
            'Multi-device (3 devices)',
            'Unlimited products',
            'WhatsApp billing',
            'Custom store page + QR',
            'AI Sales Forecast',
            'AI Customer Intelligence',
            'AI Boli Mode Input',
            'Priority support'
        ]
    },
    growth: {
        id: 'growth',
        name: 'Growth',
        tagline: 'Multi-outlet power for vendors running 2-3 locations with 5 devices.',
        monthlyPrice: 549,
        annualMonthlyEquivalent: Math.round(549 * 0.65),
        annualTotalPrice: Math.round(549 * 12 * 0.65),
        maxDevices: 5,
        maxProducts: Infinity,
        aiQueryDailyLimit: Infinity,
        allowedFeatures: [
            'whatsapp_billing',
            'custom_store',
            'store_qr',
            'print_bill',
            'sales_analytics',
            'advanced_analytics',
            'priority_support',
            'ai_chat',
            'ai_smart_pricing',
            'ai_stock_predictions',
            'ai_daily_insights',
            'ai_sales_forecast',
            'ai_customer_intelligence',
            'ai_voice_input',
            'ai_auto_reorder'
        ],
        popular: true,
        iconName: 'rocket',
        desc: 'Multi-outlet power for vendors running 2-3 locations with 5 devices & advanced analytics.',
        features: [
            'Multi-device (5 devices)',
            'Advanced multi-outlet analytics',
            'Unlimited products',
            'Custom store page + QR',
            'AI Customer Intelligence',
            'AI Auto-Reorder',
            'AI Sales Forecast & Boli Mode',
            'Priority support'
        ]
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'Full-scale inventory and marketing automation for franchises (4+ outlets).',
        monthlyPrice: 999,
        annualMonthlyEquivalent: Math.round(999 * 0.65),
        annualTotalPrice: Math.round(999 * 12 * 0.65),
        maxDevices: 10,
        maxProducts: Infinity,
        aiQueryDailyLimit: Infinity,
        allowedFeatures: [
            'whatsapp_billing',
            'custom_store',
            'store_qr',
            'print_bill',
            'sales_analytics',
            'advanced_analytics',
            'priority_support',
            'dedicated_support',
            'multi_branch',
            'full_inventory',
            'ai_chat',
            'ai_smart_pricing',
            'ai_stock_predictions',
            'ai_daily_insights',
            'ai_sales_forecast',
            'ai_customer_intelligence',
            'ai_voice_input',
            'ai_auto_reorder',
            'ai_marketing_messages'
        ],
        iconName: 'crown',
        desc: 'Full-scale inventory and marketing automation for franchises (4+ outlets).',
        features: [
            'Multi-device (10 devices)',
            'Multi-branch franchise tooling',
            'Unlimited products',
            'Dedicated support manager',
            'AI Marketing SMS Automation',
            'AI Auto-Reorder & Full Inventory',
            'All Professional & Growth AI features'
        ]
    }
};

export const PLAN_TIER_LEVELS: Record<PlanTier, number> = {
    free: 0,
    starter: 1,
    professional: 2,
    growth: 3,
    enterprise: 4
};

export function isTierAtLeast(currentPlan: PlanTier, requiredTier: PlanTier): boolean {
    return (PLAN_TIER_LEVELS[currentPlan] ?? 0) >= (PLAN_TIER_LEVELS[requiredTier] ?? 0);
}
