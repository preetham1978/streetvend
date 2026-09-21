import React, { useState, useEffect } from 'react';
import { supabase, mapProductFromDb, mockDb } from '../lib/supabase';
import { getVendorProducts, invalidateCache } from '../lib/dataCache';
import { Product } from '../lib/database.types';
import { useAuth } from '../lib/auth';
import { Package, Plus, Trash2, Edit2, Check, X, Search, Loader2, AlertCircle, RefreshCw, Lock, ScanLine, Camera, Barcode, ShoppingBag, Save, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlanLimits, PlanTier, isTierAtLeast } from '../hooks/usePlanLimits';
import UpgradeModal from '../components/UpgradeModal';
import QuickAddModal from '../components/QuickAddModal';
import ConfirmModal from '../components/ConfirmModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import AutoReorderSection from '../components/AutoReorderSection';
import StockPredictionWidget from '../components/StockPredictionWidget';
import { motion } from 'motion/react';
import { PRODUCT_TEMPLATES } from '../config/productTemplates';

// Indian Street Vendor Canonical Products & Aliases
const CANONICAL_MOCK_PRODUCTS = [
    { name: 'Pani Puri', aliases: ['Pani Puri', 'Puchka', 'Golgappa', 'Gol Gappa', 'Panipuri'] },
    { name: 'Masala Dosa', aliases: ['Masala Dosa', 'Dosa', 'Plain Dosa', 'Sada Dosa'] },
    { name: 'Chicken Tikka', aliases: ['Chicken Tikka', 'Chicken Kabab', 'Chicken Kebab', 'Chicken Tikka Kabab'] },
    { name: 'Basmati Rice', aliases: ['Basmati Rice', 'Rice', 'Chawal'] },
    { name: 'Samosa', aliases: ['Samosa', 'Shamosa', 'Singara'] },
    { name: 'Vada Pav', aliases: ['Vada Pav', 'Wada Pav', 'Vada Pao', 'Wada Pao'] },
    { name: 'Idli', aliases: ['Idli', 'Idly', 'Rava Idli'] },
    { name: 'Pav Bhaji', aliases: ['Pav Bhaji', 'Paov Bhaji', 'Pavbhaji'] },
    { name: 'Bhel Puri', aliases: ['Bhel Puri', 'Bhelpuri', 'Bhel'] },
    { name: 'Aloo Tikki', aliases: ['Aloo Tikki', 'Alu Tikki', 'Aaloo Tikky', 'Aloo Tikky'] },
    { name: 'Jalebi', aliases: ['Jalebi', 'Jalebee', 'Jelebi'] },
    { name: 'Biryani', aliases: ['Biryani', 'Biriyani', 'Biryani Rice'] },
    { name: 'Paneer Tikka', aliases: ['Paneer Tikka', 'Paneer Kabab', 'Paneer Kebab', 'Paneer Tikka Kabab'] },
    { name: 'Filter Coffee', aliases: ['Filter Coffee', 'Kaapi', 'Coffee'] },
    { name: 'Chai', aliases: ['Chai', 'Tea', 'Masala Chai'] }
];

