import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { mockDb, supabase, mapProductFromDb, mapOrderFromDb } from '../lib/supabase';
import { Product, Order } from '../lib/database.types';
import { Plus, Box, QrCode, Bot, CreditCard, Send, Loader2, X, ChevronRight, ShoppingCart, BarChart3, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/I18nContext';
import SalesTrendChart from '../components/SalesTrendChart';
import AIForecastChart from '../components/AIForecastChart';
import StockPredictionWidget from '../components/StockPredictionWidget';
import GuidedTour, { TourStep, TourTriggerButton } from '../components/GuidedTour';

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

const MOCK_DASHBOARD_STATS = {
    todaySales: 4280,
    salesChange: '+12% vs last week',
    salesProgress: '65%',
    ordersCount: 42,
    ordersChange: '+5 today',
    avgTicket: 102,
    avgTicketChange: '+₹12 vs yesterday',
    newCustomers: 18,
    newCustomersChange: '+3 today',
    recentOrders: [
        { id: '#1042', items: "Pani Puri (x2), Bhel Puri (x1)", total: "₹130", method: "UPI" },
        { id: '#1041', items: "Aloo Tikki (x3)", total: "₹180", method: "CASH" },
        { id: '#1040', items: "Sev Puri (x2), Coke (x1)", total: "₹120", method: "UPI" }
    ],
    insight: "Peak hours are approaching (5 PM - 8 PM). Pre-prep Aloo Tikki as it sold out early yesterday."
};

export default function VendorDashboard() {
    const { t } = useI18n();
    const { user, isLoading, updatePlan, refreshProfile } = useAuth();
    console.log("VendorDashboard user object:", user);
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    
    // UI states for modals
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
    const [notes, setNotes] = useState<{text: string, date: string}[]>([]);

    const [isAnalyzingNotes, setIsAnalyzingNotes] = useState(false);
    const [noteSummary, setNoteSummary] = useState<{restock?: string[], prep?: string[], insights?: string[]} | null>(null);

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
                    const response = await fetch('/api/payu/verify-and-fulfill', {
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
            const res = await fetch('/api/analyze-notes', {
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
        if (!user) return;

        async function fetchVendorData() {
            if (supabase) {
                try {
                    const { data: prodData, count: prodCount, error: prodErr } = await supabase
                        .from('products')
                        .select('*', { count: 'exact' })
                        .eq('vendor_id', user.id);
                    console.log(`VendorDashboard products row count for vendor ${user.id}:`, prodCount, prodData?.length);
                    if (prodData && !prodErr) {
                        setProducts(prodData.map(mapProductFromDb));
                    } else {
                        setProducts(mockDb.products.filter(p => p.vendorId === user.id) as Product[]);
                    }

                    const { data: ordData, count: ordCount, error: ordErr } = await supabase
                        .from('orders')
                        .select('*', { count: 'exact' })
                        .eq('vendor_id', user.id);
                    console.log(`VendorDashboard orders row count for vendor ${user.id}:`, ordCount, ordData?.length);
                    if (ordData && !ordErr) {
                        setOrders(ordData.map(mapOrderFromDb));
                    } else {
                        setOrders([]);
                    }
                    return;
                } catch (e) {
                    console.error("Error fetching vendor data from Supabase:", e);
                }
            }
            setProducts(mockDb.products.filter(p => p.vendorId === user.id) as Product[]);
            setOrders([]);
        }
        fetchVendorData();
    }, [user, isLoading, navigate]);

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
        { name: 'QR Code', icon: QrCode, color: 'text-purple-500', bg: 'bg-purple-500/10', action: () => alert(`Store QR Code Link: ${window.location.origin}/store/${user.id}`) },
        { name: 'AI Assistant', icon: Bot, color: 'text-teal-500', bg: 'bg-teal-500/10', action: () => navigate('/ai-assistant') },
    ];

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        setChatHistory([...chatHistory, { role: 'user', text: chatInput }]);
        const input = chatInput;
        setChatInput('');
        
        try {
            const res = await fetch('/api/chat', {
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
        <div className="min-h-screen pt-28 pb-12 bg-bg-base">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header Card */}
                <div data-tour="store-header" className="bg-bg-surface rounded-[2.5rem] p-6 sm:p-10 border border-border-subtle shadow-2xl mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 overflow-hidden relative">
                    <div className="absolute inset-0 hero-glow opacity-30 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-text-primary leading-tight truncate max-w-full">{user.storeName}</h1>
                            <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-bold uppercase tracking-widest border border-brand-500/20">{user.subscription}</span>
                            <TourTriggerButton onClick={() => setIsTourOpen(true)} />
                        </div>
                        <p className="text-text-tertiary font-bold uppercase tracking-widest text-xs">{user.ownerName} · {user.category}</p>
                    </div>
                    <div className="bg-bg-base/50 backdrop-blur-sm p-6 rounded-3xl border border-border-subtle w-full lg:min-w-[320px] lg:w-auto relative z-10">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <span className="text-text-tertiary text-[10px] font-bold uppercase tracking-widest block mb-1">Today's Sales</span>
                                <div className="text-4xl font-sans font-extrabold text-brand-500 not-italic">₹{MOCK_DASHBOARD_STATS.todaySales.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-accent-green text-xs font-bold">{MOCK_DASHBOARD_STATS.salesChange}</span>
                            </div>
                        </div>
                        <div className="h-2 bg-border-subtle rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: MOCK_DASHBOARD_STATS.salesProgress }}
                                className="h-full bg-brand-500 rounded-full"
                            ></motion.div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Sidebar Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div data-tour="quick-tools" className="bg-bg-surface rounded-3xl p-6 border border-border-subtle shadow-xl">
                            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-6">Quick Tools</h2>
                            <div className="space-y-3">
                                {quickActions.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={action.action}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-bg-base border border-border-subtle hover:border-brand-500 hover:shadow-lg transition-all group"
                                    >
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", action.bg, action.color)}>
                                            <action.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-sm text-text-primary uppercase tracking-widest">{action.name}</span>
                                        <ChevronRight className="w-4 h-4 ml-auto text-text-tertiary group-hover:text-brand-500 transition-colors" />
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
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Stats Row */}
                        <div data-tour="stats-row" className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 gap-6">
                            <StatCard title="Orders" value={String(MOCK_DASHBOARD_STATS.ordersCount)} change={MOCK_DASHBOARD_STATS.ordersChange} icon={<ShoppingCart className="w-5 h-5" />} />
                            <StatCard title="Avg. Ticket" value={`₹${MOCK_DASHBOARD_STATS.avgTicket}`} change={MOCK_DASHBOARD_STATS.avgTicketChange} icon={<CreditCard className="w-5 h-5" />} />
                            <StatCard title="New Customers" value={String(MOCK_DASHBOARD_STATS.newCustomers)} change={MOCK_DASHBOARD_STATS.newCustomersChange} icon={<BarChart3 className="w-5 h-5" />} />
                        </div>

                        {/* Recent Activity & AI Insights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-lg font-sans font-bold text-text-primary uppercase tracking-widest">Recent Orders</h2>
                                    <button className="text-[10px] text-brand-500 font-bold uppercase tracking-widest hover:underline">View History</button>
                                </div>
                                <div className="space-y-4">
                                    {MOCK_DASHBOARD_STATS.recentOrders.map((ord) => (
                                        <OrderRow key={ord.id} id={ord.id} items={ord.items} total={ord.total} method={ord.method} />
                                    ))}
                                </div>
                            </div>

                            <div data-tour="ai-insight" className="bg-bg-surface rounded-[2.5rem] p-8 border border-border-subtle shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-brand-500/5 pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                                        <Sparkles className="w-5 h-5 text-brand-500" />
                                    </div>
                                    <h3 className="font-bold uppercase tracking-widest text-text-primary">AI Daily Insight</h3>
                                </div>
                                <p className="text-text-secondary leading-relaxed mb-8 text-base font-medium relative z-10">
                                    {MOCK_DASHBOARD_STATS.insight}
                                </p>
                                <button 
                                    onClick={() => navigate('/ai-insights')}
                                    className="w-full py-4 primary-button-gradient text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform active:scale-95 relative z-10"
                                >
                                    Full Market Report
                                </button>
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
                                                : "bg-bg-base text-text-secondary rounded-tl-sm border border-border-subtle font-medium"
                                        )}>
                                            {msg.text}
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
            </AnimatePresence>

            <GuidedTour
                isOpen={isTourOpen}
                onClose={() => setIsTourOpen(false)}
                steps={TOUR_STEPS}
                onComplete={handleTourComplete}
            />

        </div>
    );
}

function StatCard({ title, value, change, icon }: { title: string, value: string, change: string, icon: ReactNode }) {
    return (
        <div className="bg-bg-surface p-6 rounded-3xl border border-border-subtle shadow-xl hover:border-brand-500/30 transition-all group">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/5 flex items-center justify-center text-brand-500 border border-brand-500/10 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-sans font-extrabold text-brand-500 not-italic">{value}</div>
                <div className="text-xs font-bold text-accent-green mb-1">{change}</div>
            </div>
        </div>
    );
}

function OrderRow({ id, items, total, method }: { id: string, items: string, total: string, method: string, key?: string }) {
    return (
        <div className="p-5 rounded-2xl bg-bg-base border border-border-subtle flex justify-between items-center group hover:border-brand-500/30 transition-all cursor-pointer">
            <div>
                <div className="font-bold text-text-primary uppercase tracking-widest mb-1 group-hover:text-brand-500 transition-colors">Order {id}</div>
                <div className="text-xs text-text-tertiary font-medium tracking-wide">{items}</div>
            </div>
            <div className="text-right">
                <div className="font-sans font-extrabold text-brand-500 not-italic text-lg mb-1">{total}</div>
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
