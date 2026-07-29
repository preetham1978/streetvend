import { useState, ReactNode } from 'react';
import { ShieldCheck, IndianRupee, Check, Star, Flame, Zap, Rocket, Crown, ArrowRight, ChevronDown, X, Loader2, CreditCard, Smartphone, Sparkles, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/I18nContext';
import { useAuth } from '../lib/auth';
import { PLANS_CONFIG, PlanTier, PlanConfig } from '../config/pricing';
import { supabase } from '../lib/supabase';

export default function Plans() {
    const { t } = useI18n();
    const { user, updatePlan } = useAuth();
    const currentPlan = user?.plan || 'free';
    
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [checkoutPlan, setCheckoutPlan] = useState<{ plan: PlanConfig; cycle: 'monthly' | 'annual'; amount: number } | null>(null);
    const [checkoutMethod, setCheckoutMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const planList = Object.values(PLANS_CONFIG) as PlanConfig[];

    const handleOpenCheckout = (plan: PlanConfig) => {
        if (plan.id === 'free') {
            updatePlan('free');
            return;
        }
        const amount = billingCycle === 'annual' ? plan.annualTotalPrice : plan.monthlyPrice;
        setCheckoutPlan({ plan, cycle: billingCycle, amount });
        setIsSuccess(false);
    };

    const handleConfirmPayment = async () => {
        if (!checkoutPlan || !user) return;
        setIsProcessing(true);

        try {
            const amount = checkoutPlan.amount;
            
            // 1. Call server to initiate PayU payment
            const response = await fetch('/api/payu/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: checkoutPlan.plan.id,
                    vendorId: user.id,
                    vendorEmail: user.email,
                    vendorName: user.name || user.email.split('@')[0],
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
        { q: 'What is Boli Mode?', a: 'Boli Mode is our exclusive AI voice-order feature that lets you speak orders naturally in your preferred language to generate bills instantly.' },
        { q: 'Can I cancel or change plans anytime?', a: 'Yes, you can manage your subscription from your dashboard. There are no lock-in periods for Starter, Professional, or Growth plans.' },
        { q: 'Does WhatsApp billing work on all plans?', a: 'Yes! Basic WhatsApp billing is available on all plans, including the Free tier.' }
    ];

    return (
        <div className="min-h-screen bg-bg-base text-text-primary py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
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
                    <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-bg-surface border border-border-subtle shadow-inner">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
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
                                "px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2",
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
                                    "rounded-[2.5rem] bg-bg-surface border p-6 flex flex-col justify-between transition-all relative group",
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

                                <button
                                    onClick={() => handleOpenCheckout(plan)}
                                    disabled={isCurrent}
                                    className={cn(
                                        "w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2",
                                        isCurrent
                                            ? "bg-bg-base text-text-tertiary border border-border-subtle cursor-not-allowed shadow-none"
                                            : plan.popular
                                                ? "primary-button-gradient text-white shadow-brand-500/20 hover:scale-[1.02]"
                                                : "bg-bg-base border border-border-subtle hover:border-brand-500 text-text-primary"
                                    )}
                                >
                                    {isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Get Started' : `Upgrade to ${plan.name}`}
                                </button>
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

            {/* Checkout Modal */}
            <AnimatePresence>
                {checkoutPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg-surface w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-border-subtle"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-border-subtle">
                                <div>
                                    <h3 className="font-display font-bold text-xl">Secure Checkout</h3>
                                    <p className="text-xs text-text-tertiary">
                                        {checkoutPlan.plan.name} Plan ({checkoutPlan.cycle === 'annual' ? 'Annual Billing - 35% Off' : 'Monthly Billing'})
                                    </p>
                                </div>
                                <button onClick={() => !isProcessing && !isSuccess && setCheckoutPlan(null)} className="p-2 rounded-full hover:bg-bg-base transition-colors cursor-pointer">
                                    <X className="w-5 h-5 text-text-secondary" />
                                </button>
                            </div>

                            {isSuccess ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full bg-accent-green/20 flex items-center justify-center mb-6">
                                        <Check className="w-10 h-10 text-accent-green" />
                                    </div>
                                    <h4 className="text-2xl font-bold mb-2">Payment Successful!</h4>
                                    <p className="text-text-secondary">Your plan has been upgraded to {checkoutPlan.plan.name} ({checkoutPlan.cycle}).</p>
                                </div>
                            ) : (
                                <div className="p-6">
                                    <div className="bg-bg-base rounded-2xl p-6 mb-6 border border-border-subtle">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold">{checkoutPlan.plan.name} Plan ({checkoutPlan.cycle})</span>
                                            <span className="font-bold">₹{checkoutPlan.amount}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm text-text-secondary mb-4 pb-4 border-b border-border-subtle">
                                            <span>GST (18%)</span>
                                            <span>₹{(checkoutPlan.amount * 0.18).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>Total Payable</span>
                                            <span className="text-brand-500 font-display font-extrabold text-xl">
                                                ₹{(checkoutPlan.amount * 1.18).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        <h4 className="font-bold text-xs text-text-secondary uppercase tracking-wider mb-3">Select Payment Method</h4>
                                        <button
                                            onClick={() => setCheckoutMethod('upi')}
                                            className={cn("w-full flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer", checkoutMethod === 'upi' ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500" : "border-border-subtle hover:border-text-tertiary")}
                                        >
                                            <Smartphone className={cn("w-6 h-6", checkoutMethod === 'upi' ? "text-brand-500" : "text-text-secondary")} />
                                            <div className="text-left">
                                                <p className="font-bold text-sm">UPI (GPay, PhonePe, Paytm)</p>
                                                <p className="text-xs text-text-tertiary">Instant 1-tap approval</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setCheckoutMethod('card')}
                                            className={cn("w-full flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer", checkoutMethod === 'card' ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500" : "border-border-subtle hover:border-text-tertiary")}
                                        >
                                            <CreditCard className={cn("w-6 h-6", checkoutMethod === 'card' ? "text-brand-500" : "text-text-secondary")} />
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Credit / Debit Card</p>
                                                <p className="text-xs text-text-tertiary">Visa, Mastercard, RuPay</p>
                                            </div>
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleConfirmPayment}
                                        disabled={isProcessing}
                                        className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs primary-button-gradient text-white shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processing Secure Payment...
                                            </>
                                        ) : (
                                            `Pay ₹{(checkoutPlan.amount * 1.18).toFixed(2)}`
                                        )}
                                    </button>
                                </div>
                            )}
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
