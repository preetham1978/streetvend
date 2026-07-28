import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, mapProductFromDb, mockDb } from '../lib/supabase';
import { Product } from '../lib/database.types';
import { ShoppingCart, Plus, Minus, Printer, MessageSquare, Check, Search, ArrowLeft, Loader2, Phone, User, Mic, Sparkles, Volume2, Trash2, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { useVoiceOrder } from '../hooks/useVoiceOrder';
import { usePlanLimits } from '../hooks/usePlanLimits';
import VoiceOrderModal from '../components/VoiceOrderModal';
import UpgradeModal from '../components/UpgradeModal';

const DEFAULT_PRODUCTS: Product[] = [
    { id: 'p1', name: 'Pani Puri', category: 'SNACKS', price: 40, stock: 100, unit: 'plate', vendorId: 'v1' },
    { id: 'p2', name: 'Bhel Puri', category: 'SNACKS', price: 50, stock: 100, unit: 'plate', vendorId: 'v1' },
    { id: 'p3', name: 'Aloo Tikki', category: 'SNACKS', price: 60, stock: 100, unit: 'plate', vendorId: 'v1' },
    { id: 'p4', name: 'Samosa', category: 'SNACKS', price: 20, stock: 100, unit: 'piece', vendorId: 'v1' },
    { id: 'p5', name: 'Dahi Puri', category: 'SNACKS', price: 55, stock: 100, unit: 'plate', vendorId: 'v1' },
    { id: 'p6', name: 'Sev Puri', category: 'SNACKS', price: 45, stock: 100, unit: 'plate', vendorId: 'v1' }
];

export default function CartPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const { hasFeature } = usePlanLimits();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // Cart state: Map productId -> quantity
    const [cart, setCart] = useState<Record<string, number>>({});
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [completedOrder, setCompletedOrder] = useState<any | null>(null);
    const [isParsingVoice, setIsParsingVoice] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const activeProducts = products.length > 0 ? products : DEFAULT_PRODUCTS;

    // Voice recognition hook (Boli Mode)
    const { isListening, isProcessing: isVoiceProcessing, transcript, startListening, stopListening } = useVoiceOrder({
        language: user?.language || 'en',
        onTranscriptComplete: async (finalTranscript, audioBase64, mimeType) => {
            await handleParseVoiceOrder(finalTranscript, audioBase64, mimeType);
        }
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
        fetchProducts();
    }, [user, isAuthLoading, navigate]);

    async function fetchProducts() {
        setIsLoading(true);
        try {
            const vendorId = user?.id || 'v1';
            if (supabase) {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('vendor_id', vendorId);

                if (!error && data && data.length > 0) {
                    setProducts(data.map(mapProductFromDb));
                } else {
                    const vendorProds = mockDb.products.filter(p => p.vendorId === vendorId);
                    setProducts(vendorProds.length > 0 ? (vendorProds as Product[]) : DEFAULT_PRODUCTS);
                }
            } else {
                const vendorProds = mockDb.products.filter(p => p.vendorId === vendorId);
                setProducts(vendorProds.length > 0 ? (vendorProds as Product[]) : DEFAULT_PRODUCTS);
            }
        } catch (err) {
            console.error('Exception fetching products:', err);
            setProducts(DEFAULT_PRODUCTS);
        } finally {
            setIsLoading(false);
        }
    }

    const handleParseVoiceOrder = async (text: string, base64Audio?: string, mimeType?: string) => {
        if (!text.trim() && !base64Audio) return;
        
        setIsParsingVoice(true);
        setVoiceFeedback(`Processing: "${text || 'Audio'}"...`);
        try {
            const res = await fetch('/api/voice-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    transcript: text, 
                    audio: base64Audio,
                    mimeType,
                    products: activeProducts 
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.order && data.order.length > 0) {
                    setCart(prev => {
                        const copy = { ...prev };
                        data.order.forEach((item: any) => {
                            const found = activeProducts.find(p => p.id === item.productId || p.name.toLowerCase().includes(item.name?.toLowerCase()));
                            const pId = found?.id || item.productId;
                            if (pId) {
                                copy[pId] = (copy[pId] || 0) + (item.quantity || 1);
                            }
                        });
                        return copy;
                    });
                    setVoiceFeedback(`Added voice order items to cart!`);
                } else {
                    setVoiceFeedback(`Could not match items from speech.`);
                }
            }
        } catch (err) {
            console.error('Voice parsing error:', err);
            setVoiceFeedback('Failed to parse speech.');
        } finally {
            setIsParsingVoice(false);
            setTimeout(() => setVoiceFeedback(null), 4000);
        }
    };

    const categories = ['All', ...Array.from(new Set(activeProducts.map(p => p.category)))];

    const filteredProducts = activeProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            const current = prev[productId] || 0;
            const updated = current + delta;
            if (updated <= 0) {
                const copy = { ...prev };
                delete copy[productId];
                return copy;
            }
            return { ...prev, [productId]: updated };
        });
    };

    const cartItems = Object.entries(cart).map(([productId, quantity]) => {
        const product = activeProducts.find(p => p.id === productId);
        return { product, quantity };
    }).filter(item => item.product != null) as { product: Product; quantity: number }[];

    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const taxAmount = +(subtotal * 0.05).toFixed(2);
    const totalAmountWithTax = +(subtotal + taxAmount).toFixed(2);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;
        setIsCheckingOut(true);

        try {
            const vendorId = user?.id || 'v1';
            const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);
            const itemsJson = cartItems.map(item => ({
                productId: item.product.id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity
            }));

            const newOrder = {
                id: orderId,
                vendor_id: vendorId,
                customer_name: customerName.trim() || 'Preetham',
                customer_phone: customerPhone.trim() || '',
                items: itemsJson,
                subtotal: subtotal,
                tax: taxAmount,
                total_amount: totalAmountWithTax,
                status: 'completed',
                payment_method: 'cash',
                created_at: new Date().toISOString()
            };

            // Attempt Supabase insert with fallback
            try {
                if (supabase) {
                    const dbPayload = {
                        vendor_id: vendorId,
                        items: itemsJson,
                        total: totalAmountWithTax,
                        payment_method: 'cash'
                    };
                    const { error } = await (supabase.from('orders') as any).insert([dbPayload]);
                    if (error) {
                        console.warn('Supabase order insert notice (using local persistence):', error.message || error);
                    }
                }
            } catch (dbErr) {
                console.warn('Supabase order insert warning:', dbErr);
            }

            // Always persist locally in mockDb as well for immediate reactivity
            (mockDb.orders as any[]).push(newOrder);

            setCompletedOrder(newOrder);
        } catch (err: any) {
            console.error('Checkout error:', err);
            // Fallback: still show bill
            setCompletedOrder({
                id: 'ord_' + Date.now(),
                vendor_id: user?.id || 'v1',
                customer_name: customerName.trim() || 'Preetham',
                customer_phone: customerPhone.trim() || '',
                items: cartItems.map(item => ({
                    productId: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    quantity: item.quantity
                })),
                subtotal: subtotal,
                tax: taxAmount,
                total_amount: totalAmountWithTax,
                status: 'completed',
                payment_method: 'cash',
                created_at: new Date().toISOString()
            });
        } finally {
            setIsCheckingOut(false);
        }
    };

    const generateWhatsAppLink = () => {
        if (!completedOrder) return '';
        const storeName = user?.storeName || 'Al-Noor Meat Shop';
        const customer = completedOrder.customer_name || 'Preetham';
        const sub = completedOrder.subtotal ?? subtotal;
        const tax = completedOrder.tax ?? taxAmount;
        const tot = completedOrder.total_amount ?? totalAmountWithTax;

        let msg = `❖ *Bill from ${storeName}*\n`;
        msg += `─────────────────────\n`;
        msg += `❖ *Customer: ${customer}*\n`;
        completedOrder.items.forEach((item: any) => {
            msg += `• ${item.name} × ${item.quantity} = ₹${item.price * item.quantity}\n`;
        });
        msg += `─────────────────────\n`;
        msg += `Subtotal: ₹${sub}\n`;
        msg += `Tax (5%): ₹${tax}\n`;
        msg += `*TOTAL: ₹${tot}*\n`;
        msg += `─────────────────────\n`;
        msg += `Thank you for your purchase! ❖\n`;
        msg += `_Powered by VeloAI_`;

        const rawPhoneNum = completedOrder.customer_phone ? completedOrder.customer_phone.replace(/\D/g, '') : '';
        // Strip leading zero if present
        let cleanPhoneNum = rawPhoneNum;
        if (cleanPhoneNum.startsWith('0')) {
            cleanPhoneNum = cleanPhoneNum.substring(1);
        }
        const waPhone = cleanPhoneNum ? (cleanPhoneNum.length === 10 ? '91' + cleanPhoneNum : cleanPhoneNum) : '';
        return `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
    };

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

    const handleSendWhatsApp = () => {
        const link = generateWhatsAppLink();
        if (link) {
            window.open(link, '_blank');
        }
    };

    const resetCart = () => {
        setCart({});
        setCustomerName('');
        setCustomerPhone('');
        setCompletedOrder(null);
    };

    return (
        <div className="min-h-screen bg-bg-base text-text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header matching screenshot */}
                <div className="mb-8">
                    <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-text-primary mb-2">
                        Cart & Billing
                    </h1>
                    <p className="text-text-secondary text-xs sm:text-base font-normal">
                        Add products, create bills, and send via WhatsApp — or use the orange Bill by speaking — Tap mic · speak · stop
                    </p>
                </div>

                {completedOrder ? (
                    <div className="max-w-xl mx-auto bg-bg-surface rounded-[2.5rem] p-6 sm:p-10 border border-border-subtle shadow-2xl text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <Check className="w-8 h-8" />
                        </div>
                        <h2 className="no-print font-display font-bold text-2xl sm:text-3xl text-text-primary mb-1">Bill Generated!</h2>
                        <p className="no-print text-text-tertiary text-xs sm:text-sm mb-6">Order #{completedOrder.id} successfully processed.</p>

                        {/* WhatsApp Green Receipt Box matching screenshot */}
                        <div id="printable-receipt" className="printable-area bg-accent-green/20 text-text-primary rounded-[1.75rem] p-6 sm:p-8 font-sans shadow-2xl border border-accent-green/30 text-left relative overflow-hidden mb-8">
                            <div className="flex items-center gap-2 text-text-primary font-bold text-lg sm:text-xl tracking-tight mb-2">
                                <span className="text-accent-green">❖</span>
                                <span>Bill from {user?.storeName || 'Al-Noor Meat Shop'}</span>
                            </div>

                            <div className="h-px bg-border-subtle my-3 w-full" />

                            <div className="flex items-center gap-2 text-text-secondary font-semibold text-sm sm:text-base mb-3">
                                <span className="text-accent-green">❖</span>
                                <span>Customer: {completedOrder.customer_name || 'Preetham'}</span>
                            </div>

                            <div className="space-y-1.5 font-normal text-text-primary text-sm sm:text-base leading-relaxed my-3">
                                {completedOrder.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <span>• {item.name} × {item.quantity}</span>
                                        <span className="font-semibold text-text-primary">₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="h-px bg-border-subtle my-3 w-full" />

                            <div className="space-y-1 text-text-secondary text-sm sm:text-base">
                                <div className="flex justify-between items-center">
                                    <span>Subtotal:</span>
                                    <span>₹{completedOrder.subtotal ?? subtotal}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Tax (5%):</span>
                                    <span>₹{completedOrder.tax ?? taxAmount}</span>
                                </div>
                                <div className="flex justify-between items-center font-bold text-text-primary text-base sm:text-lg pt-1">
                                    <span>TOTAL:</span>
                                    <span className="text-brand-500 font-display">₹{completedOrder.total_amount ?? totalAmountWithTax}</span>
                                </div>
                            </div>

                            <div className="h-px bg-border-subtle my-3.5 w-full" />

                            <div className="flex justify-between items-end text-text-tertiary text-xs sm:text-sm pt-1">
                                <div>
                                    <p className="font-semibold text-text-secondary flex items-center gap-1">
                                        Thank you for your purchase! <span className="text-accent-green">❖</span>
                                    </p>
                                    <p className="text-text-tertiary italic font-medium text-xs mt-1">
                                        Powered by VeloAI
                                    </p>
                                </div>
                                <div className="text-[10px] text-accent-green font-mono flex items-center gap-1">
                                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-accent-green font-bold">✓✓</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 no-print">
                            <button
                                onClick={handleSendWhatsApp}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-accent-green hover:bg-opacity-90 text-white font-bold text-xs uppercase tracking-widest shadow-xl transition-all"
                            >
                                <MessageSquare className="w-4 h-4" /> Send via WhatsApp
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-widest hover:border-brand-500 transition-all"
                            >
                                <Printer className="w-4 h-4" /> Print Bill
                            </button>
                        </div>

                        <button
                            onClick={resetCart}
                            className="mt-6 text-xs font-bold text-brand-500 uppercase tracking-widest hover:underline"
                        >
                            + Create Another Bill
                        </button>

                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
                        {/* Left: Products Section */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
                                    PRODUCTS
                                </h2>
                                {voiceFeedback && (
                                    <span className="text-xs text-brand-500 font-bold animate-pulse">
                                        {voiceFeedback}
                                    </span>
                                )}
                            </div>

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-bg-surface rounded-2xl border border-border-subtle">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
                                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Loading catalog...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4">
                                    {filteredProducts.map(p => {
                                        const qty = cart[p.id] || 0;
                                        return (
                                            <div
                                                key={p.id}
                                                className="bg-bg-surface rounded-2xl p-5 border border-border-subtle shadow-md hover:border-brand-500/40 transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-3">
                                                        {/* Icon Box */}
                                                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-xl shadow-inner">
                                                            🍿
                                                        </div>
                                                        {/* Category Badge */}
                                                        <span className="bg-bg-surface-inset text-text-secondary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border border-border-subtle">
                                                            {p.category}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-bold text-lg text-text-primary mb-0.5">{p.name}</h3>
                                                    <p className="text-xs text-text-secondary font-medium mb-4">{p.unit || 'plate'}</p>
                                                </div>

                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="font-sans font-extrabold text-2xl text-brand-500 not-italic">
                                                        ₹{p.price}
                                                    </span>

                                                    {qty === 0 ? (
                                                        <button
                                                            onClick={() => updateQuantity(p.id, 1)}
                                                            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                                                        >
                                                            Add to Cart
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2 bg-bg-surface-inset border border-border-subtle rounded-xl p-1">
                                                            <button
                                                                onClick={() => updateQuantity(p.id, -1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg-surface text-text-primary hover:bg-red-500 hover:text-white transition-colors"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="w-6 text-center font-bold text-sm text-text-primary">{qty}</span>
                                                            <button
                                                                onClick={() => updateQuantity(p.id, 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg-surface text-text-primary hover:bg-brand-500 hover:text-white transition-colors"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>

                        {/* Right Column: Current Bill & Boli Mode */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Current Bill Card matching screenshot */}
                            <div className="bg-bg-surface rounded-2xl p-6 border border-border-subtle shadow-2xl min-h-[220px] flex flex-col justify-between">
                                <div>
                                    <h2 className="font-bold text-xl text-text-primary mb-4">Current Bill</h2>

                                    {cartItems.length === 0 ? (
                                        <div className="text-center py-12 text-text-tertiary font-medium text-sm">
                                            Cart is empty
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                                {cartItems.map(item => (
                                                    <div key={item.product.id} className="flex items-center justify-between bg-bg-surface-inset p-3 rounded-xl border border-border-subtle">
                                                        <div>
                                                            <h4 className="font-bold text-sm text-text-primary">{item.product.name}</h4>
                                                            <span className="text-xs text-brand-500 font-bold not-italic">₹{item.product.price} each</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1.5 bg-bg-surface border border-border-subtle rounded-lg p-1">
                                                                <button
                                                                    onClick={() => updateQuantity(item.product.id, -1)}
                                                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500 text-text-tertiary hover:text-white"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="w-5 text-center font-bold text-xs text-text-primary">{item.quantity}</span>
                                                                <button
                                                                    onClick={() => updateQuantity(item.product.id, 1)}
                                                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-brand-500 text-text-tertiary hover:text-white"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <span className="font-sans font-bold text-sm text-brand-500 w-14 text-right not-italic">
                                                                ₹{item.product.price * item.quantity}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Customer input fields */}
                                            <div className="space-y-2 pt-2 border-t border-border-subtle">
                                                <input
                                                    type="text"
                                                    placeholder="Customer Name (e.g. Preetham)"
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                                />
                                                <input
                                                    type="tel"
                                                    placeholder="WhatsApp Phone Number"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                                />
                                            </div>

                                            {/* Subtotal & Tax */}
                                            <div className="pt-3 border-t border-border-subtle space-y-1 text-xs text-text-secondary">
                                                <div className="flex justify-between">
                                                    <span>Subtotal:</span>
                                                    <span className="font-sans font-bold text-brand-500 not-italic">₹{subtotal}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Tax (5%):</span>
                                                    <span className="font-sans font-bold text-brand-500 not-italic">₹{taxAmount}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-text-primary text-base pt-1">
                                                    <span>TOTAL:</span>
                                                    <span className="text-brand-500 font-sans font-extrabold not-italic">₹{totalAmountWithTax}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleCheckout}
                                                disabled={isCheckingOut}
                                                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-xl shadow-brand-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                Generate & Complete Bill
                                            </button>
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Boli Mode Floating Button & Offline Queue Card matching screenshot */}
                            <div className="flex flex-col items-end gap-3 pt-6">
                                {/* Top Badge */}
                                <div className="bg-brand-500 text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-lg text-center tracking-wide">
                                    1 offline bills queued
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Black Card */}
                                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-3.5 shadow-2xl text-right min-w-[160px]">
                                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest block">
                                            NEW · BOLI MODE
                                        </span>
                                        <h4 className="text-xs font-bold text-text-primary mt-0.5">
                                            Bill by speaking
                                        </h4>
                                        <p className="text-[10px] text-text-secondary mt-0.5">
                                            {isVoiceProcessing || isParsingVoice ? (
                                                <span className="text-brand-500 font-bold flex items-center gap-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" /> Processing order...
                                                </span>
                                            ) : isListening ? (
                                                transcript ? `"${transcript}"` : 'Listening now...'
                                            ) : (
                                                'Tap mic · speak · stop'
                                            )}
                                        </p>
                                    </div>

                                    {/* Big Orange Mic Button */}
                                    <button
                                        onClick={() => {
                                            if (!hasFeature('ai_voice_input')) {
                                                setShowUpgradeModal(true);
                                                return;
                                            }
                                            if (isListening) stopListening();
                                            else setShowVoiceModal(true);
                                        }}
                                        className={cn(
                                            "w-16 h-16 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center cursor-pointer relative transition-transform hover:scale-105 active:scale-95 shrink-0",
                                            isListening ? "ring-4 ring-red-500 animate-pulse shadow-[0_0_35px_rgba(239,68,68,0.8)]" : "shadow-[0_0_30px_rgba(255,138,0,0.6)]"
                                        )}
                                        title="Start Boli Voice Billing"
                                    >
                                        <Mic className="w-7 h-7 text-white" />
                                        
                                        {/* BOLI Tag */}
                                        <span className="bg-bg-surface-inset text-brand-500 border border-brand-500/50 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider absolute -top-1 -right-1 shadow">
                                            BOLI
                                        </span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            <VoiceOrderModal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                availableProducts={activeProducts}
                onAddItemsToCart={(items) => {
                    setCart(prev => {
                        const updated = { ...prev };
                        items.forEach(it => {
                            updated[it.product.id] = (updated[it.product.id] || 0) + it.quantity;
                        });
                        return updated;
                    });
                }}
            />

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="AI Voice Input (Boli Mode)"
                requiredTier="professional"
                message="Voice-assisted billing is available on Professional and Enterprise plans. Upgrade to Professional to use Boli Mode."
            />
        </div>
    );
}
