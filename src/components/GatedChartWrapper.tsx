import React, { useState } from 'react';
import { Lock, Crown, Zap, Flame, Sparkles } from 'lucide-react';
import { usePlanLimits, PlanTier, isTierAtLeast, TIER_CONFIGS } from '../hooks/usePlanLimits';
import UpgradeModal from './UpgradeModal';

interface GatedChartWrapperProps {
    requiredTier: PlanTier;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}

export default function GatedChartWrapper({
    requiredTier,
    title,
    subtitle,
    children,
    className = ''
}: GatedChartWrapperProps) {
    const { currentPlan } = usePlanLimits();
    const isUnlocked = isTierAtLeast(currentPlan, requiredTier);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const targetConfig = TIER_CONFIGS[requiredTier] || TIER_CONFIGS.starter;

    const getTierBadge = () => {
        if (requiredTier === 'enterprise') {
            return (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> Enterprise Tier
                </span>
            );
        }
        if (requiredTier === 'professional') {
            return (
                <span className="px-2.5 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/30 text-accent-blue font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 text-accent-blue" /> Pro Tier
                </span>
            );
        }
        return (
            <span className="px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-brand-500" /> Starter Tier
            </span>
        );
    };

    return (
        <div className={`relative bg-bg-surface border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-border-subtle">
                <div>
                    <h3 className="font-sans font-extrabold text-lg sm:text-xl text-text-primary flex items-center gap-2">
                        {title}
                    </h3>
                    {subtitle && <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>}
                </div>
                <div>{getTierBadge()}</div>
            </div>

            {/* Content Area */}
            <div className="relative min-h-[260px] flex flex-col justify-center">
                {/* Visual Chart Content */}
                <div className={!isUnlocked ? 'filter blur-md select-none pointer-events-none opacity-40 transition-all' : ''}>
                    {children}
                </div>

                {/* Gating Overlay when Locked */}
                {!isUnlocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-md rounded-2xl border border-brand-500/20 text-center animate-fade-in">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-500 flex items-center justify-center mb-3 shadow-lg shadow-brand-500/10">
                            <Lock className="w-6 h-6" />
                        </div>

                        <h4 className="font-sans font-extrabold text-xl text-white mb-1">
                            Unlock {title}
                        </h4>
                        <p className="text-xs text-text-secondary max-w-md mb-5 leading-relaxed">
                            Visual chart analytics and trend graphs are restricted on your current plan. Upgrade to <strong className="text-brand-500 capitalize">{targetConfig.name}</strong> to view real-time graphical insights.
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-5 py-2.5 rounded-xl primary-button-gradient text-white text-xs font-extrabold uppercase tracking-wider shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Upgrade to {targetConfig.name} ({targetConfig.monthlyPrice})</span>
                        </button>
                    </div>
                )}
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName={title}
                requiredTier={requiredTier}
                message={`Unlock visual analytics, charts, and forecasts by upgrading to ${targetConfig.name}.`}
            />
        </div>
    );
}
