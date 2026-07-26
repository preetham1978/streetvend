import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Utensils, Carrot, Drumstick, ShoppingBasket, Shirt, Key, Headphones, Watch, Martini, Gift, PencilRuler, Plus, Check, MessageSquare, Receipt, Smartphone, Bot, Store, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { useI18n } from '../lib/I18nContext';

export default function Home() {
    const { t } = useI18n();
    const [quantities, setQuantities] = useState({
        paniPuri: 1,
        bhelPuri: 2,
        alooTikki: 1
    });

    const categories = [
        { name: 'Street Food', desc: 'Chaat, dosa, biryani & more', icon: Utensils, color: 'text-brand-500', bg: 'bg-brand-500/10' },
        { name: 'Vegetables & Fruits', desc: 'Farm fresh, daily produce', icon: Carrot, color: 'text-accent-green', bg: 'bg-accent-green/10' },
        { name: 'Meat & Seafood', desc: 'Chicken, mutton, fish & eggs', icon: Drumstick, color: 'text-accent-pink', bg: 'bg-accent-pink/10' },
        { name: 'Groceries', desc: 'Daily essentials & staples', icon: ShoppingBasket, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
        { name: 'Laundry', desc: 'Wash, iron & dry-clean services', icon: Shirt, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
        { name: 'Key Maker', desc: 'Keys, locks & quick repairs', icon: Key, color: 'text-brand-500', bg: 'bg-brand-500/10' },
        { name: 'Mobile Accessories', desc: 'Covers, chargers, earphones & more', icon: Headphones, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
        { name: 'Watch Repair\'s', desc: 'Battery, strap & watch servicing', icon: Watch, color: 'text-accent-gray', bg: 'bg-accent-gray/10' },
        { name: 'Pan Shop', desc: 'Paan, cigarettes, snacks & refreshers', icon: Martini, color: 'text-accent-green', bg: 'bg-accent-green/10' },
        { name: 'Fancy Store', desc: 'Gifts, jewellery & fancy items', icon: Gift, color: 'text-accent-pink', bg: 'bg-accent-pink/10' },
        { name: 'Stationery', desc: 'Notebooks, pens & school supplies', icon: PencilRuler, color: 'text-accent-teal', bg: 'bg-accent-teal/10' },
    ];

    const features = [
        { title: 'Easy Product Management', desc: 'Add, update, or remove products in seconds. Organize by category and track stock status.', icon: ShoppingBasket, color: 'text-brand-500', bg: 'bg-brand-500/10' },
        { title: 'Boli Mode — Voice Bills', desc: 'Tap the mic and speak in your language. Auto cart, cash/UPI, stock update & WhatsApp draft — no typing in a rush.', icon: Headphones, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
        { title: 'WhatsApp Billing', desc: 'Generate bills instantly and send them directly to your customer\'s WhatsApp. No printer needed.', icon: MessageSquare, color: 'text-accent-green', bg: 'bg-accent-green/10' },
        { title: 'Print Bills', desc: 'Starter plan and above lets you print professional bills for customers who want a physical copy.', icon: Receipt, color: 'text-accent-gray', bg: 'bg-accent-gray/10' },
        { title: 'AI Smart Pricing', desc: 'AI analyzes market data and demand to suggest optimal prices for your products.', icon: Sparkles, color: 'text-accent-pink', bg: 'bg-accent-pink/10' },
        { title: 'Multi-Device Login', desc: 'Pro & Enterprise plans support multiple devices — perfect for vendors with branches or helpers.', icon: Smartphone, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
        { title: 'AI Chat Assistant', desc: 'Ask questions about your business in natural language. Get insights, forecasts, and recommendations.', icon: Bot, color: 'text-accent-teal', bg: 'bg-accent-teal/10' },
    ];

    return (
        <div className="flex flex-col bg-bg-base">
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden hero-glow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center mb-12">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500/10 border border-brand-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
                            <span className="text-sm font-bold gradient-text">{t('metadata.tagline')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="text-center lg:text-left">
                            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-display font-bold tracking-tight mb-8 leading-[0.9]">
                                <span className="block text-text-primary">{t('home.hero.title1')}</span>
                                <span className="block gradient-text">{t('home.hero.title2')} {t('home.hero.title3')}</span>
                                <span className="block gradient-text">{t('home.hero.title4')}</span>
                            </h1>
                            <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                {t('home.hero.subtitle')}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
                                <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-full primary-button-gradient text-white font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2">
                                    {t('home.hero.cta.start')} <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link to="/plans" className="w-full sm:w-auto px-8 py-4 rounded-full border border-border-subtle bg-bg-surface hover:border-text-tertiary text-text-primary font-bold text-lg transition-colors flex items-center justify-center">
                                    {t('home.hero.cta.plans')}
                                </Link>
                            </div>
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                <StatPill text={t('home.hero.stats.vendors')} />
                                <StatPill text={t('home.hero.stats.bills')} />
                                <StatPill text={t('home.hero.stats.wa')} />
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-md">
                            <div className="absolute -inset-4 bg-brand-500/20 blur-3xl rounded-full -z-10"></div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="bg-bg-surface rounded-[2rem] overflow-hidden shadow-2xl border border-border-subtle"
                            >
                                <div className="bill-header-gradient px-8 py-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                        <h3 className="font-display font-bold text-white text-lg">Raju's Chaat Corner</h3>
                                    </div>
                                    <span className="shrink-0 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/30 shadow-sm">PRO</span>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4 mb-6">
                                        <BillItem 
                                            name="Pani Puri" 
                                            price="40" 
                                            qty={quantities.paniPuri} 
                                            setQty={(q) => setQuantities(prev => ({ ...prev, paniPuri: q }))} 
                                        />
                                        <BillItem 
                                            name="Bhel Puri" 
                                            price="50" 
                                            qty={quantities.bhelPuri} 
                                            setQty={(q) => setQuantities(prev => ({ ...prev, bhelPuri: q }))} 
                                        />
                                        <BillItem 
                                            name="Aloo Tikki" 
                                            price="60" 
                                            qty={quantities.alooTikki} 
                                            setQty={(q) => setQuantities(prev => ({ ...prev, alooTikki: q }))} 
                                        />
                                    </div>
                                    <div className="h-px bg-border-subtle mb-6 w-full"></div>
                                    <div className="mb-6">
                                        <div className="flex justify-between items-end mb-3">
                                            <span className="text-text-secondary text-xs font-bold tracking-tight">Today's sales</span>
                                            <span className="text-3xl font-sans font-extrabold text-money-green not-italic">₹4,280</span>
                                        </div>
                                        <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                                            <div className="h-full bg-brand-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/20 flex items-center gap-3">
                                        <Sparkles className="w-5 h-5 text-brand-500 shrink-0" />
                                        <span className="text-xs font-medium text-text-secondary">
                                            ⚡ AI suggests +8% on Aloo Tikki
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-32 border-y border-border-subtle">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-5xl font-display font-bold mb-6">{t('home.categories.title')}</h2>
                        <p className="text-lg text-text-secondary">
                            {t('home.categories.subtitle')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {categories.map((cat, i) => (
                            <div key={i} className="p-8 rounded-[2rem] bg-bg-surface border border-border-subtle hover:border-brand-500/50 transition-all group cursor-default">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", cat.bg, cat.color)}>
                                    <cat.icon className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-xl mb-2 text-text-primary">{cat.name}</h3>
                                <p className="text-sm text-text-secondary leading-relaxed">{cat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-5xl font-display font-bold mb-6">{t('home.features.title')}</h2>
                        <p className="text-lg text-text-secondary">
                            {t('home.features.subtitle')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, i) => (
                            <div key={i} className="p-10 rounded-[2.5rem] bg-bg-surface border border-border-subtle hover:border-brand-500/30 transition-all">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8", feature.bg, feature.color)}>
                                    <feature.icon className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-2xl mb-4 text-text-primary">{feature.title}</h3>
                                <p className="text-text-secondary leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Steps */}
            <section className="py-32 bg-bg-surface border-y border-border-subtle">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-5xl font-display font-bold mb-24 text-center">{t('home.steps.title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { num: '01', title: 'Register Your Store', desc: 'Sign up with your name, phone, and store details. Choose your category and you\'re ready!' },
                            { num: '02', title: 'Add Your Products', desc: 'Quickly add products with prices and units. Organize them by category for easy browsing.' },
                            { num: '03', title: 'Start Billing', desc: 'Add items to cart, generate bills, and send them via WhatsApp or print. It\'s that simple!' }
                        ].map((step, i) => (
                            <div key={i} className="relative p-10 rounded-[2.5rem] bg-bg-base border border-border-subtle transition-all overflow-hidden shadow-sm hover:shadow-xl">
                                <div className="absolute -top-6 -right-6 text-8xl font-display font-bold text-brand-500/5 transition-colors pointer-events-none">
                                    {step.num}
                                </div>
                                <div className="relative z-10">
                                    <div className="text-brand-500 font-display font-bold text-xl mb-4 tracking-tighter opacity-50">{step.num}</div>
                                    <h3 className="font-bold text-3xl mb-4 text-text-primary">{step.title}</h3>
                                    <p className="text-text-secondary leading-relaxed text-lg">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI Callout */}
            <section className="py-32 px-4">
                <div className="max-w-6xl mx-auto bg-bg-surface rounded-[3.5rem] p-8 md:p-20 overflow-hidden relative border border-border-subtle shadow-2xl">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-brand-500 via-transparent to-transparent"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 relative z-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-bold text-xs mb-10 uppercase tracking-widest">
                                <Sparkles className="w-4 h-4" /> {t('home.ai.badge')}
                            </div>
                            <h2 className="text-5xl sm:text-6xl font-display font-bold text-text-primary mb-8 leading-[0.9]">{t('home.ai.title')}</h2>
                            <p className="text-xl text-text-secondary mb-12 leading-relaxed">
                                {t('home.ai.subtitle')}
                            </p>
                            <ul className="space-y-6">
                                {[
                                    'Smart pricing recommendations',
                                    'Low-stock predictions before you run out',
                                    'WhatsApp-ready customer win-back messages'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 text-text-primary text-lg font-medium">
                                        <div className="w-6 h-6 rounded-full bg-accent-green/20 flex items-center justify-center shrink-0 border border-accent-green/30">
                                            <Check className="w-4 h-4 text-accent-green" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-bg-base border border-border-subtle rounded-[2.5rem] p-8 shadow-2xl">
                            <div className="flex items-center gap-3 border-b border-border-subtle pb-6 mb-8">
                                <div className="w-10 h-10 rounded-full bg-accent-teal/10 flex items-center justify-center border border-accent-teal/20">
                                    <Bot className="w-6 h-6 text-accent-teal" />
                                </div>
                                <span className="font-bold text-text-primary tracking-widest text-xs uppercase">ASK STREETVEND AI</span>
                            </div>
                            <div className="space-y-8">
                                <div className="flex justify-end">
                                    <div className="bg-brand-500 text-white px-6 py-4 rounded-3xl rounded-tr-sm max-w-[85%] text-base font-bold shadow-lg shadow-brand-500/20">
                                        How can I increase profit this week?
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="bg-bg-surface text-text-secondary px-6 py-5 rounded-3xl rounded-tl-sm max-w-[90%] text-base leading-relaxed shadow-xl border border-border-subtle">
                                        Bundle <span className="font-bold text-brand-500 uppercase">Pani Puri + Sev Puri</span> as a combo, raise <span className="font-bold text-brand-500 uppercase">Aloo Tikki</span> by ₹5, and restock before Friday peak.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-40 bg-gradient-to-b from-[#FFFBF0] to-[#F5F5F5] border-t border-border-subtle text-center relative overflow-hidden">
                <div className="absolute bottom-0 inset-x-0 flex items-end justify-center pointer-events-none select-none overflow-hidden">
                    <span 
                        className="text-[clamp(4rem,15vw,16rem)] font-display font-bold whitespace-nowrap uppercase tracking-tighter text-brand-500/[0.02] translate-y-[20%]"
                    >
                        STREETVEND
                    </span>
                </div>
                <div className="max-w-4xl mx-auto px-4 relative z-10">
                    <h2 className="text-6xl sm:text-7xl font-display font-bold text-[#111111] mb-10">{t('home.final.title')}</h2>
                    <p className="text-2xl text-[#555555] mb-16 max-w-3xl mx-auto leading-relaxed">
                        {t('home.final.subtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link to="/register" className="w-full sm:w-auto px-12 py-6 rounded-full primary-button-gradient text-white font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-500/25">
                            Register Free
                        </Link>
                        <Link to="/plans" className="w-full sm:w-auto px-12 py-6 rounded-full bg-white border border-border-subtle text-[#111111] font-bold text-xl transition-all hover:scale-105 hover:border-brand-500 shadow-sm">
                            View Pricing
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatPill({ text }: { text: string }) {
    return (
        <div className="px-6 py-3 rounded-full bg-bg-surface border border-border-subtle text-sm font-semibold text-text-secondary shadow-xl tracking-wide">
            {text}
        </div>
    );
}

function BillItem({ name, price, qty, setQty }: { name: string, price: string, qty: number, setQty?: (q: number) => void }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <span className="font-semibold text-text-primary">{name}</span>
                <span className="text-sm font-sans font-bold text-brand-500 not-italic">₹{price}</span>
            </div>
            {setQty ? (
                <div className="flex items-center gap-4 bg-bg-base rounded-full px-3 py-1.5 border border-border-subtle">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-full bg-bg-surface hover:bg-white/5 flex items-center justify-center text-xl font-bold text-text-primary transition-colors">-</button>
                    <span className="font-bold text-lg w-6 text-center text-text-primary">{qty}</span>
                    <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xl font-bold transition-transform active:scale-90">+</button>
                </div>
            ) : (
                <span className="font-bold bg-brand-500 text-white px-4 py-1.5 rounded-full text-xs shadow-lg shadow-brand-500/20">+{qty}</span>
            )}
        </div>
    );
}
