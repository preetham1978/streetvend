import { useState, useEffect } from 'react';
import { useI18n } from '../lib/I18nContext';
import { useAuth } from '../lib/auth';
import { getVendorTrustScore } from '../lib/dataCache';
import { Loader2, ChevronDown, ChevronUp, Lock, Share2, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TrustScoreData {
    totalScore?: number;
    subScores?: {
        consistency: number;
        stability: number;
        growth: number;
        digitalAdoption: number;
        tenure: number;
        reliability: number;
    };
    windowDays: number;
    dataThresholdMet: boolean;
    daysUntilUnlock?: number;
    ordersUntilUnlock?: number;
    computedAt: string;
}

export default function VendorTrustScoreCard() {
    const { t } = useI18n();
    const { user, session } = useAuth();
    const [scoreData, setScoreData] = useState<TrustScoreData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedScore, setExpandedScore] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;
        let isMounted = true;

        const loadTrustScore = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = session?.access_token;
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const data = await getVendorTrustScore(user.id, token);
                if (isMounted) {
                    setScoreData(data);
                }
            } catch (err: any) {
                console.error("Error loading trust score:", err);
                if (isMounted) {
                    setError("Failed to fetch business health insights.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadTrustScore();
        return () => { isMounted = false; };
    }, [user?.id, session?.access_token]);

    if (!user) return null;

    if (isLoading) {
        return (
            <div className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-4" />
                <span className="text-text-tertiary text-sm font-medium">Computing your Business Health Score...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl">
                <div className="text-center py-6">
                    <div className="text-brand-500 font-bold text-lg mb-2">Unavailable</div>
                    <p className="text-text-tertiary text-sm font-medium">{error}</p>
                </div>
            </div>
        );
    }

    // Default mock behavior for local testing if no token or DB session available
    const activeData = scoreData || {
        totalScore: 0,
        subScores: { consistency: 0, stability: 0, growth: 0, digitalAdoption: 0, tenure: 2, reliability: 10 },
        windowDays: 1,
        dataThresholdMet: false,
        computedAt: new Date().toISOString()
    };

    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const score = Math.round(activeData.totalScore || 0);
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const subScores = activeData.subScores || {
        consistency: 0,
        stability: 0,
        growth: 0,
        digitalAdoption: 0,
        tenure: 0,
        reliability: 0
    };

    const subScoreList = [
        {
            key: 'consistency',
            label: t('trust.regularly'),
            value: subScores.consistency,
            max: 25,
            tip: t('trust.consistencyTip')
        },
        {
            key: 'stability',
            label: t('trust.steady'),
            value: subScores.stability,
            max: 20,
            tip: t('trust.stabilityTip')
        },
        {
            key: 'growth',
            label: t('trust.growing'),
            value: subScores.growth,
            max: 15,
            tip: t('trust.growthTip')
        },
        {
            key: 'digitalAdoption',
            label: t('trust.upi'),
            value: subScores.digitalAdoption,
            max: 20,
            tip: t('trust.digitalTip')
        },
        {
            key: 'tenure',
            label: t('trust.tenure'),
            value: subScores.tenure,
            max: 10,
            tip: t('trust.tenureTip')
        },
        {
            key: 'reliability',
            label: t('trust.reliability'),
            value: subScores.reliability,
            max: 10,
            tip: t('trust.reliabilityTip')
        }
    ];

    const toggleExpand = (key: string) => {
        setExpandedScore(expandedScore === key ? null : key);
    };

    return (
        <div className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl relative overflow-hidden group flex flex-col justify-between">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-brand-500/5 pointer-events-none"></div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-sans font-bold text-text-primary uppercase tracking-widest leading-none mb-1">
                                {t('trust.title')}
                            </h2>
                            <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                                Rolling {activeData.windowDays}-Day Window
                            </p>
                        </div>
                    </div>
                </div>

                {!activeData.dataThresholdMet ? (
                    /* Discouraging yet encouraging "Not enough data" State */
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 text-[10px] font-extrabold uppercase tracking-widest mb-4 shadow-sm">
                            <Lock className="w-3 h-3" /> 14-Day Tenure Required
                        </div>

                        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20 mb-5 relative shadow-lg shadow-brand-500/10">
                            <Lock className="w-8 h-8 text-brand-500" />
                        </div>

                        <p className="text-text-primary text-sm font-bold mb-3 max-w-[300px]">
                            {t('trust.notEnoughData')}
                        </p>
                        
                        <div className="bg-bg-base/70 border border-border-subtle p-4 rounded-2xl w-full max-w-[300px] space-y-2.5 mb-4 text-left shadow-sm">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-text-tertiary font-medium">Days until unlock:</span>
                                <span className="text-brand-500 font-extrabold font-display">
                                    {activeData.daysUntilUnlock !== undefined ? activeData.daysUntilUnlock : 14} days
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-text-tertiary font-medium">Confirmed orders needed:</span>
                                <span className="text-brand-500 font-extrabold font-display">
                                    {activeData.ordersUntilUnlock !== undefined ? activeData.ordersUntilUnlock : 10} orders
                                </span>
                            </div>
                        </div>

                        <span className="text-[9px] text-text-tertiary uppercase tracking-widest font-black">
                            Requirements: 14 Days Tenure &amp; 10 Confirmed Orders
                        </span>
                    </div>
                ) : (
                    /* Full Scoring Dashboard */
                    <div className="space-y-8">
                        {/* Gauge & Headline Score Row */}
                        <div className="flex items-center gap-8 bg-bg-base/40 p-6 rounded-[2rem] border border-border-subtle/50">
                            <div className="relative flex items-center justify-center shrink-0">
                                <svg className="w-24 h-24 transform -rotate-90">
                                    {/* Track */}
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        stroke="#1e293b"
                                        strokeWidth="7"
                                        fill="transparent"
                                        className="opacity-40"
                                    />
                                    {/* Score Meter */}
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        stroke="#f97316"
                                        strokeWidth="7"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute text-center flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black font-display text-text-primary">{score}</span>
                                    <span className="text-[8px] text-text-tertiary uppercase tracking-wider font-bold">Health</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-brand-500 uppercase tracking-widest">Score Unlocked</span>
                                <p className="text-sm font-semibold text-text-primary">Your trust score is healthy!</p>
                                <p className="text-xs text-text-tertiary leading-relaxed">
                                    This non-credit score acts as a solid foundation for future micro-lending partners on our platform.
                                </p>
                            </div>
                        </div>

                        {/* Sub-scores List */}
                        <div className="space-y-4">
                            {subScoreList.map((sub) => {
                                const isExpanded = expandedScore === sub.key;
                                const percentage = (sub.value / sub.max) * 100;
                                return (
                                    <div
                                        key={sub.key}
                                        className="bg-bg-base/30 rounded-2xl border border-border-subtle/40 overflow-hidden transition-all duration-200"
                                    >
                                        <button
                                            onClick={() => toggleExpand(sub.key)}
                                            className="w-full p-4 flex items-center justify-between text-left hover:bg-bg-base/20 transition-colors"
                                        >
                                            <div className="flex-1 pr-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-text-primary leading-tight">
                                                        {sub.label}
                                                    </span>
                                                    <span className="text-xs font-black font-display text-brand-500">
                                                        {sub.value} <span className="text-text-tertiary font-medium">/ {sub.max}</span>
                                                    </span>
                                                </div>
                                                {/* Bar */}
                                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="text-text-tertiary pl-2 shrink-0">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </button>

                                        {/* Actionable honest Tip */}
                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="border-t border-border-subtle/30 bg-brand-500/[0.02]"
                                                >
                                                    <div className="p-4 text-xs font-semibold text-brand-500/90 leading-relaxed italic flex items-start gap-2">
                                                        <span className="text-brand-500 shrink-0 font-bold">💡 Tip:</span>
                                                        <span>{sub.tip}</span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Lending Partner Export Integration Placeholder */}
            <div className="mt-8 pt-6 border-t border-border-subtle/50 relative z-10">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-black">
                            {t('trust.comingSoon')}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></div>
                    </div>
                    
                    <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 bg-slate-800/50 text-text-tertiary border border-border-subtle/80 cursor-not-allowed text-xs font-bold py-3 px-4 rounded-xl opacity-60 hover:bg-slate-800 transition-colors"
                        title={t('trust.premiumOnly')}
                    >
                        <Lock className="w-3.5 h-3.5 text-text-tertiary" />
                        <span>{t('trust.shareReport')}</span>
                    </button>
                    <p className="text-[10px] text-center text-text-tertiary/70 italic font-medium leading-normal">
                        {t('trust.premiumOnly')}
                    </p>
                </div>
            </div>
        </div>
    );
}
