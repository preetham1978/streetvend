import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, mapProductFromDb, mockDb, mapVendorFromDb } from '../lib/supabase';
import { Product, Vendor } from '../lib/database.types';
import { ShoppingCart, Plus, Minus, Check, Search, Phone, User, Store as StoreIcon, QrCode, ArrowLeft, Loader2, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function StorePage() {
    const { vendorId } = useParams<{ vendorId: string }>();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // Cart state
    const [cart, setCart] = useState<Record<string, number>>({});
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('upi');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);

    useEffect(() => {
        if (!vendorId) return;
        fetchStoreData();
    }, [vendorId]);

    async function fetchStoreData() {
        setIsLoading(true);
        setError(null);
        try {
            // Find Vendor
            let currentVendor: Vendor | null = null;
            if (supabase) {
                try {
                    const { data, error: vErr } = await supabase
                        .from('vendors')
                        .select('*')
                        .eq('id', vendorId)
                        .single();
                    if (!vErr && data) {
                        currentVendor = mapVendorFromDb(data);
                    }
                } catch (e) {
                    console.error('Supabase error fetching vendor:', e);
                }
            }

            if (!currentVendor) {
                const found = mockDb.vendors.find(v => v.id === vendorId);
                if (found) {
                    currentVendor = found as unknown as Vendor;
                }
            }

            if (!currentVendor) {
                setError('Store not found. Please verify the URL or QR code.');
                setIsLoading(false);
                return;
            }

            setVendor(currentVendor);

            // Fetch Products
            let storeProducts: Product[] = [];
            if (supabase) {
                try {
                    const { data, error: pErr } = await supabase
                        .from('products')
                        .select('*')
                        .eq('vendor_id', vendorId);
                    if (!pErr && data) {
                        storeProducts = data.map(mapProductFromDb);
                    }
                } catch (e) {
                    console.error('Supabase error fetching products:', e);
                }
            }

            if (storeProducts.length === 0 && !supabase) {
                storeProducts = mockDb.products.filter(p => p.vendorId === vendorId) as Product[];
            }

            setProducts(storeProducts);
        } catch (err: any) {
            console.error('Error fetching store info:', err);
            setError(err.message || 'An unexpected error occurred loading the store.');
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
                <p className="text-text-secondary font-bold uppercase tracking-wider text-xs">Loading digital shop...</p>
            </div>
        );
    }

    if (error || !vendor) {
        return (
            <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 mb-6">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="font-display font-bold text-2xl text-text-primary mb-2">Shop Not Found</h1>
                <p className="text-text-secondary max-w-md mb-8">{error || 'This stall does not exist or has been deactivated.'}</p>
                <Link to="/" className="px-6 py-3 rounded-full primary-button-gradient text-white font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                    Go Back Home
                </Link>
            </div>
        );
    }

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = products.filter(p => {
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
        const product = products.find(p => p.id === productId);
        return { product, quantity };
    }).filter(item => item.product != null) as { product: Product; quantity: number }[];

    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const handleCheckoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartItems.length === 0) return;
        if (!customerName.trim() || !customerPhone.trim()) {
            alert('Please fill in your name and phone number to place the order.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Build the Whatsapp message
            const itemsText = cartItems.map(item => `• ${item.product.name} x${item.quantity} (₹${item.product.price * item.quantity})`).join('\n');
            const totalText = `*TOTAL: ₹${subtotal}*`;
            const paymentText = `*Preferred Payment:* ${paymentMethod.toUpperCase()}`;
            const customerText = `*Customer Details:*\nName: ${customerName.trim()}\nPhone: ${customerPhone.trim()}`;
            
            const fullMessage = `Hello ${vendor.storeName},\nI would like to place an order:\n\n${itemsText}\n\n${totalText}\n${paymentText}\n\n${customerText}\n\nSent via Streetvend Public Store.`;
            
            const encodedMessage = encodeURIComponent(fullMessage);
            const rawPhone = vendor.phone.replace(/\D/g, '');
            // Strip leading zero if present
            let cleanRawPhone = rawPhone;
            if (cleanRawPhone.startsWith('0')) {
                cleanRawPhone = cleanRawPhone.substring(1);
            }
            const cleanPhone = cleanRawPhone.length === 10 ? '91' + cleanRawPhone : cleanRawPhone;
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

            // Optional: Insert into order history of the vendor
            if (supabase) {
                try {
                    const newId = 'ord_' + Math.random().toString(36).substring(2, 9);
                    const dbPayload = {
                        id: newId,
                        vendor_id: vendor.id,
                        items: cartItems.map(ci => ({
                            productId: ci.product.id,
                            name: ci.product.name,
                            price: ci.product.price,
                            quantity: ci.quantity
                        })),
                        total: subtotal,
                        payment_method: paymentMethod,
                        created_at: new Date().toISOString()
                    };
                    await (supabase.from('orders') as any).insert([dbPayload]);
                } catch (dbErr) {
                    console.error('Error inserting public order to Supabase:', dbErr);
                }
            }

            setLastOrderDetails({
                whatsappUrl,
                items: cartItems,
                total: subtotal,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                paymentMethod
            });

            // Clean cart and trigger success state
            setCart({});
            setOrderSuccess(true);
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Failed to place order.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-base pt-28 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {orderSuccess && lastOrderDetails ? (
                    /* Order success landing view */
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl mx-auto bg-bg-surface rounded-[2.5rem] p-8 sm:p-12 border border-border-subtle shadow-2xl text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 inset-x-0 h-2 primary-button-gradient"></div>
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Check className="w-10 h-10" />
                        </div>
                        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-text-primary mb-4 italic">Order Formed!</h1>
                        <p className="text-text-secondary mb-8 text-base font-medium max-w-md mx-auto">
                            Thank you, <span className="text-text-primary font-bold">{lastOrderDetails.customerName}</span>! Tap the button below to send your order directly to the vendor's WhatsApp to finalize and pay.
                        </p>

                        <div className="bg-bg-base/70 border border-border-subtle rounded-3xl p-6 mb-8 text-left max-w-md mx-auto">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-text-tertiary mb-4">Order Summary</h3>
                            <div className="space-y-2 mb-4">
                                {lastOrderDetails.items.map((ci: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-text-secondary font-semibold">{ci.product.name} <span className="text-brand-500">x{ci.quantity}</span></span>
                                        <span className="text-text-primary font-bold">₹{ci.product.price * ci.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-px bg-border-subtle mb-4"></div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs uppercase font-bold text-text-tertiary">TOTAL</span>
                                <span className="text-2xl font-sans font-extrabold text-brand-500 not-italic">₹{lastOrderDetails.total}</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button
                                onClick={() => {
                                    window.open(lastOrderDetails.whatsappUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="flex-1 py-4.5 rounded-2xl primary-button-gradient text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="w-4 h-4" /> Send on WhatsApp
                            </button>
                            <button
                                onClick={() => {
                                    setOrderSuccess(false);
                                    setLastOrderDetails(null);
                                }}
                                className="flex-1 py-4.5 rounded-2xl bg-bg-surface border border-border-subtle text-text-primary font-bold uppercase tracking-widest text-xs hover:bg-bg-base transition-colors"
                            >
                                Order More Items
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    /* Normal Shop browsing view */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Menu & Browsing Area (Left/Middle) */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Vendor Profile Header Banner */}
                            <div className="bg-bg-surface rounded-[2rem] p-6 sm:p-8 border border-border-subtle shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="absolute inset-0 hero-glow opacity-10 pointer-events-none"></div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                        <StoreIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary leading-tight mb-1">{vendor.storeName}</h1>
                                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-tertiary uppercase tracking-widest">
                                            <span>{vendor.ownerName}</span>
                                            <span>•</span>
                                            <span className="text-brand-500">{vendor.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative z-10 shrink-0">
                                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-green/10 text-accent-green text-[10px] font-extrabold uppercase tracking-widest border border-accent-green/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></span>
                                        Accepting Orders
                                    </span>
                                </div>
                            </div>

                            {/* Search & Categories Bar */}
                            <div className="bg-bg-surface rounded-2xl p-4 border border-border-subtle flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md">
                                <div className="relative w-full sm:max-w-xs">
                                    <input
                                        type="text"
                                        placeholder="Search menu items..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-subtle bg-bg-base text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-text-primary font-medium"
                                    />
                                    <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3.5" />
                                </div>
                                
                                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-hide py-1">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                                selectedCategory === cat
                                                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/10"
                                                    : "bg-bg-base border border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-500/30"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Menu Product Grid */}
                            {filteredProducts.length === 0 ? (
                                <div className="bg-bg-surface rounded-[2rem] p-12 text-center border border-border-subtle">
                                    <StoreIcon className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
                                    <p className="font-bold uppercase tracking-widest text-xs text-text-tertiary mb-1">No items found</p>
                                    <p className="text-xs text-text-secondary">Try searching for a different keyword or category.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {filteredProducts.map((prod) => {
                                        const qty = cart[prod.id] || 0;
                                        return (
                                            <div 
                                                key={prod.id}
                                                className="bg-bg-surface rounded-3xl p-5 border border-border-subtle flex justify-between items-center group hover:border-brand-500/30 transition-all shadow-md"
                                            >
                                                <div className="min-w-0 pr-4">
                                                    <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-text-tertiary mb-2 bg-bg-base px-2.5 py-1 rounded-full border border-border-subtle">
                                                        {prod.category}
                                                    </span>
                                                    <h3 className="font-bold text-text-primary text-lg truncate group-hover:text-brand-500 transition-colors">{prod.name}</h3>
                                                    <p className="text-xl font-sans font-extrabold text-brand-500 not-italic mt-1.5">
                                                        ₹{prod.price} <span className="text-xs font-medium text-text-tertiary uppercase font-sans">/ {prod.unit || 'piece'}</span>
                                                    </p>
                                                </div>
                                                
                                                <div className="shrink-0">
                                                    {qty > 0 ? (
                                                        <div className="flex items-center gap-2.5 bg-bg-base p-1.5 rounded-2xl border border-border-subtle shadow-inner">
                                                            <button
                                                                onClick={() => updateQuantity(prod.id, -1)}
                                                                className="w-8 h-8 rounded-xl bg-bg-surface hover:bg-white/5 text-text-secondary hover:text-text-primary flex items-center justify-center border border-border-subtle transition-colors shadow-sm active:scale-90"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <span className="w-6 text-center font-sans font-extrabold text-text-primary text-base">{qty}</span>
                                                            <button
                                                                onClick={() => updateQuantity(prod.id, 1)}
                                                                className="w-8 h-8 rounded-xl bg-bg-surface hover:bg-white/5 text-text-secondary hover:text-text-primary flex items-center justify-center border border-border-subtle transition-colors shadow-sm active:scale-90"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateQuantity(prod.id, 1)}
                                                            className="px-5 py-3 rounded-2xl border border-border-subtle bg-bg-base hover:border-brand-500 hover:bg-brand-500/5 text-text-primary font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                                                        >
                                                            Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>

                        {/* Customer Shopping Cart Sidebar (Right) */}
                        <div className="lg:col-span-1">
                            <div className="bg-bg-surface rounded-[2rem] border border-border-subtle p-6 sm:p-8 shadow-xl sticky top-28 space-y-6">
                                <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart className="w-5 h-5 text-brand-500" />
                                        <h2 className="font-display font-extrabold text-lg text-text-primary uppercase tracking-widest">Your Order</h2>
                                    </div>
                                    <span className="text-[10px] font-extrabold bg-brand-500/10 text-brand-500 px-3 py-1 rounded-full border border-brand-500/20 uppercase tracking-widest">
                                        {cartItems.reduce((sum, ci) => sum + ci.quantity, 0)} items
                                    </span>
                                </div>

                                {cartItems.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-30" />
                                        <p className="font-bold uppercase tracking-widest text-[10px] text-text-tertiary mb-1">Your cart is empty</p>
                                        <p className="text-xs text-text-secondary px-4">Browse our fresh menu items and tap Add to start ordering.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Cart list */}
                                        <div className="max-h-56 overflow-y-auto divide-y divide-border-subtle pr-1 scrollbar-hide">
                                            {cartItems.map((ci) => (
                                                <div key={ci.product.id} className="py-3 flex justify-between items-center">
                                                    <div className="min-w-0 pr-2">
                                                        <p className="font-bold text-text-primary text-sm truncate">{ci.product.name}</p>
                                                        <p className="text-xs text-text-tertiary font-sans font-bold">₹{ci.product.price} x {ci.quantity}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => updateQuantity(ci.product.id, -1)}
                                                            className="w-6 h-6 rounded-lg bg-bg-base text-text-secondary hover:text-text-primary flex items-center justify-center border border-border-subtle active:scale-90"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="w-5 text-center font-sans font-extrabold text-text-primary text-xs">{ci.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(ci.product.id, 1)}
                                                            className="w-6 h-6 rounded-lg bg-bg-base text-text-secondary hover:text-text-primary flex items-center justify-center border border-border-subtle active:scale-90"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pricing Subtotal */}
                                        <div className="pt-4 border-t border-border-subtle flex justify-between items-end font-sans">
                                            <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Subtotal</span>
                                            <span className="text-2xl font-extrabold text-brand-500 not-italic">₹{subtotal}</span>
                                        </div>

                                        {/* Customer Information Form */}
                                        <form onSubmit={handleCheckoutSubmit} className="pt-4 border-t border-border-subtle space-y-4">
                                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary">Customer Details</p>
                                            
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Your Name (e.g. Preetham)"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-subtle bg-bg-base text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold placeholder:font-normal"
                                                    />
                                                    <User className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
                                                </div>
                                                
                                                <div className="relative">
                                                    <input
                                                        type="tel"
                                                        required
                                                        placeholder="Your WhatsApp Number"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-subtle bg-bg-base text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold placeholder:font-normal"
                                                    />
                                                    <Phone className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
                                                </div>
                                            </div>

                                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary pt-2">Payment Option</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('upi')}
                                                    className={cn(
                                                        "py-2.5 rounded-xl text-xs font-bold transition-all border text-center uppercase tracking-wider",
                                                        paymentMethod === 'upi'
                                                            ? "bg-brand-500/10 border-brand-500/40 text-brand-500"
                                                            : "bg-bg-base border-border-subtle text-text-secondary hover:text-text-primary"
                                                    )}
                                                >
                                                    UPI QR / Pay
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('cash')}
                                                    className={cn(
                                                        "py-2.5 rounded-xl text-xs font-bold transition-all border text-center uppercase tracking-wider",
                                                        paymentMethod === 'cash'
                                                            ? "bg-brand-500/10 border-brand-500/40 text-brand-500"
                                                            : "bg-bg-base border-border-subtle text-text-secondary hover:text-text-primary"
                                                    )}
                                                >
                                                    Pay Cash
                                                </button>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full py-4 rounded-xl primary-button-gradient text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-brand-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                Place Order on WhatsApp
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
