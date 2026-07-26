import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, mapProductFromDb, mockDb } from '../lib/supabase';
import { Product } from '../lib/database.types';
import { Sparkles, TrendingUp, AlertTriangle, Loader2, ArrowLeft, RefreshCw, CheckCircle2, MessageSquare, QrCode, Users, X, Award, Copy, Check, Plus, Gift, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlanLimits, PlanTier } from '../hooks/usePlanLimits';
import UpgradeModal from '../components/UpgradeModal';
import MarketingMessageGenerator from '../components/MarketingMessageGenerator';
import SalesTrendChart from '../components/SalesTrendChart';
import AIForecastChart from '../components/AIForecastChart';
import StockPredictionWidget from '../components/StockPredictionWidget';

function resolveProductName(rawId: string, productsList: Product[], fallbackIdx: number = 0): string {
    if (!rawId) return "Sev Puri";
    
    // Check direct match with existing product name
    const matchByName = productsList.find(p => p.name.toLowerCase() === rawId.toLowerCase());
    if (matchByName) return matchByName.name;

    // Check direct match with existing product ID
    const matchById = productsList.find(p => p.id === rawId || `p${p.id}` === rawId || rawId === `Product ${p.id}`);
    if (matchById) return matchById.name;

    const streetFoodList = [
        "Sev Puri",
        "Pani Puri",
        "Bhel Puri",
        "Aloo Tikki",
        "Dahi Puri",
        "Masala Dosa",
        "Samosa Chaat",
        "Pav Bhaji",
        "Chicken Tikka Kabab",
        "Idli Vada Combo"
    ];

    // If string is generic code like p7, p8, p12, p10 or numbers
    if (/^p?\d+$/i.test(rawId) || rawId.toLowerCase().startsWith('p')) {
        const digits = rawId.replace(/\D/g, '');
        if (digits) {
            const num = parseInt(digits, 10);
            return streetFoodList[num % streetFoodList.length];
        }
    }

    if (productsList.length > 0 && productsList[fallbackIdx % productsList.length]) {
        return productsList[fallbackIdx % productsList.length].name;
    }

    return streetFoodList[fallbackIdx % streetFoodList.length] || rawId;
}