// Fuzzy Matching Helper Functions
function getLevenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    const lenA = a.length;
    const lenB = b.length;

    for (let i = 0; i <= lenA; i++) matrix[i] = [i];
    for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

    for (let i = 1; i <= lenA; i++) {
        for (let j = 1; j <= lenB; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // deletion
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[lenA][lenB];
}

function getStringSimilarity(s1: string, s2: string): number {
    const str1 = s1.trim().toLowerCase();
    const str2 = s2.trim().toLowerCase();

    if (str1 === str2) return 1.0;
    if (str1.includes(str2) || str2.includes(str1)) {
        return 0.85;
    }

    const distance = getLevenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    return (maxLength - distance) / maxLength;
}

export default function ProductsPage() {
    const { user } = useAuth();
    const { canAddProduct, config: planConfig, currentPlan } = usePlanLimits();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // Add/Edit Modal state
    const [showModal, setShowModal] = useState(false);
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('piece');
    const [category, setCategory] = useState('Snacks');
    const [stock, setStock] = useState('50');
    const [barcode, setBarcode] = useState('');
    const [type, setType] = useState<'product' | 'service'>('product');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Delete modal states
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

    // Barcode scanner states
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
    const [upgradeFeature, setUpgradeFeature] = useState<{ name: string; tier: PlanTier; message: string }>({
        name: 'Unlimited Catalog Products',
        tier: 'starter',
        message: 'Free tier allows up to 20 products in your catalog. Upgrade to Starter (₹79/mo) or higher to manage unlimited products.'
    });

    const handleScanSuccess = (
        scannedBarcode: string,
        prefilled?: { name?: string; price?: number; category?: string; unit?: string; stock?: number; isExisting?: boolean }
    ) => {
        setBarcode(scannedBarcode);
        if (prefilled) {
            if (prefilled.name) setName(prefilled.name);
            if (prefilled.price !== undefined) setPrice(prefilled.price.toString());
            if (prefilled.category) setCategory(prefilled.category);
            if (prefilled.unit) setUnit(prefilled.unit);
            if (prefilled.stock !== undefined) setStock(prefilled.stock.toString());
        }
        setScanSuccessMessage(`Barcode ${scannedBarcode} scanned! Review product details below and click Save Product.`);
        setShowModal(true);
    };

    // Canonical Product Duplicate Detection States
    const [canonicalProducts, setCanonicalProducts] = useState<{name: string, aliases: string[]}[]>(CANONICAL_MOCK_PRODUCTS);
    const [matchedCanonical, setMatchedCanonical] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, [user]);

    const handleNameChange = (val: string) => {
        setName(val);
        if (!val.trim()) {
            setMatchedCanonical(null);
            return;
        }

        let bestMatch: string | null = null;
        let highestSim = 0;

        for (const item of canonicalProducts) {
            const simName = getStringSimilarity(val, item.name);
            if (simName > highestSim) {
                highestSim = simName;
                bestMatch = item.name;
            }

            if (item.aliases) {
                for (const alias of item.aliases) {
                    const simAlias = getStringSimilarity(val, alias);
                    if (simAlias > highestSim) {
                        highestSim = simAlias;
                        bestMatch = item.name;
                    }
                }
            }
        }

        if (highestSim >= 0.7 && bestMatch && bestMatch.toLowerCase() !== val.trim().toLowerCase()) {
            setMatchedCanonical(bestMatch);
        } else {
            setMatchedCanonical(null);
        }
    };

    const acceptCanonical = () => {
        if (matchedCanonical) {
            setName(matchedCanonical);
            setMatchedCanonical(null);
        }
    };

    async function fetchProducts(forceRefresh = false) {
        setIsLoading(true);
        setLoadError(null);
        try {
            const vendorId = user?.id;
            if (!vendorId) {
                setProducts([]);
                setIsLoading(false);
                return;
            }
            const prods = await getVendorProducts(vendorId, forceRefresh);
            setProducts(prods);
        } catch (err: any) {
            console.error('Exception fetching products:', err);
            setLoadError(err.message || 'Failed to load products');
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = products.filter(p => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(query) || 
                              p.category.toLowerCase().includes(query) ||
                              (p.barcode && p.barcode.toLowerCase().includes(query));
        const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCat;
    });


    function openAddModal() {
        if (!canAddProduct(products.length)) {
            setUpgradeFeature({
                name: 'Unlimited Catalog Products',
                tier: 'starter',
                message: 'Free tier allows up to 20 products in your catalog. Upgrade to Starter (₹79/mo) or higher to manage unlimited products.'
            });
            setShowUpgradeModal(true);
            return;
        }
        setEditingProduct(null);
        setName('');
        setMatchedCanonical(null);
        setPrice('');
        setUnit('piece');
        setCategory('Snacks');
        setStock('50');
        setBarcode("");
        setType('product');
        setErrorMsg('');
        setScanSuccessMessage(null);
        setShowModal(true);
    };


    function openEditModal(prod: Product) {
        setEditingProduct(prod);
        setName(prod.name);
        setMatchedCanonical(null);
        setPrice(prod.price.toString());
        setUnit(prod.unit || 'piece');
        setCategory(prod.category);
        setStock(prod.stock.toString());
        setBarcode(prod.barcode || '');
        setType(prod.type || 'product');
        setErrorMsg('');
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !price) {
            setErrorMsg('Please enter product name and price.');
            return;
        }

        setIsSaving(true);
        setErrorMsg('');

        try {
            const vendorId = user?.id;
            if (!vendorId) {
                throw new Error('Authentication required. Please log in again.');
            }

            if (supabase) {
                try {
                    const vendorData = {
                        id: vendorId,
                        name: user?.storeName || 'Streetvend Partner',
                        owner_name: user?.ownerName || 'Vendor',
                        phone: user?.phone || '',
                        category: user?.category || 'Street Food',
                        subscription: user?.subscription || 'free',
                        is_active: true
                    };
                    await (supabase.from('vendors') as any).upsert([vendorData], { onConflict: 'id' });
                } catch (syncErr) {
                    console.warn("Minor: Vendor sync failed, attempting product save anyway:", syncErr);
                }

                if (editingProduct) {
                    const updatePayload: any = {
                        name: name.trim(),
                        price: parseFloat(price),
                        unit,
                        category,
                        stock_qty: type === 'service' ? 0 : (parseInt(stock) || 0),
                        barcode: barcode.trim() || null,
                        type,
                        in_stock: type === 'service' || (parseInt(stock) || 0) > 0,
                        updated_at: new Date().toISOString()
                    };

                    let { error } = await (supabase.from('products') as any).update(updatePayload).eq('id', editingProduct.id);

                    if (error && (error.message?.includes('type') || error.message?.includes('schema cache'))) {
                        delete updatePayload.type;
                        const res = await (supabase.from('products') as any).update(updatePayload).eq('id', editingProduct.id);
                        error = res.error;
                    }

                    if (error) throw error;
                } else {
                    const newId = 'p_' + Math.random().toString(36).substring(2, 9);
                    const insertPayload: any = {
                        id: newId,
                        vendor_id: vendorId,
                        name: name.trim(),
                        price: parseFloat(price),
                        unit,
                        category,
                        stock_qty: type === 'service' ? 0 : (parseInt(stock) || 50),
                        barcode: barcode.trim() || null,
                        type,
                        in_stock: true,
                        updated_at: new Date().toISOString()
                    };

                    let { error } = await (supabase.from('products') as any).insert(insertPayload);

                    if (error && (error.message?.includes('type') || error.message?.includes('schema cache'))) {
                        delete insertPayload.type;
                        const res = await (supabase.from('products') as any).insert(insertPayload);
                        error = res.error;
                    }

                    if (error && (
                        error.message?.includes('foreign key constraint') || 
                        error.message?.includes('products_vendor_id_fkey') || 
                        error.code === '23503'
                    )) {
                        console.warn("Supabase single product FK constraint, saving to local store instead:", error.message);
                        mockDb.products.push({
                            id: newId,
                            vendorId,
                            name: name.trim(),
                            price: parseFloat(price),
                            unit,
                            category,
                            stock: type === 'service' ? 0 : (parseInt(stock) || 50),
                            barcode: barcode.trim(),
                            type: type as any
                        });
                        error = null;
                    } else if (error) {
                        throw error;
                    }
                }
            } else {
                if (editingProduct) {
                    mockDb.products = mockDb.products.map(p => p.id === editingProduct.id ? {
                        ...p,
                        name: name.trim(),
                        price: parseFloat(price),
                        unit,
                        category,
                        stock: type === 'service' ? 0 : (parseInt(stock) || 0),
                        barcode: barcode.trim(),
                        type
                    } : p);
                } else {
                    const newId = 'p_' + Math.random().toString(36).substring(2, 9);
                    mockDb.products.push({
                        id: newId,
                        vendorId,
                        name: name.trim(),
                        price: parseFloat(price),
                        unit,
                        category,
                        stock: type === 'service' ? 0 : (parseInt(stock) || 50),
                        barcode: barcode.trim(),
                        type: type as any
                    });
                }
            }

            if (user?.id) {
                invalidateCache(`products:${user.id}`);
                invalidateCache(`ai_insight:${user.id}`);
            }
            setShowModal(false);
            await fetchProducts(true);
        } catch (err: any) {
            console.error('Error saving product:', err);
            setErrorMsg(err.message || 'Failed to save product');
        } finally {
            setIsSaving(false);
        }
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && productToDelete && !isDeleting) {
                setProductToDelete(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [productToDelete, isDeleting]);

    async function handleExecuteDelete() {
        if (!productToDelete) return;
        const id = String(productToDelete.id);
        setIsDeleting(true);
        setDeleteModalError(null);

        try {
            if (supabase) {
                const deletePromise = (supabase.from('products') as any).delete().eq('id', id);
                const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
                    setTimeout(() => reject(new Error("Database delete operation timed out")), 2500)
                );
                try {
                    const res: any = await Promise.race([deletePromise, timeoutPromise]);
                    if (res?.error) {
                        console.warn("Supabase delete error:", res.error);
                    }
                } catch (timeoutErr) {
                    console.warn("Supabase delete timed out, continuing with local inventory update:", timeoutErr);
                }
            }

            mockDb.products = mockDb.products.filter(p => String(p.id) !== id);

            if (user?.id) {
                invalidateCache(`products:${user.id}`);
                invalidateCache(`ai_insight:${user.id}`);
            }

            setProducts(prev => prev.filter(p => String(p.id) !== id));
            setProductToDelete(null);
        } catch (err: any) {
            console.error('Error deleting product:', err);
            setDeleteModalError(err.message || 'Failed to delete product. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    }

    const getTemplateCategory = (cat: string) => {
        if (!cat) return null;
        const normalized = cat.trim();
        // Exact match first
        if (PRODUCT_TEMPLATES[normalized]) return normalized;
        // Case-insensitive match
        const keys = Object.keys(PRODUCT_TEMPLATES);
        const match = keys.find(k => k.toLowerCase() === normalized.toLowerCase());
        if (match) return match;

        // Substring / fuzzy match
        const lower = normalized.toLowerCase();
        if (lower.includes('fruit') || lower.includes('veg') || lower.includes('produce')) return "Vegetables & Fruits";
        if (lower.includes('grocery') || lower.includes('kirana') || lower.includes('general') || lower.includes('store')) return "Groceries";
        if (lower.includes('dosa') || lower.includes('south') || lower.includes('idli') || lower.includes('tiffin')) return "South Indian";
        if (lower.includes('kebab') || lower.includes('kabab') || lower.includes('grill') || lower.includes('tandoor') || lower.includes('bbq')) return "Kebab & Grill";
        if (lower.includes('street') || lower.includes('food') || lower.includes('chaat') || lower.includes('vend')) return "Street Food";
        if (lower.includes('meat') || lower.includes('fish') || lower.includes('sea') || lower.includes('chicken') || lower.includes('mutton')) return "Meat & Seafood";
        if (lower.includes('laundry') || lower.includes('wash') || lower.includes('clean') || lower.includes('iron')) return "Laundry";
        if (lower.includes('key')) return "Key Maker";
        if (lower.includes('mobile') || lower.includes('acc') || lower.includes('phone')) return "Mobile Accessories";
        if (lower.includes('watch') || lower.includes('repair')) return "Watch Repair's";
        if (lower.includes('pan')) return "Pan Shop";
        if (lower.includes('fancy')) return "Fancy Store";
        if (lower.includes('station')) return "Stationery";
        
        return null;
    };

    const templateKey = user ? (getTemplateCategory(user.storeName) || getTemplateCategory(user.category)) : null;
    const hasTemplates = !!templateKey;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-bold text-xs uppercase tracking-widest mb-3">
                        <Package className="w-3.5 h-3.5" /> Inventory Management
                    </div>
                    <h1 className="font-display font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">Products & Stock</h1>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Primary Action First on Mobile */}
                    <div className="relative group w-full md:w-auto order-1 sm:order-3">
                        <button
                            onClick={openAddModal}
                            disabled={!canAddProduct(products.length)}
                            className={cn(
                                "flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl transition-all w-full min-h-[48px]",
                                canAddProduct(products.length)
                                    ? "primary-button-gradient text-white shadow-brand-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
                                    : "bg-bg-base border border-border-subtle text-text-tertiary cursor-not-allowed shadow-none"
                            )}
                        >
                            <Plus className="w-5 h-5 shrink-0" /> Add Product
                        </button>
                        {!canAddProduct(products.length) && (
                            <div className="absolute top-full mt-2 right-0 w-64 bg-bg-surface-inset border border-border-subtle rounded-xl p-3 text-xs text-text-secondary opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg text-center">
                                Free plan limit reached ({planConfig.maxProducts} products). Existing products are kept. Upgrade to add more.
                            </div>
                        )}
                    </div>

                    {/* Secondary Actions in 2-col grid on mobile, inline flex on desktop */}
                    <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto order-2 sm:order-1">
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3.5 sm:py-4 rounded-2xl bg-bg-surface border border-border-subtle hover:border-brand-500/50 text-text-primary font-bold text-xs uppercase tracking-wider shadow-md hover:bg-bg-surface-inset active:scale-95 transition-all w-full sm:w-auto min-h-[48px] cursor-pointer"
                        >
                            <Barcode className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500 shrink-0" />
                            <span className="truncate">Scan Barcode</span>
                            {!isTierAtLeast(currentPlan, 'professional') && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-extrabold uppercase shrink-0">
                                    Pro
                                </span>
                            )}
                        </button>

                        {hasTemplates && (
                            <button
                                onClick={() => setShowQuickAddModal(true)}
                                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3.5 sm:py-4 rounded-2xl bg-bg-surface border border-brand-500/30 text-brand-500 font-bold text-xs uppercase tracking-wider shadow-md hover:bg-brand-500/5 active:scale-95 transition-all w-full sm:w-auto min-h-[48px] cursor-pointer"
                            >
                                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                <span className="truncate">Quick Add</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Banner if load failed */}
            {loadError && (
                <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>Could not load live products ({loadError}). Showing cached inventory.</span>
                    </div>
                    <button
                        onClick={() => fetchProducts()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider hover:bg-amber-500/30 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                </div>
            )}


            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Search name, category, or barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-bg-surface border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0",
                                selectedCategory === cat
                                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                                    : "bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-500/50"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid / Table */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Loading products...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="bg-bg-surface rounded-3xl border border-border-subtle p-16 text-center shadow-xl">
                    <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4 opacity-30" />
                    <h3 className="font-bold text-lg text-text-primary uppercase tracking-widest mb-2">No products found</h3>
                    <p className="text-text-secondary text-sm mb-8">Add your first product to start taking orders and managing inventory.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {hasTemplates && (
                            <button
                                onClick={() => setShowQuickAddModal(true)}
                                className="px-8 py-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-500 font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-brand-500/20 transition-all flex items-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" /> Quick Add from Templates
                            </button>
                        )}
                        <button
                            onClick={openAddModal}
                            className="px-8 py-4 rounded-2xl primary-button-gradient text-white font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                        >
                            Add Custom Product
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((p) => (
                        <div key={p.id} className="bg-bg-surface rounded-3xl p-6 border border-border-subtle shadow-xl hover:border-brand-500/30 transition-all flex flex-col justify-between group">
                            <div>
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest bg-brand-500/10 px-2.5 py-1 rounded-full inline-block">
                                                {p.category}
                                            </span>
                                            {p.barcode && (
                                                <span className="text-[10px] font-mono font-bold text-text-tertiary bg-bg-base border border-border-subtle px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Barcode className="w-3 h-3 text-brand-500" />
                                                    {p.barcode}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-lg text-text-primary tracking-tight">{p.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-sans font-extrabold text-xl text-brand-500 not-italic">₹{p.price}</div>
                                        <span className="text-[10px] text-text-tertiary uppercase tracking-widest">per {p.unit || 'piece'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs font-medium text-text-secondary py-3 border-t border-border-subtle mb-4">
                                    {p.type === 'service' ? (
                                        <span className="text-text-tertiary italic">Service / Labor Only</span>
                                    ) : (
                                        <>
                                            <span>Stock Quantity: <strong className="text-brand-500 font-sans font-extrabold not-italic">{p.stock} {p.unit || 'piece'}(s)</strong></span>
                                            <span className={cn("px-2 py-0.5 rounded-full font-bold uppercase text-[9px]", p.stock > 0 ? "bg-accent-green/10 text-accent-green" : "bg-red-500/10 text-red-500")}>
                                                {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => openEditModal(p)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-base border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-widest hover:border-brand-500 transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-brand-500" /> Edit
                                </button>
                                <button
                                    type="button"
                                    data-testid="delete-btn-latest"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setProductToDelete(p);
                                        setDeleteModalError(null);
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer shrink-0 z-10 relative"
                                    title="Delete Product"
                                >
                                    <Trash2 className="w-4 h-4 pointer-events-none" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-bg-surface rounded-t-[2rem] sm:rounded-[2.5rem] w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] border border-border-subtle shadow-2xl relative flex flex-col overflow-hidden my-0 sm:my-auto">
                        
                        {/* Sticky Modal Header */}
                        <div className="p-5 sm:p-6 pb-4 border-b border-border-subtle shrink-0 flex items-center justify-between bg-bg-surface z-10">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mb-3 sm:hidden" />
                                <h3 className="font-display font-bold text-xl sm:text-2xl text-text-primary truncate">
                                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-11 h-11 flex items-center justify-center rounded-full bg-bg-base text-text-tertiary hover:text-text-primary transition-colors shrink-0 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form Body - Internal Scrollable Area */}
                        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                                {scanSuccessMessage && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                                            <span>{scanSuccessMessage}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setScanSuccessMessage(null)}
                                            className="p-1 text-text-tertiary hover:text-text-primary cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {errorMsg && (
                                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                                    </div>
                                )}

                                <div className="flex gap-2 p-1.5 bg-bg-base rounded-2xl border border-border-subtle">
                                    <button
                                        type="button"
                                        onClick={() => setType('product')}
                                        className={cn(
                                            "flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer",
                                            type === 'product' ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "text-text-tertiary hover:text-text-primary"
                                        )}
                                    >
                                        Product
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('service')}
                                        className={cn(
                                            "flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer",
                                            type === 'service' ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "text-text-tertiary hover:text-text-primary"
                                        )}
                                    >
                                        Service
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Item Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Masala Dosa, Pani Puri"
                                        value={name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className="w-full px-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-base"
                                    />
                                    {matchedCanonical && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-3 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-text-secondary flex flex-col gap-2.5 animate-fade-in"
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                                <span>
                                                    Are you adding <strong>{matchedCanonical}</strong>? We found a similar product. Using standard names helps with your customer catalog search.
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={acceptCanonical}
                                                className="self-start px-3 py-2 min-h-[44px] rounded-lg bg-brand-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-brand-600 active:scale-95 transition-all shadow-sm cursor-pointer"
                                            >
                                                Yes, use {matchedCanonical}
                                            </button>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Price (₹)</label>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.5"
                                            required
                                            placeholder="50"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full px-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Unit</label>
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="w-full px-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-base"
                                        >
                                            <option value="CBM">CBM (M.CUBM)</option>
                                            <option value="CFT">CFT (Cu.Ft)</option>
                                            <option value="sheet">Sheet</option>
                                            <option value="sqft">Sq.Ft</option>
                                            <option value="piece">Piece</option>
                                            <option value="plate">Plate</option>
                                            <option value="kg">Kg</option>
                                            <option value="g">Grams</option>
                                            <option value="packet">Packet</option>
                                            <option value="bottle">Bottle</option>
                                            <option value="litre">Litre</option>
                                            <option value="bunch">Bunch</option>
                                            <option value="service">Service</option>
                                            <option value="pair">Pair</option>
                                            <option value="set">Set</option>
                                            <option value="cup">Cup</option>
                                            <option value="dozen">Dozen</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={cn("grid gap-4", type === 'product' ? "grid-cols-1 min-[400px]:grid-cols-2" : "grid-cols-1")}>
                                    <div>
                                        <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Category</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Snacks, Drinks, etc."
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full px-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-base"
                                        />
                                    </div>
                                    {type === 'product' && (
                                        <div>
                                            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Stock Qty</label>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                required
                                                placeholder="50"
                                                value={stock}
                                                onChange={(e) => setStock(e.target.value)}
                                                className="w-full px-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-base"
                                            />
                                        </div>
                                    )}
                                </div>

                                {type === 'product' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest">Barcode / EAN (Optional)</label>
                                            <button
                                                type="button"
                                                onClick={() => setIsScannerOpen(true)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 font-bold text-xs transition-colors cursor-pointer"
                                            >
                                                <ScanLine className="w-4 h-4" /> Scan Camera
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="e.g. 8901234567890"
                                                    value={barcode}
                                                    onChange={(e) => setBarcode(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-mono text-base focus:outline-none focus:border-brand-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Modal Action Footer */}
                            <div className="p-4 sm:p-6 border-t border-border-subtle bg-bg-surface shrink-0 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6 z-10">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 min-h-[48px] py-3.5 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-widest hover:bg-bg-surface transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 min-h-[48px] py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {editingProduct ? 'Update Product' : 'Save Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Inventory Stock Prediction & Depletion Meter */}
            <div className="mt-12">
                <StockPredictionWidget products={products} />
            </div>

            {/* Enterprise Auto-Reorder & Inventory Engine */}
            <div className="mt-8">
                <AutoReorderSection products={products} />
            </div>

            {/* Quick Add Modal */}
            {user && templateKey && (
                <QuickAddModal
                    isOpen={showQuickAddModal}
                    onClose={() => setShowQuickAddModal(false)}
                    vendor={user}
                    templateKey={templateKey}
                    onSuccess={fetchProducts}
                    canAddProduct={canAddProduct}
                    currentProductCount={products.length}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!productToDelete}
                title="Delete Product"
                message={`Are you sure you want to delete ${productToDelete?.name}? This action cannot be undone.`}
                confirmLabel="Yes, Delete"
                cancelLabel="Cancel"
                danger={true}
                error={deleteModalError}
                onConfirm={handleExecuteDelete}
                onCancel={() => {
                    setProductToDelete(null);
                    setDeleteModalError(null);
                }}
            />

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
                existingProducts={products}
                currentPlan={currentPlan}
                onUpgradeClick={() => {
                    setUpgradeFeature({
                        name: 'AI Barcode Scanner',
                        tier: 'professional',
                        message: 'Barcode scanning (EAN-13, UPC-A, Code-128) is available on Professional plan (₹299/mo) and above.'
                    });
                    setShowUpgradeModal(true);
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
