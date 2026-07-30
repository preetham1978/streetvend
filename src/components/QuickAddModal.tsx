
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
    selected: boolean;
    price: string;
    unit: string;
}

export default function QuickAddModal({ isOpen, onClose, vendor, templateKey, onSuccess, canAddProduct, currentProductCount }: QuickAddModalProps) {
    const templates = PRODUCT_TEMPLATES[templateKey] || [];
    const [selections, setSelections] = useState<TemplateSelection[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    React.useEffect(() => {
        if (isOpen && templates.length > 0) {
            setSelections(templates.map(t => ({ ...t, selected: false, price: '', unit: t.defaultUnit })));
        }
    }, [isOpen, templateKey]);

    if (!isOpen || templates.length === 0) return null;

    const selectedCount = selections.filter(s => s.selected).length;

    const toggleSelection = (index: number) => {
        const newSelections = [...selections];
        newSelections[index].selected = !newSelections[index].selected;
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
            if (supabase) {
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
                if (error) throw error;
            } else {
                // Mock fallback is not really needed as we check for supabase, 
                // but for consistency with ProductsPage:
                const { mockDb } = await import('../lib/supabase');
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
            <div className="bg-bg-surface rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] flex flex-col border border-border-subtle shadow-2xl relative overflow-hidden pb-10 sm:pb-0">
                <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-bold text-[10px] uppercase tracking-widest mb-2">
                            <ShoppingBag className="w-3 h-3" /> Templates for {vendor.category}
                        </div>
                        <h3 className="font-display font-bold text-2xl text-text-primary">Quick Add Products</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-base text-text-tertiary hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {errorMsg && (
                    <div className="mx-8 mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2 shrink-0">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-8 py-2">
                    <div className="space-y-3">
                        {selections.map((item, idx) => (
                            <div 
                                key={item.name}
                                className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    item.selected 
                                    ? "bg-brand-500/5 border-brand-500/30 shadow-sm" 
                                    : "bg-bg-base border-border-subtle opacity-70"
                                }`}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <button 
                                        type="button"
                                        onClick={() => toggleSelection(idx)}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                            item.selected 
                                            ? "bg-brand-500 border-brand-500 text-white" 
                                            : "border-border-strong bg-white hover:border-brand-500"
                                        }`}
                                    >
                                        {item.selected && <Check className="w-4 h-4" />}
                                    </button>
                                    <div>
                                        <div className="font-bold text-sm text-text-primary">{item.name}</div>
                                        <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{item.category}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-24 shrink-0">
                                        <select
                                            disabled={!item.selected}
                                            value={item.unit}
                                            onChange={(e) => handleUnitChange(idx, e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-xs font-medium focus:outline-none focus:border-brand-500 disabled:opacity-50 transition-colors"
                                        >
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
                                    <div className="w-24 shrink-0">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-bold text-xs">₹</span>
                                            <input
                                                type="number"
                                                disabled={!item.selected}
                                                placeholder="Price"
                                                value={item.price}
                                                onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                className="w-full pl-7 pr-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-xs font-bold focus:outline-none focus:border-brand-500 disabled:opacity-50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-8 pt-4 border-t border-border-subtle shrink-0">
                    <button
                        onClick={handleBulkAdd}
                        disabled={isSaving || selectedCount === 0}
                        className="w-full py-4 rounded-2xl primary-button-gradient text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
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
                    <p className="text-center text-[10px] font-bold text-text-tertiary uppercase tracking-widest mt-4">
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
