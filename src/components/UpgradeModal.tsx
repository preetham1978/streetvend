import React from 'react';
import { X, Lock, Check, Crown, Flame, Zap, ShieldCheck } from 'lucide-react';
import { usePlanLimits, PlanTier, TIER_CONFIGS } from '../hooks/usePlanLimits';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    requiredTier?: PlanTier;
    message?: string;
}

export default function UpgradeModal({
    isOpen,
    onClose,
    featureName = 'This feature',
    requiredTier = 'starter',
    message
}: UpgradeModalProps) {
    const { currentPlan, updatePlan } = usePlanLimits();

    if (!isOpen) return null;

    const handleUpgrade = (tier: PlanTier) => {
        updatePlan(tier);
        onClose();
    };

    const targetConfig = TIER_CONFIGS[requiredTier] || TIER_CONFIGS.starter;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-[#141416] border border-[#28282e] rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl relative my-0 sm:my-8 mt-auto sm:mt-auto">
                <div className="w-12 h-1 bg-[#28282e] rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-[#222228] transition-all cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 text-xs font-bold uppercase tracking-widest mb-4">
                    <Lock className="w-3.5 h-3.5 text-brand-500" />
                    <span>Tier Lock</span>
                </div>

                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-text-primary mb-2">
                    Unlock {featureName}
                </h2>
                <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                    {message || `${featureName} is available starting on the ${targetConfig.name} (or higher). Upgrade your subscription to unlock this capability instantly.`}
                </p>

                {/* Quick Upgrade Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {(['starter', 'professional', 'enterprise'] as PlanTier[]).map((tier) => {
                        const cfg = TIER_CONFIGS[tier];
                        const isCurrent = currentPlan === tier;
                        const isTarget = requiredTier === tier;

                        return (
                            <div
                                key={tier}
                                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                                    isTarget
                                        ? 'bg-brand-500/10 border-brand-500 shadow-lg shadow-brand-500/10'
                                        : 'bg-bg-surface-inset border-border-subtle'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-base text-text-primary">{cfg.name}</h3>
                                        {tier === 'enterprise' && <Crown className="w-4 h-4 text-amber-400" />}
                                        {tier === 'professional' && <Zap className="w-4 h-4 text-accent-blue" />}
                                        {tier === 'starter' && <Flame className="w-4 h-4 text-brand-500" />}
                                    </div>
                                    <div className="font-sans font-extrabold text-xl text-brand-500 mb-3">
                                        {cfg.monthlyPrice}
                                    </div>
                                    <ul className="space-y-1.5 mb-4 text-xs text-text-secondary">
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-3 h-3 text-accent-green shrink-0" />
                                            <span>
                                                {cfg.maxProducts === Infinity ? 'Unlimited products' : `${cfg.maxProducts} products`}
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-3 h-3 text-accent-green shrink-0" />
                                            <span>
                                                {cfg.maxDevices === 1 ? '1 Device' : `Up to ${cfg.maxDevices} Devices`}
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    onClick={() => handleUpgrade(tier)}
                                    disabled={isCurrent}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                        isCurrent
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : isTarget
                                            ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md'
                                            : 'bg-[#26262b] text-text-primary hover:bg-[#303037]'
                                    }`}
                                >
                                    {isCurrent ? 'Active Plan' : `Switch to ${cfg.name.split(' ')[0]}`}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Note */}
                <div className="flex items-center justify-between pt-4 border-t border-[#28282e] text-xs text-text-tertiary">
                    <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-accent-green" /> Immediate activation via Streetvend
                    </span>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary font-bold cursor-pointer"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
