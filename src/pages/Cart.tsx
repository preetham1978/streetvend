import { apiFetch } from '../lib/apiFetch';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { PlanTier, isTierAtLeast } from '../config/pricing';
import UpgradeModal from '../components/UpgradeModal';
import VoiceBillingModal from '../components/VoiceBillingModal';
import TimberCalculatorModal from '../components/TimberCalculatorModal';
import TimberInvoiceReplicaModal from '../components/TimberInvoiceReplicaModal';
import CustomerTaxBillsModal from '../components/CustomerTaxBillsModal';
import { supabase, mapProductFromDb, mockDb } from '../lib/supabase';
import { Product } from '../lib/database.types';
import { ShoppingCart, Plus, Minus, Printer, MessageSquare, Check, Search, ArrowLeft, Loader2, Phone, User, Mic, Sparkles, Volume2, Trash2, Lock, AlertCircle, X, CreditCard, Receipt, ShoppingBag, ArrowRight, Calculator, FileText, MapPin, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

const getCategoryIcon = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('timber') || cat.includes('wood') || cat.includes('log') || cat.includes('teak')) return '🪵';
    if (cat.includes('snack') || cat.includes('chaat') || cat.includes('street') || cat.includes('namkeen')) return '🍿';
    if (cat.includes('sweet') || cat.includes('dessert') || cat.includes('mithai') || cat.includes('cake') || cat.includes('bakery')) return '🧁';
    if (cat.includes('beverage') || cat.includes('drink') || cat.includes('tea') || cat.includes('chai') || cat.includes('juice') || cat.includes('coffee')) return '☕';
    if (cat.includes('vegetable') || cat.includes('fruit') || cat.includes('grocery') || cat.includes('organic')) return '🥗';
    if (cat.includes('meat') || cat.includes('chicken') || cat.includes('mutton') || cat.includes('seafood') || cat.includes('fish')) return '🍗';
    if (cat.includes('dosa') || cat.includes('tiffin') || cat.includes('breakfast')) return '🥘';
    return '🍽️';
};

