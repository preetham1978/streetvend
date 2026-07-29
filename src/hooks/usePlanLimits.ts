import { useAuth } from '../lib/auth';
import { PlanTier, PlanConfig, PLANS_CONFIG, PLAN_TIER_LEVELS, isTierAtLeast } from '../config/pricing';

export type { PlanTier, PlanConfig };
export { PLANS_CONFIG as TIER_CONFIGS, PLAN_TIER_LEVELS, isTierAtLeast };

export function usePlanLimits() {
    const { user, updatePlan } = useAuth();
    const currentPlan: PlanTier = (user?.subscription as PlanTier) || 'free';
    const config = PLANS_CONFIG[currentPlan] || PLANS_CONFIG.free;

    const hasFeature = (featureKey: string): boolean => {
        return config.allowedFeatures.includes(featureKey);
    };

    const getRequiredTierForFeature = (featureKey: string): PlanTier => {
        if (PLANS_CONFIG.free.allowedFeatures.includes(featureKey)) return 'free';
        if (PLANS_CONFIG.starter.allowedFeatures.includes(featureKey)) return 'starter';
        if (PLANS_CONFIG.professional.allowedFeatures.includes(featureKey)) return 'professional';
        if (PLANS_CONFIG.growth.allowedFeatures.includes(featureKey)) return 'growth';
        return 'enterprise';
    };

    const canAddProduct = (currentProductCount: number): boolean => {
        return currentProductCount < config.maxProducts;
    };

    const getAiUsageToday = (): number => {
        const today = new Date().toISOString().split('T')[0];
        const stored = localStorage.getItem(`ai_usage_${today}`);
        return stored ? parseInt(stored, 10) : 0;
    };

    const incrementAiUsage = (): boolean => {
        if (config.aiQueryDailyLimit === Infinity) return true;
        const used = getAiUsageToday();
        if (used >= config.aiQueryDailyLimit) {
            return false;
        }
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`ai_usage_${today}`, (used + 1).toString());
        return true;
    };

    const canUseAiChat = (): { allowed: boolean; remaining: number } => {
        if (config.aiQueryDailyLimit === Infinity) {
            return { allowed: true, remaining: Infinity };
        }
        const used = getAiUsageToday();
        const remaining = Math.max(0, config.aiQueryDailyLimit - used);
        return { allowed: remaining > 0, remaining };
    };

    return {
        currentPlan,
        config,
        hasFeature,
        getRequiredTierForFeature,
        canAddProduct,
        getAiUsageToday,
        incrementAiUsage,
        canUseAiChat,
        updatePlan
    };
}