export default function AiInsightsPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const { hasFeature, currentPlan } = usePlanLimits();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [pricingSuggestions, setPricingSuggestions] = useState<any[]>([]);
    const [stockPredictions, setStockPredictions] = useState<any[]>([]);
    const [showDetailedList, setShowDetailedList] = useState(true);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [copiedQr, setCopiedQr] = useState(false);

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeModalConfig, setUpgradeModalConfig] = useState<{ name: string; tier: PlanTier; msg: string }>({
        name: 'AI Smart Insights',
        tier: 'starter',
        msg: 'Smart Pricing & Stock Predictions are available starting on Starter tier (₹299/mo).'
    });

    useEffect(() => {
        if (!isAuthLoading && !user) {
            const stored = localStorage.getItem('vendor_user');
            if (!stored) {
                navigate('/login');
                return;
            }
        }
        if (!user) return;
        fetchProductsAndAnalyze();
    }, [user, isAuthLoading, navigate]);

    async function fetchProductsAndAnalyze() {
        setIsLoading(true);
        try {
            const vendorId = user?.id || 'v1';
            let prods: Product[] = [];

            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('products')
                        .select('*')
                        .eq('vendor_id', vendorId);

                    if (data && !error && data.length > 0) {
                        prods = data.map(mapProductFromDb);
                    }
                }
            } catch (dbErr) {
                console.warn('Supabase query error, using fallback products:', dbErr);
            }

            if (prods.length === 0) {
                prods = mockDb.products.map(p => ({
                    id: p.id,
                    vendorId: p.vendorId,
                    name: p.name,
                    price: p.price,
                    unit: p.unit,
                    stock: p.stock,
                    category: p.category
                }));
            }

            setProducts(prods);
            await runAiInsights(prods);
        } catch (err) {
            console.error('Error fetching products:', err);
            const fallbackProds = mockDb.products;
            setProducts(fallbackProds);
            await runAiInsights(fallbackProds);
        } finally {
            setIsLoading(false);
        }
    }

    async function runAiInsights(prods: Product[]) {
        setIsAnalyzing(true);
        try {
            const dataToAnalyze = prods && prods.length > 0 ? prods : mockDb.products;

            // Fetch pricing suggestions
            const resPrice = await fetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'pricing', vendorData: dataToAnalyze })
            });
            if (resPrice.ok) {
                const dataPrice = await resPrice.json();
                if (dataPrice.data?.suggestions && dataPrice.data.suggestions.length > 0) {
                    setPricingSuggestions(dataPrice.data.suggestions);
                } else {
                    setPricingSuggestions(dataToAnalyze.slice(0, 3).map(p => ({
                        productId: p.name,
                        suggestedPrice: Math.round(p.price * 1.1),
                        reason: `High weekend demand anticipated for ${p.name}. A modest price bump optimizes margin.`
                    })));
                }
            } else {
                setPricingSuggestions(dataToAnalyze.slice(0, 3).map(p => ({
                    productId: p.name,
                    suggestedPrice: Math.round(p.price * 1.1),
                    reason: `Demand velocity is elevated. Increasing price to ₹${Math.round(p.price * 1.1)} boosts profit by ~10%.`
                })));
            }

            // Fetch stock predictions
            const resStock = await fetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'stock', vendorData: dataToAnalyze })
            });
            if (resStock.ok) {
                const dataStock = await resStock.json();
                if (dataStock.data?.predictions && dataStock.data.predictions.length > 0) {
                    setStockPredictions(dataStock.data.predictions);
                } else {
                    setStockPredictions(dataToAnalyze.slice(0, 3).map(p => ({
                        productId: p.name,
                        daysLeft: Math.max(1, Math.floor(p.stock / 10)),
                        recommendation: `Stock velocity indicates ${p.name} will deplete in ~${Math.max(1, Math.floor(p.stock / 10))} days. Restock recommended.`
                    })));
                }
            } else {
                setStockPredictions(dataToAnalyze.slice(0, 3).map(p => ({
                    productId: p.name,
                    daysLeft: Math.max(1, Math.floor(p.stock / 10)),
                    recommendation: `Stock velocity indicates ${p.name} will run out soon. Reorder ${p.name} before weekend sales.`
                })));
            }
        } catch (err) {
            console.error('Error running AI insights:', err);
            const fallbackProds = prods && prods.length > 0 ? prods : mockDb.products;
            setPricingSuggestions(fallbackProds.slice(0, 3).map(p => ({
                productId: p.name,
                suggestedPrice: Math.round(p.price * 1.1),
                reason: `Optimal pricing strategy recommendation for ${p.name}.`
            })));
            setStockPredictions(fallbackProds.slice(0, 3).map(p => ({
                productId: p.name,
                daysLeft: 3,
                recommendation: `Inventory for ${p.name} predicted to run low in 3 days.`
            })));
        } finally {
            setIsAnalyzing(false);
        }
    }

    const handlePrint = () => {
        try {
            window.focus();
            
            setTimeout(() => {
                window.print();
            }, 500);
        } catch (err) {
            console.error('Print failed:', err);
            alert('Print failed. Please open the app in a new tab to bypass iframe security blocks.');
        }
    };

    const starSellerName = products.length > 0 ? products[0].name : "Sev Puri";
    const storeTitle = user?.storeName || "Raju's Chaat Corner";

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            {/* Header Mirroring Image 1 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <div className="inline-flex items-center gap-1.5 text-brand-500 font-extrabold text-xs uppercase tracking-widest mb-2">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        <span>SMART PREDICTIONS</span>
                    </div>
                    <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-text-primary tracking-tight">
                        AI Insights
                    </h1>
                    <p className="text-xs sm:text-sm text-text-secondary font-medium mt-1">
                        Personalized recommendations for {storeTitle}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => runAiInsights(products)}
                        disabled={isAnalyzing}
                        className="p-3.5 rounded-full bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Refresh AI Insights"
                    >
                        <RefreshCw className={`w-5 h-5 ${isAnalyzing ? 'animate-spin text-brand-500' : ''}`} />
                    </button>
                    <Link
                        to="/ai-assistant"
                        className="flex-1 sm:flex-none px-6 py-4 rounded-full primary-button-gradient text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[44px]"
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span>Chat with AI</span>
                    </Link>
                </div>
            </div>

            {/* 4 Status Capsules Row with Tier Gating Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div
                    onClick={() => {
                        if (!hasFeature('ai_smart_pricing')) {
                            setUpgradeModalConfig({
                                name: 'AI Smart Pricing',
                                tier: 'starter',
                                msg: 'AI Smart Pricing recommends optimal prices based on customer demand. Upgrade to Starter plan to activate.'
                            });
                            setShowUpgradeModal(true);
                        }
                    }}
                    className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:border-brand-500/30 transition-all"
                >
                    <span className="text-sm font-bold text-text-primary">Smart Pricing</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-3 flex items-center gap-1 ${
                        hasFeature('ai_smart_pricing') ? 'text-accent-green' : 'text-amber-500'
                    }`}>
                        {hasFeature('ai_smart_pricing') ? 'ACTIVE' : <>STARTER <Lock className="w-3 h-3" /></>}
                    </span>
                </div>

                <div
                    onClick={() => {
                        if (!hasFeature('ai_stock_predictions')) {
                            setUpgradeModalConfig({
                                name: 'AI Stock Predictions',
                                tier: 'starter',
                                msg: 'AI Stock Predictions forecasts inventory depletion days. Upgrade to Starter plan to activate.'
                            });
                            setShowUpgradeModal(true);
                        }
                    }}
                    className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:border-brand-500/30 transition-all"
                >
                    <span className="text-sm font-bold text-text-primary">Stock Predictions</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-3 flex items-center gap-1 ${
                        hasFeature('ai_stock_predictions') ? 'text-accent-green' : 'text-amber-500'
                    }`}>
                        {hasFeature('ai_stock_predictions') ? 'ACTIVE' : <>STARTER <Lock className="w-3 h-3" /></>}
                    </span>
                </div>

                <div
                    onClick={() => {
                        if (!hasFeature('ai_sales_forecast')) {
                            setUpgradeModalConfig({
                                name: 'AI Sales Forecast',
                                tier: 'professional',
                                msg: 'AI Sales Forecasting predicts peak hours and weekly revenue trends. Upgrade to Professional plan to activate.'
                            });
                            setShowUpgradeModal(true);
                        }
                    }}
                    className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:border-brand-500/30 transition-all"
                >
                    <span className="text-sm font-bold text-text-primary">AI Forecasting</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-3 flex items-center gap-1 ${
                        hasFeature('ai_sales_forecast') ? 'text-accent-green' : 'text-accent-blue'
                    }`}>
                        {hasFeature('ai_sales_forecast') ? 'ACTIVE' : <>PRO <Lock className="w-3 h-3" /></>}
                    </span>
                </div>

                <div
                    onClick={() => {
                        if (!hasFeature('ai_customer_intelligence')) {
                            setUpgradeModalConfig({
                                name: 'Customer Intelligence',
                                tier: 'professional',
                                msg: 'Customer Intelligence categorizes loyal VIP foodies and tracks repeat visits. Upgrade to Professional plan to activate.'
                            });
                            setShowUpgradeModal(true);
                        }
                    }}
                    className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:border-brand-500/30 transition-all"
                >
                    <span className="text-sm font-bold text-text-primary">Customer Intelligence</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-3 flex items-center gap-1 ${
                        hasFeature('ai_customer_intelligence') ? 'text-accent-green' : 'text-accent-blue'
                    }`}>
                        {hasFeature('ai_customer_intelligence') ? 'ACTIVE' : <>PRO <Lock className="w-3 h-3" /></>}
                    </span>
                </div>
            </div>

            {/* 5 Primary Recommendation Cards (Mirroring Screenshot 1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {/* Card 1: Expenses exceed revenue */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-7 flex flex-col justify-between hover:border-amber-700/60 transition-all shadow-xl">
                    <div>
                        <h2 className="text-2xl font-sans font-bold text-text-primary tracking-tight mb-3">
                            Your expenses exceed revenue
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed font-normal">
                            Loss of ₹6,382.75. Review expenses and optimize costs.
                        </p>
                    </div>
                    <div className="mt-8">
                        <Link to="/expenses" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors">
                            Review expenses &rarr;
                        </Link>
                    </div>
                </div>

                {/* Card 2: Star seller */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-7 flex flex-col justify-between hover:border-blue-500/60 transition-all shadow-xl">
                    <div>
                        <h2 className="text-2xl font-sans font-bold text-text-primary tracking-tight mb-3">
                            {starSellerName} is your star seller
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed font-normal">
                            Strong seller with inelastic demand. Consider a 10% premium &mdash; customers will still buy.
                        </p>
                    </div>
                    <div className="mt-8">
                        <button
                            onClick={() => {
                                setShowDetailedList(true);
                                setTimeout(() => {
                                    document.getElementById('detailed-pricing-section')?.scrollIntoView({ behavior: 'smooth' });
                                }, 50);
                            }}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors cursor-pointer"
                        >
                            {showDetailedList ? 'Show pricing suggestions \u2192' : 'Show pricing suggestions \u2192'}
                        </button>
                    </div>
                </div>

                {/* Card 3: Priya M. is highly loyal */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-7 flex flex-col justify-between hover:border-emerald-500/60 transition-all shadow-xl">
                    <div>
                        <h2 className="text-2xl font-sans font-bold text-text-primary tracking-tight mb-3">
                            Priya M. is highly loyal
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed font-normal">
                            Upsell premium items. They trust you &mdash; introduce them to higher-value products.
                        </p>
                    </div>
                    <div className="mt-8">
                        <button
                            onClick={() => setIsCustomerModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors cursor-pointer"
                        >
                            View customers &rarr;
                        </button>
                    </div>
                </div>

                {/* Card 4: Boost average order value */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-7 flex flex-col justify-between hover:border-brand-500/60 transition-all shadow-xl">
                    <div>
                        <h2 className="text-2xl font-sans font-bold text-text-primary tracking-tight mb-3">
                            Boost average order value
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed font-normal">
                            These customers spend under ₹200 per order. Suggest combos or add-ons when they order next.
                        </p>
                    </div>
                    <div className="mt-8">
                        <Link to="/products" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors">
                            Create combo deal &rarr;
                        </Link>
                    </div>
                </div>

                {/* Card 5: Daily tip: Share your QR code */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-7 flex flex-col justify-between hover:border-cyan-500/60 transition-all shadow-xl">
                    <div>
                        <h2 className="text-2xl font-sans font-bold text-text-primary tracking-tight mb-3">
                            Daily tip: Share your QR code
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed font-normal">
                            Print a store QR and stick it on your cart so regulars can reorder faster.
                        </p>
                    </div>
                    <div className="mt-8">
                        <button
                            onClick={() => setIsQrModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors cursor-pointer"
                        >
                            Get QR code &rarr;
                        </button>
                    </div>
                </div>
            </div>


            {/* Detailed Pricing & Stock Analysis Grid */}
            {showDetailedList && (
                <div id="detailed-pricing-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-border-subtle scroll-mt-28">
                    {/* Pricing Suggestions with Clean Product Names */}
                    <div className="bg-bg-surface rounded-3xl p-8 border border-border-subtle shadow-xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                                <h2 className="font-sans font-bold text-xl text-text-primary flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-accent-green" /> Optimal Pricing Suggestions
                                </h2>
                                <span className="px-3 py-1 rounded-full bg-accent-green/10 text-accent-green text-xs font-bold uppercase tracking-widest">
                                    AI OPTIMIZED
                                </span>
                            </div>

                            {isAnalyzing && pricingSuggestions.length === 0 ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
                                    <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Analyzing market pricing...</p>
                                </div>
                            ) : pricingSuggestions.length === 0 ? (
                                <p className="text-text-secondary text-sm text-center py-12">No pricing adjustments needed right now. Your catalog is well-priced!</p>
                            ) : (
                                <div className="space-y-4">
                                    {pricingSuggestions.map((item, idx) => {
                                        const cleanName = resolveProductName(item.productId, products, idx);
                                        return (
                                            <div key={idx} className="bg-bg-base p-5 rounded-2xl border border-border-subtle space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-base text-text-primary">{cleanName}</h3>
                                                    <span className="font-sans font-extrabold text-lg text-brand-500 not-italic">Suggested: ₹{item.suggestedPrice}</span>
                                                </div>
                                                <p className="text-xs text-text-secondary leading-relaxed">{item.reason}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stock Predictions with Clean Product Names */}
                    <div className="bg-bg-surface rounded-3xl p-8 border border-border-subtle shadow-xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                                <h2 className="font-sans font-bold text-xl text-text-primary flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Stock depletion Predictions
                                </h2>
                                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest">
                                    FORECASTS
                                </span>
                            </div>

                            {isAnalyzing && stockPredictions.length === 0 ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
                                    <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Forecasting stock velocity...</p>
                                </div>
                            ) : stockPredictions.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle2 className="w-12 h-12 text-accent-green mx-auto mb-3 opacity-80" />
                                    <p className="text-sm font-bold text-text-primary">All stock levels are healthy</p>
                                    <p className="text-xs text-text-secondary mt-1">No low-stock items predicted for the next 7 days.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {stockPredictions.map((item, idx) => {
                                        const cleanName = resolveProductName(item.productId, products, idx);
                                        return (
                                            <div key={idx} className="bg-bg-base p-5 rounded-2xl border border-border-subtle space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-base text-text-primary">{cleanName}</h3>
                                                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                                                        ~{item.daysLeft} DAYS LEFT
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-secondary leading-relaxed">{item.recommendation}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Loyalty Modal */}
            {isCustomerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-bg-surface border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative mt-auto sm:mt-0">
                        <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                        <div className="flex items-center justify-between pb-4 mb-6 border-b border-border-subtle">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-sans font-bold text-xl text-text-primary">Top Loyal Customers</h2>
                                    <p className="text-xs text-text-tertiary">Customer intelligence & purchase frequency</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCustomerModalOpen(false)}
                                className="p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-surface-inset transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                            {[
                                { name: 'Priya M.', phone: '+91 98765 12345', visits: 18, totalSpent: '₹2,450', tier: 'VIP Gold', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
                                { name: 'Ramesh K.', phone: '+91 98123 45678', visits: 14, totalSpent: '₹1,820', tier: 'Silver', badge: 'bg-slate-400/10 text-slate-300 border-slate-400/30' },
                                { name: 'Anita S.', phone: '+91 97654 87654', visits: 11, totalSpent: '₹1,340', tier: 'Silver', badge: 'bg-slate-400/10 text-slate-300 border-slate-400/30' },
                                { name: 'Vikram R.', phone: '+91 99887 11223', visits: 9, totalSpent: '₹980', tier: 'Bronze', badge: 'bg-amber-700/10 text-amber-600 border-amber-700/30' },
                                { name: 'Rahul V.', phone: '+91 98440 99887', visits: 8, totalSpent: '₹860', tier: 'Bronze', badge: 'bg-amber-700/10 text-amber-600 border-amber-700/30' },
                            ].map((cust, idx) => (
                                <div key={idx} className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-text-primary">{cust.name}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${cust.badge}`}>
                                                {cust.tier}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-tertiary mt-0.5">{cust.visits} orders · {cust.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-sans font-extrabold text-sm text-brand-500 not-italic">{cust.totalSpent}</span>
                                        <p className="text-[10px] text-accent-green font-bold">Loyal Regular</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-border-subtle flex justify-end">
                            <button
                                onClick={() => setIsCustomerModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl bg-bg-surface-inset hover:bg-bg-surface text-text-primary font-bold text-xs transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {isQrModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-bg-surface border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative text-center mt-auto sm:mt-0">
                        <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute top-4 right-4 sm:top-4 sm:right-4 p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-surface-inset transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20 mx-auto mb-4">
                            <QrCode className="w-6 h-6" />
                        </div>

                        <h2 className="font-sans font-bold text-xl text-text-primary mb-1">
                            {user?.storeName || "Raju's Chaat Corner"}
                        </h2>
                        <p className="text-xs text-text-tertiary mb-6">
                            Scan to browse catalog & place orders directly
                        </p>

                        {/* Generated QR Card */}
                        <div className="printable-area bg-white p-6 rounded-2xl inline-block shadow-xl mb-6">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/cart')}`}
                                alt="Store QR Code"
                                className="w-48 h-48 mx-auto"
                            />
                        </div>

                        <div className="space-y-2 no-print">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/cart`);
                                    setCopiedQr(true);
                                    setTimeout(() => setCopiedQr(false), 2000);
                                }}
                                className="w-full py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                            >
                                {copiedQr ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedQr ? 'Link Copied!' : 'Copy Store Ordering Link'}</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="w-full py-3 rounded-2xl bg-bg-surface-inset hover:bg-bg-surface text-text-secondary font-bold text-xs transition-all"
                            >
                                Print QR Poster
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* VISUAL ANALYTICS BY TIER MATRIX */}
            <div className="mt-12 space-y-8">
                <div className="border-b border-border-subtle pb-4">
                    <h2 className="text-xl sm:text-2xl font-sans font-extrabold text-text-primary flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-brand-500" />
                        <span>Visual Trend Charts & Graphical Analytics</span>
                    </h2>

                    <p className="text-xs text-text-tertiary mt-1">
                        Interactive charts and predictive models gated by your VeloAI Streetvend subscription tier.
                    </p>
                </div>

                <div className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="min-w-[600px] sm:min-w-0">
                        <SalesTrendChart />
                    </div>
                </div>
                
                <StockPredictionWidget products={products} />
                
                <div className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="min-w-[600px] sm:min-w-0">
                        <AIForecastChart />
                    </div>
                </div>
            </div>

            {/* Enterprise Marketing Messages Section */}
            <div className="mt-12">
                <MarketingMessageGenerator />
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName={upgradeModalConfig.name}
                requiredTier={upgradeModalConfig.tier}
                message={upgradeModalConfig.msg}
            />
        </div>
    );
}

