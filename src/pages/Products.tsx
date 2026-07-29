import React, { useState, useEffect } from 'react';
import { supabase, mapProductFromDb, mockDb } from '../lib/supabase';
import { Product } from '../lib/database.types';
import { useAuth } from '../lib/auth';
import { Package, Plus, Trash2, Edit2, Check, X, Search, Loader2, AlertCircle, RefreshCw, Lock, ScanLine, Camera, Barcode, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from '../components/UpgradeModal';
import QuickAddModal from '../components/QuickAddModal';
import AutoReorderSection from '../components/AutoReorderSection';
import StockPredictionWidget from '../components/StockPredictionWidget';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
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

    // Barcode scanner states
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isModalScannerOpen, setIsModalScannerOpen] = useState(false);
    const [scannedNotification, setScannedNotification] = useState<string | null>(null);

    // Canonical Product Duplicate Detection States
    const [canonicalProducts, setCanonicalProducts] = useState<{name: string, aliases: string[]}[]>(CANONICAL_MOCK_PRODUCTS);
    const [matchedCanonical, setMatchedCanonical] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, [user]);

    useEffect(() => {
        async function fetchCanonical() {
            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from('canonical_products')
                        .select('name, aliases');
                    if (data && !error && data.length > 0) {
                        setCanonicalProducts(data);
                    }
                } catch (e) {
                    console.error("Failed to load canonical products from Supabase:", e);
                }
            }
        }
        fetchCanonical();
    }, []);

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

    async function fetchProducts() {
        setIsLoading(true);
        setLoadError(null);
        try {
            const vendorId = user?.id;
            if (!vendorId) {
                setProducts([]);
                setIsLoading(false);
                return;
            }
            if (supabase) {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('vendor_id', vendorId);

                if (error) {
                    console.error('Error fetching products from Supabase:', error);
                    setLoadError(error.message || 'Failed to load products');
                    setProducts([]);
                } else if (data) {
                    setProducts(data.map(mapProductFromDb));
                } else {
                    setProducts([]);
                }
            } else {
                const vendorProds = mockDb.products.filter(p => p.vendorId === vendorId);
                setProducts(vendorProds as Product[]);
            }
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

    const handleMainScan = (scannedCode: string) => {
        const found = products.find(p => (p.barcode && p.barcode.trim() === scannedCode.trim()) || p.id === scannedCode);
        if (found) {
            setSearchQuery(found.name);
            setScannedNotification(`Barcode matched product: "${found.name}" (₹${found.price})`);
        } else {
            setSearchQuery(scannedCode);
            setScannedNotification(`No product matched barcode "${scannedCode}". Opening Add Product modal with barcode pre-filled.`);
            openAddModalWithBarcode(scannedCode);
        }
    };

    const openAddModalWithBarcode = (code: string) => {
        if (!canAddProduct(products.length)) {
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
        setBarcode(code);
        setType('product');
        setErrorMsg('');
        setShowModal(true);
    };

    function openAddModal() {
        openAddModalWithBarcode('');
    }

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
                    const { error } = await (supabase.from('products') as any).update({
                        name: name.trim(),
                        price: parseFloat(price),
                        unit,
                        category,
                        stock_qty: type === 'service' ? 0 : (parseInt(stock) || 0),
                        barcode: barcode.trim() || null,
                        type,
                        in_stock: type === 'service' || (parseInt(stock) || 0) > 0,
                        updated_at: new Date().toISOString()
                    }).eq('id', editingProduct.id);

                    if (error) throw error;
                } else {
                    const newId = 'p_' + Math.random().toString(36).substring(2, 9);
                    const { error } = await (supabase.from('products') as any).insert({
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
                    });

                    if (error) throw error;
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

            setShowModal(false);
            await fetchProducts();
        } catch (err: any) {
            console.error('Error saving product:', err);
            setErrorMsg(err.message || 'Failed to save product');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        if (supabase) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) {
                alert('Failed to delete: ' + error.message);
                return;
            }
        } else {
            mockDb.products = mockDb.products.filter(p => p.id !== id);
        }
        setProducts(prev => prev.filter(p => p.id !== id));
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
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {hasTemplates && (
                        <button
                            onClick={() => setShowQuickAddModal(true)}
                            className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-bg-surface border border-brand-500/30 text-brand-500 font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-brand-500/5 active:scale-95 transition-all w-full md:w-auto min-h-[44px]"
                        >
                            <ShoppingBag className="w-5 h-5" /> Quick Add Templates
                        </button>
                    )}
                    <button
                        onClick={openAddModal}
                        className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl primary-button-gradient text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto min-h-[44px]"
                    >
                        <Plus className="w-5 h-5" /> Add Product
                    </button>
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
                        onClick={fetchProducts}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider hover:bg-amber-500/30 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                </div>
            )}

            {/* Scanned notification banner */}
            {scannedNotification && (
                <div className="mb-6 p-4 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-bold flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-brand-500 shrink-0" />
                        <span>{scannedNotification}</span>
                    </div>
                    <button
                        onClick={() => setScannedNotification(null)}
                        className="text-text-tertiary hover:text-text-primary p-1"
                    >
                        <X className="w-4 h-4" />
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
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        title="Scan Barcode to Lookup Product"
                        className="px-4 py-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-500 hover:bg-brand-500 hover:text-white transition-all font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
                    >
                        <Camera className="w-4 h-4" />
                        <span className="hidden xs:inline">Scan Barcode</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                                selectedCategory === cat
                                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                                    : "bg-bg-surface text-text-secondary border border-border-subtle hover:border-brand-500/30"
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
                                    onClick={() => handleDelete(p.id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                    title="Delete Product"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl">
                    <div className="bg-bg-surface rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-8 border border-border-subtle shadow-2xl relative mt-auto sm:mt-0">
                        <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-bg-base text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="font-display font-bold text-2xl text-text-primary mb-6">
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </h3>

                        {errorMsg && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="flex gap-2 p-1 bg-bg-base rounded-2xl border border-border-subtle mb-4">
                                <button
                                    type="button"
                                    onClick={() => setType('product')}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                        type === 'product' ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "text-text-tertiary hover:text-text-primary"
                                    )}
                                >
                                    Product
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('service')}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
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
                                    className="w-full px-4 py-3.5 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-sm"
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
                                            className="self-start px-3 py-1.5 rounded-lg bg-brand-500 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-brand-600 active:scale-95 transition-all shadow-sm"
                                        >
                                            Yes, use {matchedCanonical}
                                        </button>
                                    </motion.div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Price (₹)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        required
                                        placeholder="50"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Unit</label>
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-sm"
                                    >
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

                            <div className={cn("grid gap-4", type === 'product' ? "grid-cols-2" : "grid-cols-1")}>
                                <div>
                                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Category</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Snacks, Drinks, etc."
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-sm"
                                    />
                                </div>
                                {type === 'product' && (
                                    <div>
                                        <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Stock Qty</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="50"
                                            value={stock}
                                            onChange={(e) => setStock(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium focus:outline-none focus:border-brand-500 transition-colors text-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {type === 'product' && (
                                <div>
                                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">Barcode / EAN (Optional)</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                                            <input
                                                type="text"
                                                placeholder="e.g. 8901234567890"
                                                value={barcode}
                                                onChange={(e) => setBarcode(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-mono text-sm focus:outline-none focus:border-brand-500 transition-colors"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsModalScannerOpen(true)}
                                            className="px-4 py-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-500 hover:bg-brand-500 hover:text-white transition-all font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                                        >
                                            <Camera className="w-4 h-4" />
                                            <span>Scan</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-widest hover:bg-bg-surface transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-4 rounded-2xl primary-button-gradient text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editingProduct ? 'Save Changes' : 'Add Product'}
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

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="Unlimited Catalog Products"
                requiredTier="starter"
                message="Free tier allows up to 20 products in your catalog. Upgrade to Starter (₹299/mo) or higher to manage unlimited products."
            />

            {/* Header / Lookup Barcode Scanner */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleMainScan}
                title="Scan Barcode to Lookup Product"
            />

            {/* Modal Input Barcode Scanner */}
            <BarcodeScannerModal
                isOpen={isModalScannerOpen}
                onClose={() => setIsModalScannerOpen(false)}
                onScan={(code) => setBarcode(code)}
                title="Scan Barcode for Product Form"
            />
        </div>
    );
}
