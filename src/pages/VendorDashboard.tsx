import { apiFetch } from '../lib/apiFetch';
import { useState, useEffect, ReactNode, FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { mockDb, supabase, mapProductFromDb, mapOrderFromDb } from '../lib/supabase';
import { getVendorProducts, getVendorOrders, getAiDailyInsight } from '../lib/dataCache';
import { Product, Order } from '../lib/database.types';
import { Plus, Box, QrCode, Bot, CreditCard, Send, Loader2, X, ChevronRight, ShoppingCart, BarChart3, Sparkles, MessageCircle, AlertCircle, Check, Lock, Copy, ExternalLink, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/I18nContext';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from '../components/UpgradeModal';
import SalesTrendChart from '../components/SalesTrendChart';
import AIForecastChart from '../components/AIForecastChart';
import StockPredictionWidget from '../components/StockPredictionWidget';
import GuidedTour, { TourStep, TourTriggerButton } from '../components/GuidedTour';
import VendorTrustScoreCard from '../components/VendorTrustScoreCard';
import CustomerTaxBillsModal from '../components/CustomerTaxBillsModal';
import TimberInvoiceReplicaModal from '../components/TimberInvoiceReplicaModal';

const TOUR_STEPS: TourStep[] = [
    {
        target: '[data-tour="store-header"]',
        title: 'Store Performance Overview',
        description: 'View your real-time daily sales and current subscription tier at a glance.',
        position: 'bottom'
    },
    {
        target: '[data-tour="quick-tools"]',
        title: 'Quick Tools',
        description: 'Manage products, generate store QR codes, and access your personal AI business assistant.',
        position: 'right'
    },
    {
        target: '[data-tour="stats-row"]',
        title: 'Live Key Metrics',
        description: 'Track real-time order volume, average ticket values, and customer growth benchmarks.',
        position: 'bottom'
    },
    {
        target: '[data-tour="ai-insight"]',
        title: 'Smart AI Daily Insights',
        description: 'Receive personalized Gemini AI recommendations for peak sales hours, prep inventory, and pricing strategy.',
        position: 'left'
    },
    {
        target: '[data-tour="analytics-section"]',
        title: 'Visual Analytics Matrix',
        description: 'Explore interactive revenue trends, real-time stock depletion meters, and AI demand predictions.',
        position: 'top'
    }
];

export default function VendorDashboard() {
    const { t } = useI18n();
    const { user, isLoading, updatePlan, updateUser, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    
    // UI states for modals
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [showTaxBillsModal, setShowTaxBillsModal] = useState(false);
    const [selectedReplicaOrder, setSelectedReplicaOrder] = useState<any>(null);
    const [copiedQr, setCopiedQr] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
    const [notes, setNotes] = useState<{text: string, date: string}[]>([]);

    const [isAnalyzingNotes, setIsAnalyzingNotes] = useState(false);
    const [noteSummary, setNoteSummary] = useState<{restock?: string[], prep?: string[], insights?: string[]} | null>(null);

    const { hasFeature, currentPlan } = usePlanLimits();
    const isAiInsightUnlocked = hasFeature('ai_daily_insights');
    const [showInsightUpgradeModal, setShowInsightUpgradeModal] = useState(false);

    // New AI Insight state
    const [aiInsight, setAiInsight] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [upiInput, setUpiInput] = useState(user?.upiId || '');
    const [upiError, setUpiError] = useState<string | null>(null);
    const [upiSuccess, setUpiSuccess] = useState(false);
    const [isSavingUpi, setIsSavingUpi] = useState(false);

    useEffect(() => {
        if (user?.upiId) {
            setUpiInput(user.upiId);
        }
    }, [user?.upiId]);

    const handleSaveUpi = async (e: FormEvent) => {
        e.preventDefault();
        const upiRegex = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
        if (upiInput.trim() && !upiRegex.test(upiInput.trim())) {
            setUpiError("Invalid UPI ID format (e.g. dosapoint@okaxis)");
            return;
        }
        setUpiError(null);
        setIsSavingUpi(true);
        try {
            const val = upiInput.trim() || null;
            if (supabase && user?.id) {
                const { error } = await (supabase
                    .from('vendors') as any)
                    .update({ upi_id: val })
                    .eq('id', user.id);
                if (error) {
                    console.error("Supabase UPI ID update error:", error.message || error);
                    throw new Error("Failed to save UPI ID, please try again");
                }
            }
            updateUser({ upiId: val });
            setUpiSuccess(true);
            setTimeout(() => setUpiSuccess(false), 4000);
        } catch (err: any) {
            setUpiError(err.message || "Failed to save UPI ID, please try again");
        } finally {
            setIsSavingUpi(false);
        }
    };

    // Computed Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todaysOrders = orders.filter(o => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        return d && !isNaN(d.getTime()) && d >= today;
    });
    const yesterdaysOrders = orders.filter(o => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        return d && !isNaN(d.getTime()) && d >= yesterday && d < today;
    });

    const todaySales = todaysOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const yesterdaySales = yesterdaysOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const ordersCount = orders.length;
    const avgTicket = ordersCount > 0 ? Math.round(orders.reduce((sum, order) => sum + (order.total || 0), 0) / ordersCount) : 0;
    
    const uniqueCustomers = new Set(orders.map(o => o.customerPhone).filter(Boolean));
    const newCustomersCount = uniqueCustomers.size;

    let salesChange = '';
    let ordersChange = '';
    
    if (ordersCount > 0) {
        if (yesterdaySales > 0) {
            const pct = Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100);
            salesChange = `${pct >= 0 ? '+' : ''}${pct}% vs yesterday`;
        } else if (todaySales > 0) {
            salesChange = '+100% vs yesterday';
        }
        
        if (yesterdaysOrders.length > 0) {
            const diff = todaysOrders.length - yesterdaysOrders.length;
            ordersChange = `${diff >= 0 ? '+' : ''}${diff} vs yesterday`;
        } else if (todaysOrders.length > 0) {
            ordersChange = `+${todaysOrders.length} today`;
        }
    }

    const recentOrdersMapped = [...orders]
        .sort((a, b) => {
            const timeA = a.createdAt && !isNaN(new Date(a.createdAt).getTime()) ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt && !isNaN(new Date(b.createdAt).getTime()) ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        })
        .slice(0, 3)
        .map(o => ({
            id: `#${o.id ? (o.id.length > 8 ? o.id.slice(-8) : o.id).toUpperCase() : ''}`,
            items: o.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', '),
            total: `₹${o.total}`,
            method: (o.paymentMethod || '').toUpperCase()
        }));

    useEffect(() => {
        let isMounted = true;
        async function fetchInsight() {
            if (!user?.id || !isAiInsightUnlocked) return;
            setIsAiLoading(true);
            try {
                const insight = await getAiDailyInsight(user.id, products, orders, currentPlan);
                if (isMounted) setAiInsight(insight);
            } catch (err: any) {
                console.error("Failed to fetch AI insight:", err);
                if (isMounted && !err?.message?.includes('GatedFeature')) {
                    setAiInsight("AI Insights will appear here as your store generates more sales data.");
                }
            } finally {
                if (isMounted) setIsAiLoading(false);
            }
        }
        
        if (!isLoading && user?.id && isAiInsightUnlocked) {
            fetchInsight();
        }
        return () => { isMounted = false; };
    }, [user?.id, products.length, orders.length, isLoading, isAiInsightUnlocked, currentPlan]);

    // Handle PayU Payment Redirection
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        const planId = params.get('planId') as any;
        const txnid = params.get('txnid');

        if (paymentStatus === 'success' && user && txnid) {
            const amount = params.get('amount');
            
            // Secure fulfillment flow: Verify with server which verifies with PayU
            const fulfillPayment = async () => {
                try {
                    const response = await apiFetch('/api/payu/verify-and-fulfill', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ txnid, planId, amount, vendorId: user.id })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Fulfillment failed');
                    }
                    
                    // After server confirms fulfillment, refresh local state
                    await refreshProfile();
                    alert(`Success! Your account has been upgraded to ${planId === 'professional' ? 'Professional' : planId}. Transaction ID: ${txnid}`);
                } catch (err: any) {
                    console.error("Fulfillment error:", err);
                    alert(`Payment was successful, but we encountered an error updating your account: ${err.message}. Please contact support with Transaction ID: ${txnid}`);
                } finally {
                    navigate('/dashboard', { replace: true });
                }
            };
            
            fulfillPayment();
        } else if (paymentStatus === 'failed') {
            alert(`Payment Failed. Please try again or contact support if amount was deducted. Transaction ID: ${txnid}`);
            navigate('/dashboard', { replace: true });
        }
    }, [user?.id, refreshProfile, navigate, updatePlan]);

    const handleAnalyzeNotes = async () => {
        if (notes.length === 0) return;
        setIsAnalyzingNotes(true);
        try {
            const res = await apiFetch('/api/analyze-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: notes.map(n => n.text), language: user?.language || 'en' })
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            if (data.summary) {
                setNoteSummary(data.summary);
            }
        } catch (error: any) {
            console.error('Failed to analyze notes', error);
            alert(`Error analyzing notes: ${error.message}`);
        } finally {
            setIsAnalyzingNotes(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!isLoading && !user) {
            const stored = localStorage.getItem('vendor_user');
            if (!stored) {
                navigate('/login');
                return;
            }
        }
        if (!user?.id) return;

        let isMounted = true;
        async function fetchVendorData() {
            try {
                const [prods, ords] = await Promise.all([
                    getVendorProducts(user.id),
                    getVendorOrders(user.id)
                ]);
                if (isMounted) {
                    setProducts(prods);
                    setOrders(ords);
                }
            } catch (e) {
                console.error("Error fetching vendor data:", e);
            }
        }
        fetchVendorData();
        return () => { isMounted = false; };
    }, [user?.id, isLoading, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const quickActions = [
        { name: 'New Bill', icon: Plus, color: 'text-brand-500', bg: 'bg-brand-500/10', action: () => navigate('/cart') },
        { name: 'Products', icon: Box, color: 'text-green-500', bg: 'bg-green-500/10', action: () => navigate('/products') },
        { name: 'QR Code', icon: QrCode, color: 'text-purple-500', bg: 'bg-purple-500/10', action: () => setShowQrModal(true) },
        { name: 'AI Assistant', icon: Bot, color: 'text-teal-500', bg: 'bg-teal-500/10', action: () => navigate('/ai-assistant') },
        { name: 'Tax Bills', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', action: () => setShowTaxBillsModal(true) },
    ];

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        setChatHistory([...chatHistory, { role: 'user', text: chatInput }]);
        const input = chatInput;
        setChatInput('');
        
        try {
            const res = await apiFetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: input, language: user.language })
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setChatHistory(prev => [...prev, { role: 'ai', text: data.text }]);
        } catch (error: any) {
            console.error('Failed to send chat', error);
            alert(`Error sending chat: ${error.message}`);
            setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that right now." }]);
        }
    };

    const handleTourComplete = () => {
        localStorage.setItem('has_seen_dashboard_tour', 'true');
    };

    return (
        <div className="min-h-screen pt-28 bg-bg-base" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Downgrade Banner */}
                {user.scheduledDowngrade && user.downgradeEffectiveDate && (
                    <div className="mb-6 p-4 rounded-[1.5rem] bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
                            <div className="text-sm font-medium">
                                ⚠️ Your plan changes to <span className="font-bold uppercase tracking-widest">{user.scheduledDowngrade}</span> on <span className="font-bold">{new Date(user.downgradeEffectiveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>. You keep all current features until then.
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={async () => {
                                    try {
                                        if (supabase) {
                                            const res = await apiFetch('/api/vendor/cancel-downgrade', {
                                                method: 'DELETE',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ vendorId: user.id })
                                            });
                                            if (res.ok) {
                                                await refreshProfile();
                                            }
                                        } else {
                                            updateUser({
                                                scheduledDowngrade: null,
                                                downgradeEffectiveDate: null
                                            });
                                        }
                                    } catch (err) {
                                        console.error("Cancel downgrade error", err);
                                    }
                                }}
                                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider transition-colors"
                            >
                                Cancel Downgrade
                            </button>
                        </div>
                    </div>
                )}

                {/* Header Card */}
                <div data-tour="store-header" className="bg-bg-surface rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border border-border-subtle shadow-2xl mb-6 sm:mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8 overflow-hidden relative">
                    <div className="absolute inset-0 hero-glow opacity-30 pointer-events-none"></div>
                    <div className="relative z-10 w-full lg:w-auto">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <h1 className="text-xl sm:text-3xl md:text-4xl font-display font-extrabold text-text-primary leading-tight truncate max-w-full">{user.storeName}</h1>
                            <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-bold uppercase tracking-widest border border-brand-500/20">{user.subscription}</span>
                            <TourTriggerButton onClick={() => setIsTourOpen(true)} />
                        </div>
                        <p className="text-text-tertiary font-bold uppercase tracking-widest text-[11px] sm:text-xs">{user.ownerName} · {user.category}</p>
                    </div>
                    <div className="bg-bg-base/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border-subtle w-full lg:min-w-[320px] lg:w-auto relative z-10">
                        <div className="flex justify-between items-end mb-3 sm:mb-4">
                            <div>
                                <span className="text-text-tertiary text-[10px] font-bold uppercase tracking-widest block mb-1">Today's Sales</span>
                                <div className="text-3xl sm:text-4xl font-sans font-extrabold text-brand-500 not-italic">₹{todaySales.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-accent-green text-xs font-bold">{salesChange}</span>
                            </div>
                        </div>
                        <div className="h-2 bg-border-subtle rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: todaySales > 0 ? '100%' : '0%' }}
                                className="h-full bg-brand-500 rounded-full"
                            ></motion.div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
                    {/* Left Sidebar Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div data-tour="quick-tools" className="bg-bg-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-border-subtle shadow-xl">
                            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4 sm:mb-6">Quick Tools</h2>
                            <div className="grid grid-cols-2 min-[480px]:grid-cols-4 lg:grid-cols-1 gap-2.5 sm:gap-3">
                                {quickActions.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={action.action}
                                        className="w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2.5 lg:gap-4 p-3.5 sm:p-4 rounded-2xl bg-bg-base border border-border-subtle hover:border-brand-500 hover:shadow-lg transition-all group min-h-[52px] text-center lg:text-left active:scale-95 cursor-pointer"
                                    >
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shrink-0", action.bg, action.color)}>
                                            <action.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-xs sm:text-sm text-text-primary uppercase tracking-wider truncate max-w-full">{action.name}</span>
                                        <ChevronRight className="hidden lg:block w-4 h-4 ml-auto text-text-tertiary group-hover:text-brand-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-bg-surface rounded-3xl p-6 border border-border-subtle shadow-xl">
                            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-6">Status</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Digital Shop</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-accent-green uppercase">Live</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent-pink"></div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Inventory</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase">85% full</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-bg-surface rounded-3xl p-6 border border-border-subtle shadow-xl">
                            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-brand-500" />
                                Payment Details (UPI)
                            </h2>
                            <form onSubmit={handleSaveUpi} className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary mb-1">Business UPI ID</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. dosapoint@okaxis"
                                        value={upiInput}
                                        onChange={(e) => setUpiInput(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-bg-base border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                                {upiError && <p className="text-[11px] text-red-500 font-bold">{upiError}</p>}
                                {upiSuccess && <p className="text-[11px] text-emerald-500 font-bold">✓ UPI ID saved successfully!</p>}
                                <button
                                    type="submit"
                                    disabled={isSavingUpi}
                                    className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSavingUpi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save UPI ID
                                </button>
                            </form>
                            {user?.upiId && (
                                <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-text-secondary flex justify-between items-center">
                                    <span className="text-text-tertiary">Active UPI:</span>
                                    <span className="font-mono font-bold text-text-primary truncate max-w-[160px]">{user.upiId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* New Vendor Welcome Banner */}
                        {products.length === 0 && (
                            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-500/15 via-bg-surface to-bg-surface border border-brand-500/30 shadow-2xl relative overflow-hidden">
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-2 max-w-xl">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold uppercase tracking-wider">
                                            🎉 Welcome to Streetvend, {user.storeName || 'Partner'}!
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
                                            Start by adding your first product
                                        </h2>
                                        <p className="text-text-secondary text-sm font-medium leading-relaxed">
                                            Your digital store is live! Add items or services to your store catalog to enable quick billing and WhatsApp invoice sharing.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/products')}
                                        className="shrink-0 px-6 py-4 rounded-xl primary-button-gradient text-white font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Add Your First Product
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Stats Row */}
                        <div data-tour="stats-row" className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 gap-6">
                            <StatCard title="Orders" value={String(ordersCount)} change={ordersChange} icon={<ShoppingCart className="w-5 h-5" />} />
                            <StatCard title="Avg. Ticket" value={`₹${avgTicket}`} change="" icon={<CreditCard className="w-5 h-5" />} />
                            <StatCard title="New Customers" value={String(newCustomersCount)} change="" icon={<BarChart3 className="w-5 h-5" />} />
                        </div>

                        {/* Business Health & AI Insights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <VendorTrustScoreCard />

                            <div data-tour="ai-insight" className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-brand-500/5 pointer-events-none"></div>
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                                            <Sparkles className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <h3 className="font-bold uppercase tracking-widest text-text-primary">AI Daily Insight</h3>
                                    </div>
                                    {!isAiInsightUnlocked && (
                                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                                            <Lock className="w-3 h-3 text-amber-400" /> Starter Feature
                                        </span>
                                    )}
                                </div>

                                <div className="relative min-h-[140px] flex flex-col justify-between">
                                    <p className={`text-text-secondary leading-relaxed mb-6 text-base font-medium relative z-10 ${
                                        !isAiInsightUnlocked ? 'filter blur-md select-none pointer-events-none opacity-20' : ''
                                    }`}>
                                        {isAiLoading ? "Analyzing store data..." : (aiInsight || "Analyzing daily sales velocity, inventory depletion, and peak customer traffic...")}
                                    </p>

                                    {!isAiInsightUnlocked ? (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-5 bg-black/65 backdrop-blur-md rounded-2xl border border-brand-500/20 text-center animate-fade-in">
                                            <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 flex items-center justify-center mb-2 shadow-lg">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <h4 className="font-sans font-extrabold text-base text-white mb-1">
                                                Unlock AI Daily Insights
                                            </h4>
                                            <p className="text-[11px] text-text-tertiary max-w-xs mb-4 leading-relaxed">
                                                Daily operational AI insights, sales recommendations, and trend predictions require a <strong className="text-brand-500">Starter</strong> tier subscription.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setShowInsightUpgradeModal(true)}
                                                className="px-4 py-2 rounded-xl primary-button-gradient text-white text-[11px] font-extrabold uppercase tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Upgrade to Starter (₹79/mo)</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => navigate('/ai-insights')}
                                            className="w-full py-4 primary-button-gradient text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform active:scale-95 relative z-10"
                                        >
                                            Full Market Report
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-lg font-sans font-bold text-text-primary uppercase tracking-widest">Recent Orders</h2>
                                <button className="text-[10px] text-brand-500 font-bold uppercase tracking-widest hover:underline">View History</button>
                            </div>
                            <div className="space-y-4">
                                {recentOrdersMapped.length > 0 ? recentOrdersMapped.map((ord) => (
                                    <OrderRow key={ord.id} id={ord.id} items={ord.items} total={ord.total} method={ord.method} />
                                )) : (
                                    <div className="text-center py-6 text-text-tertiary text-sm font-medium">No orders yet.</div>
                                )}
                            </div>
                        </div>

                        {/* VISUAL ANALYTICS MATRIX BY TIER */}
                        <div data-tour="analytics-section" className="space-y-8 pt-4 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                                <div>
                                    <h2 className="text-xl font-sans font-extrabold text-text-primary flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-brand-500" />
                                        <span>Visual Analytics & Trend Insights</span>
                                    </h2>
                                    <p className="text-xs text-text-tertiary mt-1">Gated analytics engine powered by VeloAI subscription tier</p>
                                </div>
                            </div>

                            {/* Starter Tier Analytics: Daily/Weekly Sales Trend & Product Breakdown */}
                            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                <div className="min-w-[600px] sm:min-w-0">
                                    <SalesTrendChart />
                                </div>
                            </div>

                            {/* Starter Tier Analytics: Inventory Depletion & Stock Predictions */}
                            <StockPredictionWidget products={products} />

                            {/* Professional Tier Analytics: AI Sales Forecast & Peak Hours */}
                            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                <div className="min-w-[600px] sm:min-w-0">
                                    <AIForecastChart />
                                </div>
                            </div>

                        </div>

                        {/* Voice Notes Section */}
                        {notes.length > 0 && (
                            <div className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                            <MessageCircle className="w-5 h-5 text-yellow-500" />
                                        </div>
                                        <h2 className="text-lg font-sans font-bold text-text-primary uppercase tracking-widest">Dictated Notes</h2>
                                    </div>
                                    <button 
                                        onClick={handleAnalyzeNotes}
                                        disabled={isAnalyzingNotes}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 text-brand-500 font-bold uppercase tracking-widest text-xs hover:bg-brand-500/20 transition-colors disabled:opacity-50"
                                    >
                                        {isAnalyzingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Analyze with AI
                                    </button>
                                </div>
                                
                                <AnimatePresence>
                                    {noteSummary && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mb-8 p-6 rounded-2xl border border-brand-500/30 bg-brand-500/5 relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Bot className="w-24 h-24" />
                                            </div>
                                            <h3 className="font-bold text-brand-500 uppercase tracking-widest text-sm mb-4">AI Inventory Summary</h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                                {noteSummary.restock && noteSummary.restock.length > 0 && (
                                                    <div>
                                                        <h4 className="font-bold text-text-primary text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><ShoppingCart className="w-3 h-3" /> Needs Restock</h4>
                                                        <ul className="space-y-1">
                                                            {noteSummary.restock.map((item, i) => (
                                                                <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {item}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {noteSummary.prep && noteSummary.prep.length > 0 && (
                                                    <div>
                                                        <h4 className="font-bold text-text-primary text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Box className="w-3 h-3" /> Prep Work</h4>
                                                        <ul className="space-y-1">
                                                            {noteSummary.prep.map((item, i) => (
                                                                <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> {item}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {noteSummary.insights && noteSummary.insights.length > 0 && (
                                                <div className="mt-6 pt-4 border-t border-brand-500/20 relative z-10">
                                                    <h4 className="font-bold text-text-primary text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Operational Insights</h4>
                                                    <ul className="space-y-2">
                                                        {noteSummary.insights.map((item, i) => (
                                                            <li key={i} className="text-sm text-text-secondary italic">"{item}"</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="space-y-4">
                                    {notes.map((note, i) => (
                                        <div key={i} className="p-5 rounded-2xl bg-bg-base border border-border-subtle flex flex-col gap-2">
                                            <p className="text-sm text-text-primary font-medium leading-relaxed">{note.text}</p>
                                            <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold">
                                                {new Date(note.date).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modals */}
            <AnimatePresence>
                {showChatModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl"
                    >
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="bg-bg-surface rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-border-subtle flex flex-col h-[85vh] sm:h-[650px] overflow-hidden mt-auto sm:mt-0 pb-8 sm:pb-0"
                        >
                            <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mt-4 sm:hidden shrink-0" />
                            <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-base/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20">
                                        <Bot className="w-6 h-6 text-brand-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-text-primary uppercase tracking-widest">AI Assistant</h3>
                                        <p className="text-[10px] text-accent-green font-bold uppercase tracking-widest">Always Online</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowChatModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-bg-base transition-colors text-text-tertiary">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                                {chatHistory.length === 0 && (
                                    <div className="text-center text-text-tertiary mt-20">
                                        <Bot className="w-16 h-16 mx-auto mb-6 opacity-20" />
                                        <p className="font-bold uppercase tracking-widest text-xs mb-2">How can I help today?</p>
                                        <p className="text-xs opacity-50">Ask about sales, pricing, or inventory</p>
                                    </div>
                                )}
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[85%] px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-lg",
                                            msg.role === 'user' 
                                                ? "primary-button-gradient text-white rounded-tr-sm font-bold" 
                                                : "bg-bg-base text-text-secondary rounded-tl-sm border border-border-subtle font-medium prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-bg-surface-inset prose-pre:border prose-pre:border-border-subtle"
                                        )}>
                                            {msg.role === 'ai' ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.text}
                                                </ReactMarkdown>
                                            ) : (
                                                msg.text
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-border-subtle bg-bg-base/30">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                        placeholder="Ask Streetvend AI..."
                                        className="w-full pl-6 pr-14 py-4 rounded-xl border border-border-subtle bg-bg-base text-text-primary focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-text-tertiary font-medium"
                                    />
                                    <button 
                                        onClick={handleSendChat}
                                        className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center primary-button-gradient text-white rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Store QR Code Modal */}
                {showQrModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative text-center"
                        >
                            <button
                                onClick={() => {
                                    setShowQrModal(false);
                                    setCopiedQr(false);
                                }}
                                className="absolute top-4 right-4 p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-base transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20 mx-auto mb-4">
                                <QrCode className="w-6 h-6" />
                            </div>

                            <h2 className="font-sans font-bold text-xl text-text-primary mb-1">
                                {user?.storeName || "Digital Store QR Code"}
                            </h2>
                            <p className="text-xs text-text-tertiary mb-6">
                                Scan to browse catalog & place orders directly
                            </p>

                            {user?.id ? (
                                <>
                                    <div className="bg-white p-5 rounded-2xl inline-block shadow-xl mb-6 border border-border-subtle">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/store/${user.id}`)}`}
                                            alt="Store QR Code"
                                            className="w-48 h-48 mx-auto"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    </div>

                                    <div className="p-3 bg-bg-base rounded-xl border border-border-subtle mb-4 flex items-center justify-between text-xs text-text-secondary">
                                        <span className="truncate pr-2 font-mono text-[11px]">{`${window.location.origin}/store/${user.id}`}</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/store/${user.id}`);
                                                setCopiedQr(true);
                                                setTimeout(() => setCopiedQr(false), 2500);
                                            }}
                                            className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 shrink-0 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            {copiedQr ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span className="text-[11px]">{copiedQr ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                window.open(`${window.location.origin}/store/${user.id}`, '_blank');
                                            }}
                                            className="w-full py-3 px-3 rounded-xl bg-bg-base border border-border-subtle font-bold text-xs text-text-primary hover:border-brand-500/50 flex items-center justify-center gap-2 transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4 text-brand-500" />
                                            <span>Open Store</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/store/${user.id}`);
                                                setCopiedQr(true);
                                                setTimeout(() => setCopiedQr(false), 2500);
                                            }}
                                            className="w-full py-3 px-3 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                                        >
                                            {copiedQr ? <Check className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                                            <span>{copiedQr ? 'Copied' : 'Share Link'}</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                                    Unable to generate QR code: Vendor ID is not available.
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <GuidedTour
                isOpen={isTourOpen}
                onClose={() => setIsTourOpen(false)}
                steps={TOUR_STEPS}
                onComplete={handleTourComplete}
            />

            <UpgradeModal
                isOpen={showInsightUpgradeModal}
                onClose={() => setShowInsightUpgradeModal(false)}
                featureName="AI Daily Insight"
                requiredTier="starter"
                message="AI Daily Insights analyze your daily sales trends and inventory velocity to deliver actionable business recommendations. Upgrade to Starter (₹79/mo) or above to unlock AI Daily Insights."
            />

            <CustomerTaxBillsModal
                isOpen={showTaxBillsModal}
                onClose={() => setShowTaxBillsModal(false)}
                vendorId={user?.id}
                isAdmin={(user as any)?.role === 'admin' || (user as any)?.email === 'prasad.preetham@gmail.com'}
                onViewBillReplica={(order) => {
                    setSelectedReplicaOrder(order);
                }}
            />

            <TimberInvoiceReplicaModal
                isOpen={!!selectedReplicaOrder}
                onClose={() => setSelectedReplicaOrder(null)}
                orderData={selectedReplicaOrder}
            />

        </div>
    );
}

function StatCard({ title, value, change, icon }: { title: string, value: string, change: string, icon: ReactNode }) {
    return (
        <div className="bg-bg-surface p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border-subtle shadow-xl hover:border-brand-500/30 transition-all group">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/5 flex items-center justify-center text-brand-500 border border-brand-500/10 group-hover:scale-110 transition-transform shrink-0">
                    {icon}
                </div>
                <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest truncate">{title}</span>
            </div>
            <div className="flex items-end justify-between flex-wrap gap-1">
                <div className="text-2xl sm:text-3xl font-sans font-extrabold text-brand-500 not-italic">{value}</div>
                {change && <div className="text-xs font-bold text-accent-green mb-0.5">{change}</div>}
            </div>
        </div>
    );
}

function OrderRow({ id, items, total, method }: { id: string, items: string, total: string, method: string, key?: string }) {
    return (
        <div className="p-4 sm:p-5 rounded-2xl bg-bg-base border border-border-subtle flex justify-between items-center gap-3 group hover:border-brand-500/30 transition-all cursor-pointer">
            <div className="min-w-0 flex-1">
                <div className="font-bold text-text-primary uppercase tracking-wider text-xs sm:text-sm mb-1 group-hover:text-brand-500 transition-colors truncate">Order {id}</div>
                <div className="text-xs text-text-tertiary font-medium tracking-wide truncate">{items}</div>
            </div>
            <div className="text-right shrink-0">
                <div className="font-sans font-extrabold text-brand-500 not-italic text-base sm:text-lg mb-1">{total}</div>
                <div className={cn(
                    "text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest inline-block",
                    method === 'UPI' ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20" : "bg-bg-surface text-text-tertiary border border-border-subtle"
                )}>
                    {method}
                </div>
            </div>
        </div>
    );
}