export default function CartPage() {
    const { user, session, isLoading: isAuthLoading, updateUser } = useAuth();
    const { hasFeature, currentPlan } = usePlanLimits();
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // Voice Billing & Timber Modal states
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showTimberModal, setShowTimberModal] = useState(false);
    const [showPaperBillModal, setShowPaperBillModal] = useState(false);
    const [showTaxBillsModal, setShowTaxBillsModal] = useState(false);
    const [selectedReplicaOrder, setSelectedReplicaOrder] = useState<any>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState<{ name: string; tier: PlanTier; message: string }>({
        name: 'AI Voice Billing',
        tier: 'professional',
        message: 'Speak items naturally in English or Hindi to auto-add them to bills. Available on Professional plan (₹299/mo) and above.'
    });

    // Cart state: Map productId -> quantity
    const [cart, setCart] = useState<Record<string, number>>({});
    const [customCartItems, setCustomCartItems] = useState<{
        id: string;
        name: string;
        price: number;
        unit: string;
        quantity: number;
        specs?: string;
    }[]>([]);

    const [mobileTab, setMobileTab] = useState<'catalog' | 'bill'>('catalog');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [ewayBillNo, setEwayBillNo] = useState('');
    const [vehicleNo, setVehicleNo] = useState('');
    const [woodSpecsNotes, setWoodSpecsNotes] = useState('');
    
    const isTimberVendor = user?.category?.toLowerCase().includes('timber') || 
                           user?.category?.toLowerCase().includes('wood') || 
                           user?.storeName?.toLowerCase().includes('somasundaram');

    const [taxRatePercent, setTaxRatePercent] = useState<number>(isTimberVendor ? 18 : 5);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [completedOrder, setCompletedOrder] = useState<any | null>(null);
    const [showPrintUpgradeModal, setShowPrintUpgradeModal] = useState(false);

    // UPI Payment States
    const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
    const [showUpiModal, setShowUpiModal] = useState(false);
    const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);
    const [showUpiSetupModal, setShowUpiSetupModal] = useState(false);
    const [quickUpiInput, setQuickUpiInput] = useState(user?.upiId || '');
    const [quickUpiError, setQuickUpiError] = useState<string | null>(null);
    const [isSavingQuickUpi, setIsSavingQuickUpi] = useState(false);
    const [upiPaymentStatus, setUpiPaymentStatus] = useState<'waiting' | 'received'>('waiting');

    const activeProducts = products;

    useEffect(() => {
        if (!isAuthLoading && !user) {
            navigate('/login');
            return;
        }
        if (!user) return;
        fetchProducts();
    }, [user, isAuthLoading, navigate]);

    async function fetchProducts() {
        setIsLoading(true);
        try {
            const vendorId = user?.id;
            if (supabase && vendorId) {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('vendor_id', vendorId);

                if (!error && data) {
                    setProducts(data.map(mapProductFromDb));
                } else {
                    setProducts([]);
                }
            } else if (vendorId && import.meta.env.DEV) {
                const vendorProds = mockDb.products.filter(p => p.vendorId === vendorId);
                setProducts(vendorProds as Product[]);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error('Exception fetching products:', err);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }


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

    const handleAddVoiceItemsToCart = (itemsToAdd: { product: Product; quantity: number }[]) => {
        setCart(prev => {
            const copy = { ...prev };
            itemsToAdd.forEach(item => {
                const currentQty = copy[item.product.id] || 0;
                copy[item.product.id] = currentQty + item.quantity;
            });
            return copy;
        });
    };

    const handleAddTimberItemToCart = (timberItem: { name: string; price: number; unit: string; quantity: number; specs: string }) => {
        setCustomCartItems(prev => [
            ...prev,
            {
                id: 'timber_' + Date.now(),
                name: timberItem.name,
                price: timberItem.price,
                unit: timberItem.unit,
                quantity: timberItem.quantity,
                specs: timberItem.specs
            }
        ]);
    };

    const handleRemoveCustomItem = (id: string) => {
        setCustomCartItems(prev => prev.filter(i => i.id !== id));
    };

    const handleUpdateCustomItemPrice = (id: string, price: number) => {
        setCustomCartItems(prev => prev.map(item => item.id === id ? { ...item, price: isNaN(price) ? 0 : price } : item));
    };

    const handleUpdateCustomItemName = (id: string, name: string) => {
        setCustomCartItems(prev => prev.map(item => item.id === id ? { ...item, name } : item));
    };

    const handleLoadSampleTimberBill = () => {
        setCustomerName('R. Thangavelu');
        setCustomerPhone('9865016017');
        setCustomerAddress('Nalla chitti Palayam, Sivagiri, Erode Dt.');
        setEwayBillNo('5418 6645 4188');
        setVehicleNo('TN-70J-6881');
        setTaxRatePercent(18);
        setCustomCartItems([
            {
                id: 'timber_sample_1',
                name: 'Teak Wood Sizes (2.92 CBM / 42 Pcs)',
                price: 116090.09,
                unit: 'CBM',
                quantity: 2.92,
                specs: 'Sizes: 6x9, 5x3, 12x4, 12.5x2, 8x6, 8.3x1, 9x2, 3.5x3, 6.5x2, 7.5x1.5, 7x14, 4x3, 8x2, 5x2, 3.5x1, 4x2, 6.5x10, 3x3, 13x12.5, 5x4, 3.5x6, 8x3, 6x6, 4x2, 5.5x1, 12.5x14, 7x40, 7.4x1, 4x8, 5x60, 2.4x1, 8x12, 7x100, 13.5x1.5, 6.5x10, 4x4, 7x2, 5x20, 4x1, 4.5x14, 12x2, 3.5x7 (Total: 2.92 M.CUBM / ~103.12 CFT)'
            }
        ]);
    };

    const cartItems = Object.entries(cart).map(([productId, quantity]) => {
        const product = activeProducts.find(p => p.id === productId);
        return { product, quantity };
    }).filter(item => item.product != null) as { product: Product; quantity: number }[];

    const catalogSubtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const customSubtotal = customCartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const subtotal = +(catalogSubtotal + customSubtotal).toFixed(2);
    
    const taxRate = taxRatePercent / 100;
    const taxAmount = +(subtotal * taxRate).toFixed(2);
    const totalAmountWithTax = +(subtotal + taxAmount).toFixed(2);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0) + customCartItems.length;

    useEffect(() => {
        if (user?.upiId) {
            setQuickUpiInput(user.upiId);
            setPaymentMode('upi');
        }
    }, [user?.upiId]);

    const handleSaveQuickUpi = async (e: React.FormEvent) => {
        e.preventDefault();
        const upiRegex = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
        if (quickUpiInput.trim() && !upiRegex.test(quickUpiInput.trim())) {
            setQuickUpiError("Invalid UPI ID format (e.g. dosapoint@okaxis)");
            return;
        }
        setQuickUpiError(null);
        setIsSavingQuickUpi(true);
        try {
            const val = quickUpiInput.trim() || null;
            if (supabase && user?.id) {
                const { error } = await (supabase.from('vendors') as any).update({ upi_id: val }).eq('id', user.id);
                if (error) {
                    console.error("Supabase UPI ID update error:", error.message || error);
                    throw new Error("Failed to save UPI ID, please try again");
                }
            }
            if (updateUser) {
                updateUser({ upiId: val });
            }
            setShowUpiSetupModal(false);
            setPaymentMode('upi');
        } catch (err: any) {
            setQuickUpiError(err.message || "Failed to save UPI ID");
        } finally {
            setIsSavingQuickUpi(false);
        }
    };

    const handleStartCheckout = async () => {
        if (cartItems.length === 0 && customCartItems.length === 0) return;
        if (paymentMode === 'upi') {
            if (!user?.upiId) {
                setQuickUpiInput('');
                setShowUpiSetupModal(true);
                return;
            }
            setIsCheckingOut(true);
            setUpiPaymentStatus('waiting');
            try {
                const orderRef = 'ord_' + Math.random().toString(36).substring(2, 9);
                const upiUri = `upi://pay?pa=${encodeURIComponent(user.upiId)}&pn=${encodeURIComponent(user.storeName || 'Street Vendor')}&am=${totalAmountWithTax}&cu=INR&tn=${orderRef}`;
                const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 280, margin: 2 });
                setUpiQrUrl(qrDataUrl);
                setShowUpiModal(true);
            } catch (err) {
                console.error("QR generation failed:", err);
                await handleCompleteCheckout('cash');
            } finally {
                setIsCheckingOut(false);
            }
        } else {
            await handleCompleteCheckout('cash');
        }
    };

    const handleConfirmPaymentReceived = () => {
        if (!user) return; // Only authenticated vendors operating POS can confirm payment
        setUpiPaymentStatus('received');
        setTimeout(() => {
            handleCompleteCheckout('upi');
        }, 1200);
    };

    const handleCheckout = handleStartCheckout;

    const handleCompleteCheckout = async (method: 'cash' | 'upi') => {
        setIsCheckingOut(true);
        try {
            const vendorId = user?.id || 'v1';
            const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);
            
            const catalogItems = cartItems.map(item => ({
                productId: item.product.id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                unit: item.product.unit || 'pcs'
            }));

            const customItems = customCartItems.map(item => ({
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                unit: item.unit,
                specs: item.specs
            }));

            const combinedItems = [...catalogItems, ...customItems];

            const newOrder = {
                id: orderId,
                vendor_id: vendorId,
                customer_name: customerName.trim() || 'R. Thangavelu',
                customer_phone: customerPhone.trim() || '9865016017',
                customer_address: customerAddress.trim() || undefined,
                eway_bill_no: ewayBillNo.trim() || undefined,
                vehicle_no: vehicleNo.trim() || undefined,
                wood_specs: woodSpecsNotes.trim() || undefined,
                items: combinedItems,
                subtotal: subtotal,
                tax: taxAmount,
                tax_rate: taxRatePercent,
                total_amount: totalAmountWithTax,
                status: 'completed',
                payment_method: method,
                payment_status: 'confirmed',
                created_at: new Date().toISOString()
            };

            // Attempt order creation via server API
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const response = await apiFetch('/api/orders/create', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        vendor_id: vendorId,
                        items: combinedItems,
                        total: totalAmountWithTax,
                        payment_method: method,
                        payment_status: 'confirmed',
                        customer_name: customerName.trim() || 'Customer',
                        customer_phone: customerPhone.trim() || ''
                    })
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    console.warn('Order API creation notice:', errData.error || response.statusText);
                }
            } catch (dbErr) {
                console.warn('Order API creation error:', dbErr);
            }

            // Persist locally in mockDb only during dev
            if (import.meta.env.DEV) {
                (mockDb.orders as any[]).push(newOrder);
            }

            setCompletedOrder(newOrder);
            setShowUpiModal(false);
        } catch (err: any) {
            console.error('Checkout error:', err);
            setCompletedOrder({
                id: 'ord_' + Date.now(),
                vendor_id: user?.id || 'v1',
                customer_name: customerName.trim() || 'R. Thangavelu',
                customer_phone: customerPhone.trim() || '',
                customer_address: customerAddress.trim() || undefined,
                vehicle_no: vehicleNo.trim() || undefined,
                eway_bill_no: ewayBillNo.trim() || undefined,
                items: [...cartItems.map(item => ({
                    productId: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    quantity: item.quantity,
                    unit: item.product.unit
                })), ...customCartItems],
                subtotal: subtotal,
                tax: taxAmount,
                tax_rate: taxRatePercent,
                total_amount: totalAmountWithTax,
                status: 'completed',
                payment_method: method,
                payment_status: 'confirmed',
                created_at: new Date().toISOString()
            });
            setShowUpiModal(false);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const generateWhatsAppLink = () => {
        if (!completedOrder) return '';
        const storeName = user?.storeName || 'K.V.SOMASUNDARAM SON';
        const customer = completedOrder.customer_name || 'R. Thangavelu';
        const sub = completedOrder.subtotal ?? subtotal;
        const tax = completedOrder.tax ?? taxAmount;
        const taxPct = completedOrder.tax_rate ?? taxRatePercent;
        const tot = completedOrder.total_amount ?? totalAmountWithTax;

        let msg = `🧾 *TAX INVOICE / ESTIMATE BILL*\n`;
        msg += `🪵 *${storeName.toUpperCase()}*\n`;
        if (user?.address) msg += `📍 ${user.address}\n`;
        if (user?.phone) msg += `📞 Ph: ${user.phone}\n`;
        if (user?.gstin || isTimberVendor) {
            msg += `GSTIN: *${user?.gstin || '33AJKPP5362R1ZG'}* | PAN: *${user?.pan || 'AJKPP5362R'}* | HSN: *${user?.hsnCode || '4407'}*\n`;
        }
        msg += `──────────────────────────\n`;
        msg += `👤 *Customer:* ${customer}\n`;
        if (completedOrder.customer_address || customerAddress) {
            msg += `📍 *Address:* ${completedOrder.customer_address || customerAddress}\n`;
        }
        if (completedOrder.vehicle_no || vehicleNo) {
            msg += `🚛 *Vehicle No:* ${completedOrder.vehicle_no || vehicleNo}\n`;
        }
        if (completedOrder.eway_bill_no || ewayBillNo) {
            msg += `📄 *E-Way Bill:* ${completedOrder.eway_bill_no || ewayBillNo}\n`;
        }
        msg += `📅 *Date:* ${new Date().toLocaleDateString('en-IN')} | *Bill #:* ${completedOrder.id}\n`;
        msg += `──────────────────────────\n`;
        msg += `📦 *ITEMS & MEASUREMENTS:*\n`;

        completedOrder.items.forEach((item: any) => {
            msg += `• *${item.name}*\n`;
            msg += `  ${item.quantity} ${item.unit || ''} × ₹${Number(item.price).toLocaleString('en-IN')} = ₹${Number(item.price * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
            if (item.specs) {
                msg += `  📐 ${item.specs}\n`;
            }
        });

        if (completedOrder.wood_specs) {
            msg += `📐 *Wood Specs:* ${completedOrder.wood_specs}\n`;
        }

        msg += `──────────────────────────\n`;
        msg += `Taxable Amount: ₹${Number(sub).toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
        if (taxPct === 18) {
            msg += `CGST (9%): ₹${(tax / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
            msg += `SGST (9%): ₹${(tax / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
        } else {
            msg += `Tax (${taxPct}%): ₹${Number(tax).toLocaleString('en-IN')}\n`;
        }
        msg += `──────────────────────────\n`;
        msg += `💰 *TOTAL AMOUNT: ₹${Number(tot).toLocaleString('en-IN', { maximumFractionDigits: 2 })}*\n`;
        msg += `──────────────────────────\n`;
        msg += `Thank you for your business! 🪵\n`;
        msg += `_Powered by Streetvend_`;

        const rawPhoneNum = completedOrder.customer_phone ? completedOrder.customer_phone.replace(/\D/g, '') : '';
        let cleanPhoneNum = rawPhoneNum;
        if (cleanPhoneNum.startsWith('0')) {
            cleanPhoneNum = cleanPhoneNum.substring(1);
        }
        const waPhone = cleanPhoneNum ? (cleanPhoneNum.length === 10 ? '91' + cleanPhoneNum : cleanPhoneNum) : '';
        return `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
    };

    const handlePrint = () => {
        if (!hasFeature('print_bill')) {
            setShowPrintUpgradeModal(true);
            return;
        }

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
        <div className="min-h-screen bg-bg-base text-text-primary pt-24 px-4 sm:px-6 lg:px-8 font-sans" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
            <div className="max-w-7xl mx-auto">
                {/* Header matching screenshot */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-text-primary mb-2">
                            Cart & Billing
                        </h1>
                        <p className="text-text-secondary text-xs sm:text-base font-normal">
                            Add products, create bills, and send via WhatsApp.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowTaxBillsModal(true)}
                        className="px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start md:self-auto"
                    >
                        <FileText className="w-4 h-4" />
                        <span>📜 Customer Tax Bills (1-Yr Downloads)</span>
                    </button>
                </div>

                {!user?.upiId && (
                    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Add your UPI ID to accept digital payments via QR code at checkout. Cash-only billing is still active.
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setQuickUpiInput(user?.upiId || '');
                                setShowUpiSetupModal(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow shrink-0 transition-colors"
                        >
                            Add UPI ID Now
                        </button>
                    </div>
                )}

                {completedOrder ? (
                    <div className="max-w-xl mx-auto bg-bg-surface rounded-[2.5rem] p-6 sm:p-10 border border-border-subtle shadow-2xl text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <Check className="w-8 h-8" />
                        </div>
                        <h2 className="no-print font-display font-bold text-2xl sm:text-3xl text-text-primary mb-1">Bill Generated!</h2>
                        <p className="no-print text-text-tertiary text-xs sm:text-sm mb-6">Order #{completedOrder.id} successfully processed.</p>

                        {/* WhatsApp Receipt Box with Timber & Tax Invoice support */}
                        <div id="printable-receipt" className="printable-area bg-accent-green/20 text-text-primary rounded-[1.75rem] p-6 sm:p-8 font-sans shadow-2xl border border-accent-green/30 text-left relative overflow-hidden mb-8 space-y-3">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-text-primary font-bold text-lg sm:text-xl tracking-tight">
                                        <span className="text-accent-green">🪵</span>
                                        <span>{user?.storeName || completedOrder.vendor_name || 'K.V.SOMASUNDARAM SON'}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-extrabold bg-accent-green/30 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded border border-accent-green/40">
                                        ESTIMATE / INVOICE
                                    </span>
                                </div>
                                <p className="text-xs text-text-secondary mt-0.5 font-medium">
                                    {user?.address || '1-A, Modachur Road, Gobi - 638476, Erode (Dt)'}
                                </p>
                                <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                                    GSTIN: <strong className="text-text-secondary">{user?.gstin || '33AJKPP5362R1ZG'}</strong> | PAN: <strong className="text-text-secondary">{user?.pan || 'AJKPP5362R'}</strong> | HSN: <strong className="text-text-secondary">{user?.hsnCode || '4407'}</strong>
                                </p>
                            </div>

                            <div className="h-px bg-border-subtle my-2 w-full" />

                            {/* Customer & Transport details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary bg-bg-surface-inset/50 p-3 rounded-xl border border-border-subtle">
                                <div>
                                    <span className="text-text-tertiary block text-[10px] uppercase font-extrabold tracking-wider">Customer</span>
                                    <strong className="text-text-primary text-sm font-bold">{completedOrder.customer_name || 'R. Thangavelu'}</strong>
                                    {completedOrder.customer_phone && <p className="text-[11px] text-text-tertiary">{completedOrder.customer_phone}</p>}
                                    {completedOrder.customer_address && <p className="text-[11px] text-text-tertiary mt-0.5">📍 {completedOrder.customer_address}</p>}
                                </div>
                                <div className="space-y-0.5 text-right sm:text-right">
                                    <span className="text-text-tertiary block text-[10px] uppercase font-extrabold tracking-wider">Transport & Ref</span>
                                    {completedOrder.vehicle_no && <p className="text-[11px] text-text-secondary">🚛 Vehicle: <strong>{completedOrder.vehicle_no}</strong></p>}
                                    {completedOrder.eway_bill_no && <p className="text-[11px] text-text-secondary">📄 E-Way: <strong>{completedOrder.eway_bill_no}</strong></p>}
                                    <p className="text-[10px] text-text-tertiary font-mono">Bill #{completedOrder.id}</p>
                                </div>
                            </div>

                            <div className="space-y-2 font-normal text-text-primary text-xs sm:text-sm leading-relaxed my-3">
                                <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-widest block">Items & Measurements</span>
                                {completedOrder.items.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-bg-surface/60 p-2.5 rounded-xl border border-border-subtle">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-text-primary">• {item.name}</span>
                                                <span className="text-xs text-text-tertiary block font-mono">
                                                    {item.quantity} {item.unit || ''} × ₹{Number(item.price).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <span className="font-extrabold text-text-primary text-sm font-mono">
                                                ₹{Number(item.price * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        {item.specs && (
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-1 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                                                📐 {item.specs}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {completedOrder.wood_specs && !completedOrder.items.some((i: any) => i.specs) && (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-700 dark:text-amber-300">
                                        📐 Wood Specs: {completedOrder.wood_specs}
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-border-subtle my-2 w-full" />

                            <div className="space-y-1 text-text-secondary text-xs sm:text-sm font-mono">
                                <div className="flex justify-between items-center">
                                    <span>Taxable Subtotal:</span>
                                    <span>₹{Number(completedOrder.subtotal ?? subtotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                                {(completedOrder.tax_rate === 18 || taxRatePercent === 18) ? (
                                    <>
                                        <div className="flex justify-between items-center text-[11px] text-text-tertiary">
                                            <span>CGST (9%):</span>
                                            <span>₹{((completedOrder.tax ?? taxAmount) / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] text-text-tertiary">
                                            <span>SGST (9%):</span>
                                            <span>₹{((completedOrder.tax ?? taxAmount) / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <span>GST Tax ({completedOrder.tax_rate || taxRatePercent}%):</span>
                                        <span>₹{Number(completedOrder.tax ?? taxAmount).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center font-bold text-text-primary text-base sm:text-lg pt-1 font-sans">
                                    <span>TOTAL AMOUNT:</span>
                                    <span className="text-brand-500 font-display font-extrabold text-xl">
                                        ₹{Number(completedOrder.total_amount ?? totalAmountWithTax).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="h-px bg-border-subtle my-3.5 w-full" />

                            <div className="flex justify-between items-end text-text-tertiary text-xs sm:text-sm pt-1">
                                <div>
                                    <p className="font-semibold text-text-secondary flex items-center gap-1">
                                        Thank you for your business! <span className="text-accent-green">🪵</span>
                                    </p>
                                    <p className="text-text-tertiary italic font-medium text-xs mt-0.5">
                                        Powered by Streetvend Intelligence POS
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
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-accent-green hover:bg-opacity-90 text-white font-bold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer"
                            >
                                <MessageSquare className="w-4 h-4" /> Send via WhatsApp
                            </button>
                            <button
                                onClick={() => setShowPaperBillModal(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-950/20 hover:bg-red-950/30 border border-red-900/40 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                            >
                                <Receipt className="w-4 h-4 text-red-600 dark:text-red-400" /> View Paper Bill #25
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-widest hover:border-brand-500 transition-all cursor-pointer"
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
                    <div className="relative pb-24 lg:pb-0">
                        {/* Mobile Segmented View Switcher */}
                        <div className="lg:hidden flex items-center p-1 bg-bg-surface border border-border-subtle rounded-2xl mb-6 shadow-md">
                            <button
                                type="button"
                                onClick={() => setMobileTab('catalog')}
                                className={cn(
                                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
                                    mobileTab === 'catalog'
                                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                                        : "text-text-secondary hover:text-text-primary"
                                )}
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Catalog ({activeProducts.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileTab('bill')}
                                className={cn(
                                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer relative",
                                    mobileTab === 'bill'
                                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                                        : "text-text-secondary hover:text-text-primary"
                                )}
                            >
                                <Receipt className="w-4 h-4" />
                                <span>Current Bill</span>
                                {totalItems > 0 && (
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-black",
                                        mobileTab === 'bill' ? "bg-white text-brand-500" : "bg-brand-500 text-white"
                                    )}>
                                        {totalItems}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
                            {/* Left: Products Section */}
                            <div className={cn("lg:col-span-7 space-y-6", mobileTab === 'catalog' ? 'block' : 'hidden lg:block')}>
                                {/* Section Header & Action Tabs Bar */}
                                <div className="bg-bg-surface p-3 sm:p-3.5 rounded-2xl border border-border-subtle shadow-sm">
                                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                                        {/* Products Catalog Label Badge */}
                                        <div className="flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary shrink-0">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag className="w-4 h-4 text-brand-500" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Products Catalog</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-500 text-[11px] font-extrabold font-mono">
                                                {activeProducts.length}
                                            </span>
                                        </div>

                                        {/* Action Tabs Row - Responsive CSS Grid with equal sizing & spacing */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 lg:max-w-xl">
                                            <button
                                                type="button"
                                                onClick={() => setShowPaperBillModal(true)}
                                                className="w-full h-11 px-3 py-2 rounded-xl bg-red-950/15 hover:bg-red-950/30 dark:bg-red-950/30 dark:hover:bg-red-950/50 border border-red-900/30 text-red-700 dark:text-red-400 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
                                                title="View exact paper bill replica from physical invoice #25 (K.V. Somasundaram Son)"
                                            >
                                                <Receipt className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                                                <span className="truncate">Paper Bill #25</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setShowTimberModal(true)}
                                                className="w-full h-11 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
                                            >
                                                <Calculator className="w-4 h-4 text-amber-500 shrink-0" />
                                                <span className="truncate">Timber Calc</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!isTierAtLeast(currentPlan, 'professional')) {
                                                        setUpgradeFeature({
                                                            name: 'AI Voice Billing',
                                                            tier: 'professional',
                                                            message: 'Speak items aloud in English or Hindi to bill customers 3x faster on busy counters. Available on Professional plan (₹299/mo) and above.'
                                                        });
                                                        setShowUpgradeModal(true);
                                                    } else {
                                                        setShowVoiceModal(true);
                                                    }
                                                }}
                                                className="w-full h-11 px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <Mic className="w-4 h-4 shrink-0" />
                                                <span className="truncate">Voice Billing</span>
                                                {!isTierAtLeast(currentPlan, 'professional') ? (
                                                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-extrabold uppercase shrink-0">
                                                        Pro
                                                    </span>
                                                ) : (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0"></span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Search & Category Filter Bar */}
                                <div className="space-y-3 bg-bg-surface p-4 rounded-2xl border border-border-subtle shadow-sm">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                                        <input
                                            type="text"
                                            placeholder="Search product name or category..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {categories.length > 1 && (
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer border",
                                                        selectedCategory === cat
                                                            ? "bg-brand-500/10 border-brand-500 text-brand-500"
                                                            : "bg-bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary"
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-bg-surface rounded-2xl border border-border-subtle">
                                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
                                        <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Loading catalog...</p>
                                    </div>
                                ) : activeProducts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-6 bg-bg-surface rounded-2xl border border-border-subtle text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 text-2xl mb-4">
                                            📦
                                        </div>
                                        <h3 className="font-bold text-lg text-text-primary mb-1">No products in your store catalog yet</h3>
                                        <p className="text-xs text-text-tertiary max-w-sm mb-6 leading-relaxed">
                                            Add items to your store catalog to start creating quick bills 
                                        </p>
                                        <button
                                            onClick={() => navigate('/products')}
                                            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Add Products Now
                                        </button>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 bg-bg-surface rounded-2xl border border-border-subtle text-center">
                                        <p className="text-sm font-semibold text-text-secondary">No products match your search query or filter.</p>
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
                                                                {getCategoryIcon(p.category)}
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
                                                                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all cursor-pointer min-h-[40px]"
                                                            >
                                                                Add to Cart
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-2 bg-bg-surface-inset border border-border-subtle rounded-xl p-1">
                                                                <button
                                                                    onClick={() => updateQuantity(p.id, -1)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-surface text-text-primary hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span className="w-6 text-center font-bold text-sm text-text-primary">{qty}</span>
                                                                <button
                                                                    onClick={() => updateQuantity(p.id, 1)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-surface text-text-primary hover:bg-brand-500 hover:text-white transition-colors cursor-pointer"
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

                            {/* Right Column: Current Bill */}
                            <div className={cn("lg:col-span-5 space-y-6", mobileTab === 'bill' ? 'block' : 'hidden lg:block')}>
                            {/* Current Bill Card matching screenshot */}
                            <div className="bg-bg-surface rounded-2xl p-6 border border-border-subtle shadow-2xl min-h-[220px] flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-bold text-xl text-text-primary">Current Bill</h2>
                                        <button
                                            type="button"
                                            onClick={handleLoadSampleTimberBill}
                                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                            title="Load sample timber merchant bill (R. Thangavelu Bill #25)"
                                        >
                                            <Sparkles className="w-3 h-3 text-amber-500" />
                                            <span>Load Sample Wood Bill</span>
                                        </button>
                                    </div>

                                    {cartItems.length === 0 && customCartItems.length === 0 ? (
                                        <div className="text-center py-12 text-text-tertiary font-medium text-sm">
                                            Cart is empty. Select catalog items or use the Timber Calculator.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                                {/* Catalog Items */}
                                                {cartItems.map(item => (
                                                    <div key={item.product.id} className="flex items-center justify-between bg-bg-surface-inset p-3 rounded-xl border border-border-subtle">
                                                        <div>
                                                            <h4 className="font-bold text-sm text-text-primary">{item.product.name}</h4>
                                                            <span className="text-xs text-brand-500 font-bold not-italic">₹{item.product.price} / {item.product.unit || 'pc'}</span>
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
                                                            <span className="font-sans font-bold text-sm text-brand-500 w-16 text-right not-italic">
                                                                ₹{item.product.price * item.quantity}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Custom Timber Items */}
                                                {customCartItems.map(item => (
                                                    <div key={item.id} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1.5 relative">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">🪵 Custom Timber Calculation</span>
                                                                    <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">Editable Rate</span>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={item.name}
                                                                    onChange={(e) => handleUpdateCustomItemName(item.id, e.target.value)}
                                                                    placeholder="Timber size description..."
                                                                    className="w-full px-2 py-1 rounded-lg bg-bg-surface border border-border-subtle font-bold text-xs text-text-primary focus:outline-none focus:border-amber-500"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveCustomItem(item.id)}
                                                                className="text-text-tertiary hover:text-red-500 p-1 shrink-0"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        {item.specs && (
                                                            <p className="text-[10px] text-text-secondary font-mono bg-bg-surface/70 p-1.5 rounded border border-border-subtle line-clamp-2">
                                                                {item.specs}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono pt-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-text-tertiary text-[11px] font-bold">{item.quantity} {item.unit} × ₹</span>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={item.price}
                                                                    onChange={(e) => handleUpdateCustomItemPrice(item.id, parseFloat(e.target.value))}
                                                                    className="w-28 px-2 py-1 rounded-lg bg-bg-surface border border-border-subtle font-mono font-bold text-xs text-text-primary focus:outline-none focus:border-amber-500"
                                                                    title="Click to edit fluctuating timber rate per unit"
                                                                />
                                                            </div>
                                                            <strong className="text-brand-500 font-bold font-sans text-sm ml-auto">
                                                                ₹{(item.price * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Customer & Timber Invoice Details */}
                                            <div className="space-y-2 pt-2 border-t border-border-subtle">
                                                <div className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary">Customer & Delivery Info</div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Customer Name (e.g. R. Thangavelu)"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                                    />
                                                    <input
                                                        type="tel"
                                                        placeholder="WhatsApp Phone (e.g. 9865016017)"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                                    />
                                                </div>

                                                <input
                                                    type="text"
                                                    placeholder="Customer Address (e.g. Sivagiri, Erode Dt.)"
                                                    value={customerAddress}
                                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                                />

                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Vehicle No (e.g. TN-70J-6881)"
                                                        value={vehicleNo}
                                                        onChange={(e) => setVehicleNo(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="E-Way Bill No (Optional)"
                                                        value={ewayBillNo}
                                                        onChange={(e) => setEwayBillNo(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-xl bg-bg-surface-inset border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:border-brand-500 placeholder:text-text-tertiary"
                                                    />
                                                </div>
                                            </div>

                                            {/* GST Tax Rate Selector */}
                                            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                                                <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">GST Rate</span>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTaxRatePercent(18)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                                            taxRatePercent === 18 ? "bg-amber-500 text-white border-amber-500" : "bg-bg-surface-inset border-border-subtle text-text-tertiary"
                                                        )}
                                                    >
                                                        18% (Timber/Wood)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTaxRatePercent(5)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                                            taxRatePercent === 5 ? "bg-brand-500 text-white border-brand-500" : "bg-bg-surface-inset border-border-subtle text-text-tertiary"
                                                        )}
                                                    >
                                                        5% (General)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Payment Method Selector */}
                                            <div className="pt-2 border-t border-border-subtle space-y-2">
                                                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                                                    Payment Method
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!user?.upiId) {
                                                                setQuickUpiInput('');
                                                                setShowUpiSetupModal(true);
                                                            } else {
                                                                setPaymentMode('upi');
                                                             }
                                                        }}
                                                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                                            paymentMode === 'upi'
                                                                ? 'bg-brand-500/15 border-brand-500 text-brand-500 shadow-sm'
                                                                : 'bg-bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary'
                                                        }`}
                                                    >
                                                        <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                                        <span>UPI QR Code</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentMode('cash')}
                                                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                                            paymentMode === 'cash'
                                                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-sm'
                                                                : 'bg-bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary'
                                                        }`}
                                                    >
                                                        <span className="shrink-0">💵</span>
                                                        <span>Cash</span>
                                                    </button>
                                                </div>

                                                {/* Active UPI ID Info */}
                                                {paymentMode === 'upi' && (
                                                    <div className="p-2.5 rounded-xl bg-bg-surface-inset border border-border-subtle flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                                            <span className="text-text-tertiary font-mono truncate">
                                                                UPI: <strong className="text-text-primary font-bold">{user?.upiId || 'Not set'}</strong>
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setQuickUpiInput(user?.upiId || '');
                                                                setShowUpiSetupModal(true);
                                                            }}
                                                            className="text-[11px] font-bold text-brand-500 hover:underline shrink-0 ml-2"
                                                        >
                                                            {user?.upiId ? 'Edit' : '+ Add UPI'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Subtotal & Tax */}
                                            <div className="pt-3 border-t border-border-subtle space-y-1 text-xs text-text-secondary">
                                                <div className="flex justify-between">
                                                    <span>Taxable Subtotal:</span>
                                                    <span className="font-sans font-bold text-brand-500 not-italic">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>GST Tax ({taxRatePercent}%):</span>
                                                    <span className="font-sans font-bold text-brand-500 not-italic">₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-text-primary text-base pt-1">
                                                    <span>TOTAL BILL:</span>
                                                    <span className="text-brand-500 font-sans font-extrabold not-italic text-lg">
                                                        ₹{totalAmountWithTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleCheckout}
                                                disabled={isCheckingOut}
                                                className={`w-full text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 ${
                                                    paymentMode === 'upi'
                                                        ? 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                                }`}
                                            >
                                                {isCheckingOut ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : paymentMode === 'upi' ? (
                                                    <>
                                                        <CreditCard className="w-4 h-4" />
                                                        Show UPI QR Code (₹{totalAmountWithTax})
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        Complete Cash Bill (₹{totalAmountWithTax})
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Mobile Bottom Bar when viewing Catalog with Items */}
                        {mobileTab === 'catalog' && cartItems.length > 0 && (
                            <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-bg-surface/95 backdrop-blur-xl border-t border-border-subtle shadow-2xl z-40 lg:hidden flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                                        {totalItems} item{totalItems > 1 ? 's' : ''} added
                                    </div>
                                    <div className="font-sans font-extrabold text-lg text-brand-500 not-italic">
                                        ₹{totalAmountWithTax}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileTab('bill')}
                                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>Review & Charge</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* UPI QR Payment Modal */}
            {showUpiModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
                    <div className="bg-bg-surface rounded-t-[2rem] sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-border-subtle shadow-2xl text-center space-y-4 relative animate-in fade-in zoom-in-95 my-0 sm:my-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
                        <button
                            onClick={() => setShowUpiModal(false)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bg-surface-inset flex items-center justify-center text-text-secondary hover:text-text-primary shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        {upiPaymentStatus === 'waiting' ? (
                            <>
                                <div className="w-12 h-12 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-pulse">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-text-primary">Scan to Pay via UPI</h3>
                                    <p className="text-xs text-text-secondary mt-0.5">Scan with GPay, PhonePe, Paytm or any UPI app</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-border-subtle mx-auto">
                                    {upiQrUrl && <img src={upiQrUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto" />}
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-brand-500 font-sans">₹{totalAmountWithTax}</div>
                                    <div className="text-[11px] text-text-tertiary mt-1 font-mono">UPI ID: {user?.upiId}</div>
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-bold animate-pulse">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                        Waiting for payment scan...
                                    </div>
                                </div>
                                <div className="pt-2 flex flex-col gap-2">
                                    {user && (
                                        <button
                                            onClick={handleConfirmPaymentReceived}
                                            disabled={isCheckingOut}
                                            className="w-full min-h-[48px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                                        >
                                            <Check className="w-4 h-4" />
                                            Confirm Payment Received
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowUpiModal(false)}
                                        className="w-full min-h-[44px] py-2.5 rounded-xl bg-bg-surface-inset hover:bg-bg-base text-text-secondary font-bold text-xs cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="py-8 space-y-4">
                                <div className="w-16 h-16 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                                    <Check className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-xl text-text-primary">Payment Received! 🎉</h3>
                                    <p className="text-xs text-text-secondary mt-1">₹{totalAmountWithTax} successfully credited to {user?.upiId}</p>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs font-bold text-brand-500 pt-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating bill & sending options...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* UPI Setup Modal */}
            {showUpiSetupModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
                    <div className="bg-bg-surface rounded-t-[2rem] sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-border-subtle shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 my-0 sm:my-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
                        <button
                            onClick={() => setShowUpiSetupModal(false)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bg-surface-inset flex items-center justify-center text-text-secondary hover:text-text-primary shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 pr-8">
                            <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-text-primary">Setup Business UPI</h3>
                                <p className="text-xs text-text-secondary">Required for digital UPI QR code payments</p>
                            </div>
                        </div>
                        <form onSubmit={handleSaveQuickUpi} className="space-y-3 pt-2">
                            <div>
                                <label className="block text-[11px] font-bold text-text-secondary mb-1">Your UPI ID</label>
                                <input
                                    type="text"
                                    inputMode="text"
                                    autoCapitalize="none"
                                    placeholder="e.g. dosapoint@okaxis"
                                    value={quickUpiInput}
                                    onChange={(e) => setQuickUpiInput(e.target.value)}
                                    className="w-full px-3.5 py-3 min-h-[48px] rounded-xl bg-bg-base border border-border-subtle text-text-primary text-sm font-medium focus:outline-none focus:border-brand-500"
                                    autoFocus
                                />
                            </div>
                            {quickUpiError && <p className="text-[11px] text-red-500 font-bold">{quickUpiError}</p>}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={isSavingQuickUpi}
                                    className="flex-1 min-h-[48px] py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSavingQuickUpi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save & Use UPI
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowUpiSetupModal(false)}
                                    className="px-4 py-3 min-h-[48px] rounded-xl bg-bg-surface-inset hover:bg-bg-base text-text-secondary font-bold text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <UpgradeModal
                isOpen={showPrintUpgradeModal}
                onClose={() => setShowPrintUpgradeModal(false)}
                featureName="Print Thermal Bills"
                requiredTier="starter"
                message="Print physical customer receipts & bills on Bluetooth and thermal receipt printers. Upgrade to Starter (₹79/mo) or above to unlock physical bill printing."
            />

            <VoiceBillingModal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                onAddItemsToCart={handleAddVoiceItemsToCart}
                products={products}
                currentPlan={currentPlan}
                onUpgradeClick={() => {
                    setUpgradeFeature({
                        name: 'AI Voice Billing',
                        tier: 'professional',
                        message: 'Speak items naturally in English or Hindi to auto-add them to bills. Available on Professional plan (₹299/mo) and above.'
                    });
                    setShowUpgradeModal(true);
                }}
            />

            <TimberCalculatorModal
                isOpen={showTimberModal}
                onClose={() => setShowTimberModal(false)}
                onAddTimberItem={handleAddTimberItemToCart}
            />

            <TimberInvoiceReplicaModal
                isOpen={showPaperBillModal}
                onClose={() => {
                    setShowPaperBillModal(false);
                    setSelectedReplicaOrder(null);
                }}
                orderData={selectedReplicaOrder}
            />

            <CustomerTaxBillsModal
                isOpen={showTaxBillsModal}
                onClose={() => setShowTaxBillsModal(false)}
                vendorId={user?.id}
                isAdmin={false}
                onViewBillReplica={(order) => {
                    setSelectedReplicaOrder(order);
                    setShowPaperBillModal(true);
                }}
            />

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName={upgradeFeature.name}
                requiredTier={upgradeFeature.tier}
                message={upgradeFeature.message}
            />
        </div>
    );
}
