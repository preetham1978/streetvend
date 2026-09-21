import { apiFetch } from '../lib/apiFetch';
import { useState, useEffect, ReactNode } from 'react';
import { ShieldCheck, IndianRupee, Check, Star, Flame, Zap, Rocket, Crown, ArrowRight, ChevronDown, X, Loader2, CreditCard, Smartphone, Sparkles, Calendar, AlertCircle, Copy, Clock, ExternalLink, QrCode } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/I18nContext';
import { useAuth } from '../lib/auth';
import { PLANS_CONFIG, PlanTier, PlanConfig, isTierAtLeast } from '../config/pricing';
import { supabase } from '../lib/supabase';

export default function Plans() {
    const { t } = useI18n();
    const { user, updatePlan, updateUser, refreshProfile } = useAuth();
    const currentPlan = user?.subscription || 'free';
    
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [checkoutPlan, setCheckoutPlan] = useState<{ plan: PlanConfig; cycle: 'monthly' | 'annual'; amount: number } | null>(null);
    const [checkoutMethod, setCheckoutMethod] = useState<'upi' | 'card'>('upi');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const [utrInput, setUtrInput] = useState('');
    const [copiedVpa, setCopiedVpa] = useState(false);
    const [activeUpgradeRequest, setActiveUpgradeRequest] = useState<any | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const planList = Object.values(PLANS_CONFIG) as PlanConfig[];

    const [isDowngradeModalOpen, setIsDowngradeModalOpen] = useState(false);
    const [downgradeTarget, setDowngradeTarget] = useState<PlanConfig | null>(null);

    const fetchUpgradeStatus = async () => {
        if (!user?.id) return;
        try {
            const res = await apiFetch(`/api/vendor/upgrade-status?vendorId=${user.id}`);
            const data = await res.json();
            if (data && data.requests && data.requests.length > 0) {
                const pending = data.requests.find((r: any) => r.status === 'pending_verification');
                if (pending) {
                    setActiveUpgradeRequest(pending);
                } else {
                    setActiveUpgradeRequest(data.requests[0]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch upgrade status:", err);
        }
    };

    useEffect(() => {
        fetchUpgradeStatus();
    }, [user?.id]);

    const handleOpenCheckout = (plan: PlanConfig) => {
        const isDowngrade = !isTierAtLeast(plan.id, currentPlan);
        
        if (isDowngrade) {
            setDowngradeTarget(plan);
            setIsDowngradeModalOpen(true);
            return;
        }

        if (plan.id === 'free') {
            return;
        }

        const amount = billingCycle === 'annual' ? plan.annualTotalPrice : plan.monthlyPrice;
        setCheckoutPlan({ plan, cycle: billingCycle, amount });
        setIsSuccess(false);
        setCheckoutMethod('upi');
        setUtrInput('');
        setSubmitError(null);
    };

    const handleSubmitUpiVerification = async () => {
        if (!checkoutPlan || !user?.id) return;
        const trimmedUtr = utrInput.trim();
        if (!trimmedUtr || trimmedUtr.length < 4) {
            setSubmitError('Please enter a valid 12-digit UPI transaction reference number (UTR / Ref ID).');
            return;
        }

        setIsProcessing(true);
        setSubmitError(null);

        const baseAmount = checkoutPlan.amount;
        const totalPayable = parseFloat((baseAmount * 1.18).toFixed(2));

        try {
            const res = await apiFetch('/api/vendor/submit-upi-upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId: user.id,
                    planId: checkoutPlan.plan.id,
                    cycle: checkoutPlan.cycle,
                    amount: baseAmount,
                    totalAmount: totalPayable,
                    utr: trimmedUtr
                })
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to submit payment verification.');
            }

            setIsSuccess(true);
            setActiveUpgradeRequest(data.request);
            setUtrInput('');
            fetchUpgradeStatus();
        } catch (err: any) {
            console.error("Submit UPI verification error:", err);
            setSubmitError(err.message || 'Error submitting payment verification.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleScheduleDowngrade = async () => {
        if (!downgradeTarget || !user) return;
        setIsProcessing(true);
        const effectiveDate = new Date();
        effectiveDate.setDate(effectiveDate.getDate() + 30);
        const effectiveDateStr = effectiveDate.toISOString();

        try {
            if (supabase) {
                try {
                    const res = await apiFetch('/api/vendor/schedule-downgrade', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetPlan: downgradeTarget.id, vendorId: user.id })
                    });
                    const data = await res.json();
                    if (data && data.success) {
                        await refreshProfile();
                    } else {
                        await (supabase.from('vendors') as any)
                            .update({
                                scheduled_downgrade: downgradeTarget.id,
                                downgrade_effective_date: effectiveDateStr,
                                billing_period_end: effectiveDateStr
                            })
                            .eq('id', user.id);
                        
                        updateUser({
                            scheduledDowngrade: downgradeTarget.id,
                            downgradeEffectiveDate: effectiveDateStr,
                            billingPeriodEnd: effectiveDateStr
                        });
                    }
                } catch (e) {
                    console.error("Schedule downgrade error:", e);
                    updateUser({
                        scheduledDowngrade: downgradeTarget.id,
                        downgradeEffectiveDate: effectiveDateStr,
                        billingPeriodEnd: effectiveDateStr
                    });
                }
            } else {
                updateUser({
                    scheduledDowngrade: downgradeTarget.id,
                    downgradeEffectiveDate: effectiveDateStr,
                    billingPeriodEnd: effectiveDateStr
                });
            }
            setIsDowngradeModalOpen(false);
            setDowngradeTarget(null);
        } catch (err) {
            console.error("Failed to schedule downgrade:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!checkoutPlan || !user) return;
        setIsProcessing(true);

        try {
            const amount = checkoutPlan.amount;
            
            // 1. Call server to initiate PayU payment
            const response = await apiFetch('/api/payu/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: checkoutPlan.plan.id,
                    vendorId: user.id,
                    vendorEmail: user.email,
                    vendorName: user.ownerName || (user.email ? user.email.split('@')[0] : 'Vendor'),
                    amount: amount,
                    productInfo: `${checkoutPlan.plan.name} (${checkoutPlan.cycle})`
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // 2. Redirect to PayU by programmatically submitting a form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.payuUrl;

            Object.entries(data.params).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value as string;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            
        } catch (err: any) {
            console.error("Payment initiation error:", err);
            alert("Payment failed to start: " + (err.message || "Unknown error"));
            setIsProcessing(false);
        }
    };

    const getPlanIcon = (iconName: string) => {
        switch (iconName) {
            case 'star': return <Star className="w-7 h-7 text-text-tertiary" />;
            case 'flame': return <Flame className="w-7 h-7 text-brand-500" />;
            case 'zap': return <Zap className="w-7 h-7 text-accent-blue" />;
            case 'rocket': return <Rocket className="w-7 h-7 text-accent-purple" />;
            case 'crown': return <Crown className="w-7 h-7 text-amber-400" />;
            default: return <Star className="w-7 h-7 text-text-tertiary" />;
        }
    };

    const faqs = [
        { q: 'How do I pay for an upgrade?', a: 'You can securely upgrade using UPI, credit/debit cards, or net banking. Your plan activates immediately after a successful transaction.' },
        { q: 'What is the 35% discount on annual billing?', a: 'When you choose annual billing, you receive a 35% discount calculated as monthly rate × 12 × 0.65, billed once per year.' },
        { q: 'Can I cancel or change plans anytime?', a: 'Yes, you can manage your subscription from your dashboard. There are no lock-in periods for Starter, Professional, or Growth plans.' },
        { q: 'Does WhatsApp billing work on all plans?', a: 'Yes! Basic WhatsApp billing is available on all plans, including the Free tier.' }
    ];

    return (
        <div className="min-h-screen bg-bg-base text-text-primary pt-12 px-4 sm:px-6 lg:px-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)' }}>
            <div className="max-w-7xl mx-auto">
                {/* Active Upgrade Request Banners */}
                {activeUpgradeRequest && activeUpgradeRequest.status === 'pending_verification' && (
                    <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-spin-slow" />
                            <div>
                                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                                    <span>Payment Submitted — Pending Verification</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 font-extrabold uppercase">Under Review</span>
                                </h3>
                                <p className="text-xs text-text-secondary mt-1">
                                    Requested Plan: <strong className="text-text-primary capitalize">{activeUpgradeRequest.plan_name || activeUpgradeRequest.tier}</strong> | Payable Amount: <strong className="text-text-primary">₹{activeUpgradeRequest.amount}</strong> | UTR: <span className="font-mono text-text-primary font-bold">{activeUpgradeRequest.gateway_ref}</span>
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                            VERIFYING PAYMENT
                        </span>
                    </div>
                )}

                {activeUpgradeRequest && activeUpgradeRequest.status === 'rejected' && (
                    <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm text-text-primary">
                                    Payment Verification Rejected
                                </h3>
                                <p className="text-xs text-text-secondary mt-1">
                                    {activeUpgradeRequest.note || 'Unable to verify UTR reference number. Please verify payment details and resubmit.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveUpgradeRequest(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0 cursor-pointer"
                        >
                            Resubmit Upgrade
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold uppercase tracking-widest mb-4">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Transparent Pricing for Every Vendor</span>
                    </div>
                    <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-text-primary tracking-tight mb-4">
                        Choose the Perfect Plan for Your Business
                    </h1>
                    <p className="text-text-secondary text-base sm:text-lg">
                        From solo street stalls to multi-outlet franchises, scale your operations with AI-powered billing and inventory.
                    </p>

                    {/* Billing Toggle */}
                    <div className="mt-8 flex flex-col sm:inline-flex sm:flex-row items-center p-1.5 rounded-2xl bg-bg-surface border border-border-subtle shadow-inner w-full sm:w-auto gap-1">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                                "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] cursor-pointer",
                                billingCycle === 'monthly'
                                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                                    : "text-text-secondary hover:text-text-primary"
                            )}
                        >
                            Monthly Billing
                        </button>
                        <button
                            onClick={() => setBillingCycle('annual')}
                            className={cn(
                                "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer",
                                billingCycle === 'annual'
                                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                                    : "text-text-secondary hover:text-text-primary"
                            )}
                        >
                            <span>Annual Billing</span>
                            <span className="px-2 py-0.5 rounded-full bg-accent-green/20 text-accent-green text-[10px] font-black uppercase tracking-widest">
                                Save 35%
                            </span>
                        </button>
                    </div>
                </div>

                {/* 5-Tier Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16 items-stretch">
                    {planList.map((plan) => {
                        const isCurrent = currentPlan === plan.id;
                        const displayPrice = plan.id === 'free' 
                            ? '₹0' 
                            : billingCycle === 'annual' 
                                ? `₹${plan.annualMonthlyEquivalent}` 
                                : `₹${plan.monthlyPrice}`;
                        
                        return (
                            <div
                                key={plan.id}
                                className={cn(
                                    "rounded-3xl sm:rounded-[2.5rem] bg-bg-surface border p-5 sm:p-6 flex flex-col justify-between transition-all relative group",
                                    plan.popular 
                                        ? "border-brand-500 ring-2 ring-brand-500/30 shadow-2xl lg:-translate-y-2" 
                                        : "border-border-subtle hover:border-brand-500/40"
                                )}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-bg-base border border-border-subtle flex items-center justify-center">
                                            {getPlanIcon(plan.iconName)}
                                        </div>
                                        {isCurrent && (
                                            <span className="px-3 py-1 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/20 text-[10px] font-bold uppercase tracking-wider">
                                                Active
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-display font-extrabold text-xl text-text-primary mb-1">
                                        {plan.name}
                                    </h3>
                                    <p className="text-xs text-text-secondary min-h-[3rem] mb-6">
                                        {plan.desc}
                                    </p>

                                    <div className="mb-6 pb-6 border-b border-border-subtle">
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-display font-black text-3xl sm:text-4xl text-text-primary">
                                                {displayPrice}
                                            </span>
                                            {plan.id !== 'free' && (
                                                <span className="text-xs font-bold text-text-tertiary">
                                                    /mo
                                                </span>
                                            )}
                                        </div>
                                        {plan.id !== 'free' && billingCycle === 'annual' && (
                                            <p className="text-[11px] text-accent-green font-bold mt-1">
                                                Billed annually at ₹{plan.annualTotalPrice}/yr (35% off)
                                            </p>
                                        )}
                                        {plan.id !== 'free' && billingCycle === 'monthly' && (
                                            <p className="text-[11px] text-text-tertiary mt-1">
                                                + 18% GST applicable
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                                            What's included:
                                        </p>
                                        {plan.features.map((feat, idx) => (
                                            <div key={idx} className="flex items-start gap-2.5 text-xs text-text-secondary">
                                                <Check className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {(() => {
                                    const isDowngradeTarget = !isTierAtLeast(plan.id, currentPlan) && !isCurrent;
                                    const isScheduledDowngrade = user?.scheduledDowngrade === plan.id;
                                    
                                    if (isScheduledDowngrade) {
                                        return (
                                            <button
                                                disabled
                                                className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 bg-amber-500/10 text-amber-600 border border-amber-500/30"
                                            >
                                                Downgrade Scheduled
                                            </button>
                                        );
                                    }
                                    
                                    if (isCurrent) {
                                        return (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    disabled
                                                    className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-bg-base text-text-tertiary border border-border-subtle cursor-not-allowed flex items-center justify-center"
                                                >
                                                    Current Plan
                                                </button>
                                                {/* Only show subtle downgrade link if we aren't currently free, and haven't scheduled one yet */}
                                                {!user?.scheduledDowngrade && currentPlan !== 'free' && (
                                                    <div className="text-center mt-1">
                                                        <span className="text-[10px] text-text-tertiary">Select a lower plan to downgrade</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    
                                    if (plan.id === 'free') {
                                        return (
                                            <button
                                                disabled={isCurrent}
                                                onClick={() => handleOpenCheckout(plan)}
                                                className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 bg-bg-base border border-border-subtle hover:border-brand-500 text-text-primary"
                                            >
                                                {isDowngradeTarget ? 'Switch to Free' : 'Get Started'}
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            onClick={() => handleOpenCheckout(plan)}
                                            className={cn(
                                                "w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2",
                                                isDowngradeTarget 
                                                    ? "bg-bg-base border border-border-subtle hover:border-brand-500 text-text-primary"
                                                    : plan.popular
                                                        ? "primary-button-gradient text-white shadow-brand-500/20 hover:scale-[1.02]"
                                                        : "bg-bg-base border border-border-subtle hover:border-brand-500 text-text-primary"
                                            )}
                                        >
                                            {isDowngradeTarget ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`}
                                        </button>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <TrustBadge 
                        icon={<ShieldCheck className="w-8 h-8 text-accent-green" />}
                        title="Secure & RBI Compliant"
                        desc="All transactions are encrypted with 256-bit security and processed via trusted payment gateways."
                    />
                    <TrustBadge 
                        icon={<IndianRupee className="w-8 h-8 text-brand-500" />}
                        title="Instant GST Invoices"
                        desc="Receive automatic GST-compliant tax invoices instantly for all your business expense claims."
                    />
                    <TrustBadge 
                        icon={<Calendar className="w-8 h-8 text-accent-blue" />}
                        title="Cancel Anytime"
                        desc="No long-term contracts or hidden cancellation fees. Switch or downgrade plans whenever your business needs change."
                    />
                </div>

                {/* FAQ Section */}
                <div className="max-w-4xl mx-auto bg-bg-surface border border-border-subtle rounded-[2.5rem] p-8 sm:p-12 mb-12">
                    <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-center mb-8">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-base">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full text-left px-6 py-5 flex justify-between items-center font-bold text-base sm:text-lg text-text-primary cursor-pointer"
                                >
                                    {faq.q}
                                    <ChevronDown className={cn("w-5 h-5 text-brand-500 transition-transform duration-300", openFaq === i ? "rotate-180" : "")} />
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="px-6 pb-6 text-text-secondary leading-relaxed text-sm sm:text-base"
                                        >
                                            {faq.a}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Downgrade Modal */}
            <AnimatePresence>
                {isDowngradeModalOpen && downgradeTarget && user && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isProcessing && setIsDowngradeModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg-surface w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-border-subtle relative z-10"
                        >
                            <div className="p-6 sm:p-8">
                                <h3 className="font-display font-bold text-xl mb-4">Schedule Plan Downgrade</h3>
                                <div className="space-y-4 text-text-secondary text-sm">
                                    <p>
                                        Your plan will change from <span className="font-bold text-text-primary">{PLANS_CONFIG[currentPlan as PlanTier].name}</span> to <span className="font-bold text-text-primary">{downgradeTarget.name}</span> at the end of your current billing period.
                                    </p>
                                    <p>
                                        You'll keep all <strong>{PLANS_CONFIG[currentPlan as PlanTier].name}</strong> features until then.
                                    </p>
                                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 text-amber-700 dark:text-amber-400 mt-4">
                                        <p className="font-bold mb-2 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Important Limits
                                        </p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Your product limit will be reduced to {downgradeTarget.maxProducts === Infinity ? 'Unlimited' : downgradeTarget.maxProducts}.</li>
                                            <li>Existing products are kept, but you won't be able to add new ones if over the limit.</li>
                                            <li>Some AI features may become restricted based on the {downgradeTarget.name} plan tier.</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                    <button
                                        onClick={() => setIsDowngradeModalOpen(false)}
                                        disabled={isProcessing}
                                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider border border-border-subtle hover:bg-bg-base transition-colors"
                                    >
                                        Keep Current Plan
                                    </button>
                                    <button
                                        onClick={handleScheduleDowngrade}
                                        disabled={isProcessing}
                                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule Downgrade'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Checkout Modal */}
            <AnimatePresence>
                {checkoutPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg-surface w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-border-subtle my-8 max-h-[90vh] flex flex-col"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-border-subtle shrink-0">
                                <div>
                                    <h3 className="font-display font-bold text-xl">Secure UPI Checkout</h3>
                                    <p className="text-xs text-text-tertiary">
                                        {checkoutPlan.plan.name} Plan ({checkoutPlan.cycle === 'annual' ? 'Annual Billing - 35% Off' : 'Monthly Billing'})
                                    </p>
                                </div>
                                <button onClick={() => !isProcessing && setCheckoutPlan(null)} className="p-2 rounded-full hover:bg-bg-base transition-colors cursor-pointer">
                                    <X className="w-5 h-5 text-text-secondary" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                {isSuccess ? (
                                    <div className="py-8 text-center flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/30">
                                            <Clock className="w-8 h-8 animate-pulse" />
                                        </div>
                                        <h4 className="text-2xl font-bold mb-2 text-text-primary">Payment Submitted for Verification!</h4>
                                        <p className="text-text-secondary text-sm max-w-md mb-4">
                                            Your transaction reference for <strong className="text-brand-500">{checkoutPlan.plan.name}</strong> plan upgrade has been recorded.
                                        </p>
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400 mb-6 text-left space-y-1">
                                            <p className="font-bold">Status: Pending Verification</p>
                                            <p>Our payment admin verifies incoming UPI transfers promptly. Your account tier will update automatically upon verification.</p>
                                        </div>
                                        <button
                                            onClick={() => setCheckoutPlan(null)}
                                            className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-brand-600 transition-colors cursor-pointer"
                                        >
                                            Close & Return
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Pricing Summary Box */}
                                        <div className="bg-bg-base rounded-2xl p-4 mb-5 border border-border-subtle">
                                            <div className="flex justify-between items-center mb-2 text-xs">
                                                <span className="font-medium text-text-secondary">{checkoutPlan.plan.name} Plan ({checkoutPlan.cycle})</span>
                                                <span className="font-bold text-text-primary">₹{checkoutPlan.amount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-text-secondary mb-3 pb-3 border-b border-border-subtle">
                                                <span>GST (18%)</span>
                                                <span>₹{(checkoutPlan.amount * 0.18).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <span>Total Payable</span>
                                                <span className="text-brand-500 font-display font-extrabold text-lg">
                                                    ₹{(checkoutPlan.amount * 1.18).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment Method Selector */}
                                        <div className="space-y-2 mb-5">
                                            <h4 className="font-bold text-[11px] text-text-secondary uppercase tracking-wider">Select Payment Method</h4>
                                            
                                            <div
                                                onClick={() => setCheckoutMethod('upi')}
                                                className={cn(
                                                    "flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                                                    checkoutMethod === 'upi' ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500" : "border-border-subtle hover:border-text-tertiary"
                                                )}
                                            >
                                                <Smartphone className={cn("w-5 h-5", checkoutMethod === 'upi' ? "text-brand-500" : "text-text-secondary")} />
                                                <div className="text-left flex-1">
                                                    <p className="font-bold text-xs text-text-primary">UPI QR Code (GPay, PhonePe, Paytm, BHIM)</p>
                                                    <p className="text-[11px] text-text-tertiary">Scan & pay directly to official business UPI VPA</p>
                                                </div>
                                            </div>

                                            <div
                                                className="flex items-center gap-3 p-3.5 rounded-xl border border-border-subtle opacity-60 bg-bg-base/50 cursor-not-allowed relative"
                                            >
                                                <CreditCard className="w-5 h-5 text-text-tertiary" />
                                                <div className="text-left flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-xs text-text-secondary">Credit / Debit Card</p>
                                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase">Coming Soon</span>
                                                    </div>
                                                    <p className="text-[11px] text-text-tertiary">Card gateway currently under integration. Please use UPI.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* UPI QR Display & Details */}
                                        {checkoutMethod === 'upi' && (() => {
                                            const totalPayable = (checkoutPlan.amount * 1.18).toFixed(2);
                                            const upiUrl = `upi://pay?pa=vel66550284@barodampay&pn=${encodeURIComponent('VELOAI PRIVATE LIMITED')}&am=${totalPayable}&cu=INR&tn=${encodeURIComponent(`StreetVend ${checkoutPlan.plan.name} Plan Upgrade`)}`;
                                            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

                                            return (
                                                <div className="space-y-4">
                                                    {/* QR Box */}
                                                    <div className="bg-white p-4 rounded-2xl border border-border-subtle shadow-md text-center max-w-[240px] mx-auto">
                                                        <img
                                                            src={qrImageUrl}
                                                            alt="Business UPI QR Code"
                                                            className="w-48 h-48 mx-auto rounded-lg"
                                                        />
                                                        <p className="text-[10px] font-bold text-slate-600 mt-2 tracking-wide uppercase">
                                                            Scan with any UPI App to Pay
                                                        </p>
                                                    </div>

                                                    {/* Merchant Details */}
                                                    <div className="bg-bg-base p-3.5 rounded-xl border border-border-subtle space-y-2 text-xs">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-text-tertiary">Merchant Name:</span>
                                                            <span className="font-bold text-text-primary">VELOAI PRIVATE LIMITED</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-text-tertiary">UPI VPA (ID):</span>
                                                            <div className="flex items-center gap-1.5 font-mono font-bold text-brand-500">
                                                                <span>vel66550284@barodampay</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText('vel66550284@barodampay');
                                                                        setCopiedVpa(true);
                                                                        setTimeout(() => setCopiedVpa(false), 2000);
                                                                    }}
                                                                    className="p-1 rounded hover:bg-brand-500/10 transition-colors"
                                                                    title="Copy VPA"
                                                                >
                                                                    {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-1 border-t border-border-subtle">
                                                            <span className="text-text-tertiary">Exact Payable Amount:</span>
                                                            <span className="font-bold text-emerald-500 text-sm">₹{totalPayable}</span>
                                                        </div>
                                                    </div>

                                                    {/* UTR Input */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                                            UPI Transaction Reference (UTR Number)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={utrInput}
                                                            onChange={(e) => setUtrInput(e.target.value)}
                                                            placeholder="Enter 12-digit UTR e.g. 423812903182"
                                                            className="w-full px-4 py-3 bg-bg-base border border-border-subtle rounded-xl text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-brand-500"
                                                        />
                                                        <p className="text-[11px] text-text-tertiary mt-1">
                                                            After scanning and paying ₹{totalPayable}, copy the 12-digit UTR/Ref ID from GPay / PhonePe / Paytm and paste it above.
                                                        </p>
                                                    </div>

                                                    {submitError && (
                                                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                                                            {submitError}
                                                        </div>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={handleSubmitUpiVerification}
                                                        disabled={isProcessing || !utrInput.trim()}
                                                        className="w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs primary-button-gradient text-white shadow-xl shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                                    >
                                                        {isProcessing ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Submitting Verification...
                                                            </>
                                                        ) : (
                                                            `Submit UTR for ₹${totalPayable} Upgrade`
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TrustBadge({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
    return (
        <div className="flex flex-col items-center text-center p-8 rounded-[2rem] bg-bg-surface border border-border-subtle group hover:border-brand-500/30 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-bg-base border border-border-subtle flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                {icon}
            </div>
            <h3 className="font-bold text-text-primary mb-2 text-lg tracking-tight">{title}</h3>
            <p className="text-xs text-text-secondary font-medium leading-relaxed">{desc}</p>
        </div>
    );
}
