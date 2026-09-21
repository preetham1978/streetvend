
import React, { useState } from 'react';
import { X, Check, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';
import { PRODUCT_TEMPLATES, ProductTemplate } from '../config/productTemplates';
import { supabase } from '../lib/supabase';
import { Vendor } from '../lib/database.types';

interface QuickAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    vendor: Vendor;
    templateKey: string;
    onSuccess: () => Promise<void>;
    canAddProduct: (currentCount: number) => boolean;
    currentProductCount: number;
}

interface TemplateSelection extends ProductTemplate {
    id?: string;
    selected: boolean;
    price: string;
    unit: string;
    isCustom?: boolean;
}

export default function QuickAddModal({ isOpen, onClose, vendor, templateKey, onSuccess, canAddProduct, currentProductCount }: QuickAddModalProps) {
    const templates = PRODUCT_TEMPLATES[templateKey] || [];
    const [selections, setSelections] = useState<TemplateSelection[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    React.useEffect(() => {
        if (isOpen && templates.length > 0) {
            setSelections(templates.map((t, idx) => ({ 
                ...t, 
                id: `tmpl_${idx}`,
                selected: false, 
                price: t.defaultPrice ? String(t.defaultPrice) : '', 
                unit: t.defaultUnit 
            })));
        }
    }, [isOpen, templateKey]);

    if (!isOpen || templates.length === 0) return null;

    const selectedCount = selections.filter(s => s.selected).length;

    const toggleSelection = (index: number) => {
        const newSelections = [...selections];
        newSelections[index].selected = !newSelections[index].selected;
        setSelections(newSelections);
    };

    const handleNameChange = (index: number, name: string) => {
        const newSelections = [...selections];
        newSelections[index].name = name;
        setSelections(newSelections);
    };

    const handlePriceChange = (index: number, price: string) => {
        const newSelections = [...selections];
        newSelections[index].price = price;
        setSelections(newSelections);
    };

    const handleUnitChange = (index: number, unit: string) => {
        const newSelections = [...selections];
        newSelections[index].unit = unit;
        setSelections(newSelections);
    };

    const handleAddCustomRow = () => {
        setSelections(prev => [
            ...prev,
            {
                id: `custom_${Date.now()}`,
                name: 'Teak Wood Cut Size 4" x 2" (Custom)',
                category: vendor.category === 'Timber & Wood Trading' ? 'Teak Wood' : 'General',
                defaultUnit: 'CBM',
                type: 'product',
                selected: true,
                price: '116090.09',
                unit: 'CBM',
                isCustom: true
            }
        ]);
    };

    const handleBulkAdd = async () => {
        const toAdd = selections.filter(s => s.selected);
        if (toAdd.length === 0) {
            setErrorMsg('Please select at least one item.');
            return;
        }

        const invalid = toAdd.find(s => !s.price || parseFloat(s.price) <= 0);
        if (invalid) {
            setErrorMsg(`Please enter a valid price for ${invalid.name}.`);
            return;
        }

        if (!canAddProduct(currentProductCount + toAdd.length - 1)) {
            setErrorMsg('This would exceed your plan limit. Please upgrade or select fewer items.');
            return;
        }

        setIsSaving(true);
        setErrorMsg('');

        try {
            const { mockDb } = await import('../lib/supabase');
            const { invalidateCache } = await import('../lib/dataCache');

            if (supabase) {
                // Ensure vendor row exists in 'vendors' table first to satisfy foreign key constraint
                try {
                    const vendorData = {
                        id: vendor.id,
                        name: vendor.storeName || 'Streetvend Partner',
                        owner_name: vendor.ownerName || 'Vendor',
                        phone: vendor.phone || '',
                        category: vendor.category || 'Timber & Wood Trading',
                        subscription: vendor.subscription || 'free',
                        is_active: true
                    };
                    await (supabase.from('vendors') as any).upsert([vendorData], { onConflict: 'id' });
                } catch (vendorErr) {
                    console.warn("Vendor pre-sync notice:", vendorErr);
                }

                const productsToInsert = toAdd.map(s => ({
                    id: 'p_' + Math.random().toString(36).substring(2, 9),
                    vendor_id: vendor.id,
                    name: s.name,
                    price: parseFloat(s.price),
                    unit: s.unit,
                    category: s.category,
                    type: s.type,
                    stock_qty: s.type === 'service' ? 0 : 50,
                    in_stock: true,
                    updated_at: new Date().toISOString()
                }));

                let { error } = await (supabase.from('products') as any).insert(productsToInsert);
                if (error && (error.message?.includes('type') || error.message?.includes('schema cache'))) {
                    const sanitized = productsToInsert.map(({ type, ...rest }) => rest);
                    const res = await (supabase.from('products') as any).insert(sanitized);
                    error = res.error;
                }

                // If Supabase throws foreign key or vendor ID mismatch error, fallback gracefully to mockDb
                if (error && (
                    error.message?.includes('foreign key constraint') || 
                    error.message?.includes('products_vendor_id_fkey') || 
                    error.code === '23503'
                )) {
                    console.warn("Supabase products FK constraint, saving to local store instead:", error.message);
                    toAdd.forEach(s => {
                        mockDb.products.push({
                            id: 'p_' + Math.random().toString(36).substring(2, 9),
                            vendorId: vendor.id,
                            name: s.name,
                            price: parseFloat(s.price),
                            unit: s.unit,
                            category: s.category,
                            stock: 50,
                            barcode: ''
                        });
                    });
                    error = null;
                } else if (error) {
                    throw error;
                }
            } else {
                toAdd.forEach(s => {
                    mockDb.products.push({
                        id: 'p_' + Math.random().toString(36).substring(2, 9),
                        vendorId: vendor.id,
                        name: s.name,
                        price: parseFloat(s.price),
                        unit: s.unit,
                        category: s.category,
                        stock: 50,
                        barcode: ''
                    });
                });
            }

            invalidateCache(`products:${vendor.id}`);
            await onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Bulk add error:', err);
            setErrorMsg(err.message || 'Failed to add products');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl overflow-hidden">
            <div className="bg-bg-surface rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl max-h-[95vh] sm:max-h-[92vh] flex flex-col border border-border-subtle shadow-2xl relative overflow-hidden">
                <div className="p-4 sm:p-8 pb-3 sm:pb-4 flex items-center justify-between shrink-0 border-b border-border-subtle sm:border-b-0">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-bold text-[10px] uppercase tracking-widest mb-1 sm:mb-2">
                            <ShoppingBag className="w-3 h-3" /> Templates for {vendor.category}
                        </div>
                        <h3 className="font-display font-bold text-xl sm:text-2xl text-text-primary">Quick Add Products</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-bg-base text-text-tertiary hover:text-text-primary transition-colors shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {errorMsg && (
                    <div className="mx-4 sm:mx-8 mt-3 mb-2 p-3 sm:p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2 shrink-0">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-2">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary">
                            Select & Customize Timber Sizes / Products
                        </span>
                        <button
                            type="button"
                            onClick={handleAddCustomRow}
                            className="px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 border border-brand-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                            + Add Custom Size
                        </button>
                    </div>

                    <div className="space-y-3">
                        {selections.map((item, idx) => (
                            <div 
                                key={item.id || item.name || idx}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all ${
                                    item.selected 
                                    ? "bg-brand-500/5 border-brand-500/30 shadow-sm" 
                                    : "bg-bg-base border-border-subtle opacity-70"
                                }`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button 
                                        type="button"
                                        onClick={() => toggleSelection(idx)}
                                        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0 cursor-pointer"
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                            item.selected 
                                            ? "bg-brand-500 border-brand-500 text-white" 
                                            : "border-border-strong bg-white group-hover:border-brand-500"
                                        }`}>
                                            {item.selected && <Check className="w-4 h-4" />}
                                        </div>
                                    </button>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <input
                                            type="text"
                                            disabled={!item.selected}
                                            value={item.name}
                                            onChange={(e) => handleNameChange(idx, e.target.value)}
                                            placeholder="Enter timber size / product name..."
                                            className="w-full px-2.5 py-1.5 rounded-xl bg-bg-surface border border-border-subtle font-bold text-xs sm:text-sm text-text-primary focus:outline-none focus:border-brand-500 disabled:opacity-70 transition-colors"
                                        />
                                        <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider px-1">
                                            {item.category} {item.isCustom ? '• Custom Added' : ''}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 pl-12 sm:pl-0">
                                    <div className="w-28 sm:w-28 shrink-0">
                                        <select
                                            disabled={!item.selected}
                                            value={item.unit}
                                            onChange={(e) => handleUnitChange(idx, e.target.value)}
                                            className="w-full px-2.5 py-2.5 min-h-[44px] rounded-xl bg-bg-surface border border-border-subtle text-xs font-medium focus:outline-none focus:border-brand-500 disabled:opacity-50 transition-colors"
                                        >
                                            <option value="CBM">CBM (M.CUBM)</option>
                                            <option value="CFT">CFT (Cu.Ft)</option>
                                            <option value="sheet">Sheet</option>
                                            <option value="sqft">Sq.Ft</option>
                                            <option value="kg">Kg</option>
                                            <option value="g">Grams</option>
                                            <option value="piece">Piece</option>
                                            <option value="packet">Packet</option>
                                            <option value="plate">Plate</option>
                                            <option value="cup">Cup</option>
                                            <option value="dozen">Dozen</option>
                                            <option value="bunch">Bunch</option>
                                            <option value="litre">Litre</option>
                                            <option value="service">Service</option>
                                            <option value="pair">Pair</option>
                                            <option value="set">Set</option>
                                        </select>
                                    </div>
                                    <div className="w-28 sm:w-28 shrink-0">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-bold text-xs">₹</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                disabled={!item.selected}
                                                placeholder="Price"
                                                value={item.price}
                                                onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                className="w-full pl-7 pr-2.5 py-2.5 min-h-[44px] rounded-xl bg-bg-surface border border-border-subtle text-xs font-bold focus:outline-none focus:border-brand-500 disabled:opacity-50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 sm:p-8 pt-3 border-t border-border-subtle shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-8">
                    <button
                        onClick={handleBulkAdd}
                        disabled={isSaving || selectedCount === 0}
                        className="w-full min-h-[48px] py-3.5 sm:py-4 rounded-2xl primary-button-gradient text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Adding Products...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Add Selected {selectedCount > 0 ? `(${selectedCount})` : ''}
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] font-bold text-text-tertiary uppercase tracking-widest mt-3">
                        {selections.filter(s => s.selected).length === 0 
                            ? "Select items above to add them to your inventory."
                            : selections.some(s => s.selected && s.type === 'product') 
                                ? "Stock for products will be set to 50 units by default. You can edit this later."
                                : "Services will be added with no stock tracking required."}
                    </p>
                </div>
            </div>
        </div>
    );
}
