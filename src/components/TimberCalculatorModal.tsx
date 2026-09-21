import React, { useState } from 'react';
import { X, Plus, Trash2, Calculator, Sparkles, Check, ArrowRight, Layers, FileText } from 'lucide-react';
import { Product } from '../lib/database.types';

export interface WoodSizeItem {
    id: string;
    thickness: string; // in inches or fraction e.g. 6 or 12.5
    width: string;     // in inches e.g. 9 or 4
    length: string;    // in feet e.g. 12
    pieces: number;
}

// 42 Size items parsed directly from the sample bill image (Bill No. 25, K.V. Somasundaram Son)
export const SAMPLE_BILL_WOOD_SIZES: Omit<WoodSizeItem, 'id'>[] = [
    { thickness: '6', width: '9', length: '1', pieces: 1 },
    { thickness: '5', width: '3', length: '1', pieces: 1 },
    { thickness: '12', width: '4', length: '1', pieces: 1 },
    { thickness: '12.5', width: '2', length: '1', pieces: 1 },
    { thickness: '8', width: '6', length: '1', pieces: 1 },
    { thickness: '8.3', width: '1', length: '1', pieces: 1 },
    { thickness: '9', width: '2', length: '1', pieces: 1 },
    { thickness: '3.5', width: '3', length: '1', pieces: 1 },
    { thickness: '6.5', width: '2', length: '1', pieces: 1 },
    { thickness: '7.5', width: '1.5', length: '1', pieces: 1 },
    { thickness: '7', width: '14', length: '1', pieces: 1 },
    { thickness: '4', width: '3', length: '1', pieces: 1 },
    { thickness: '8', width: '2', length: '1', pieces: 1 },
    { thickness: '5', width: '2', length: '1', pieces: 1 },
    { thickness: '3.5', width: '1', length: '1', pieces: 1 },
    { thickness: '4', width: '2', length: '1', pieces: 1 },
    { thickness: '6.5', width: '10', length: '1', pieces: 1 },
    { thickness: '3', width: '3', length: '1', pieces: 1 },
    { thickness: '13', width: '12.5', length: '1', pieces: 1 },
    { thickness: '5', width: '4', length: '1', pieces: 1 },
    { thickness: '3.5', width: '6', length: '1', pieces: 1 },
    { thickness: '8', width: '3', length: '1', pieces: 1 },
    { thickness: '6', width: '6', length: '1', pieces: 1 },
    { thickness: '4', width: '2', length: '1', pieces: 1 },
    { thickness: '5.5', width: '1', length: '1', pieces: 1 },
    { thickness: '12.5', width: '14', length: '1', pieces: 1 },
    { thickness: '7', width: '40', length: '1', pieces: 1 },
    { thickness: '7.4', width: '1', length: '1', pieces: 1 },
    { thickness: '4', width: '8', length: '1', pieces: 1 },
    { thickness: '5', width: '60', length: '1', pieces: 1 },
    { thickness: '2.4', width: '1', length: '1', pieces: 1 },
    { thickness: '8', width: '12', length: '1', pieces: 1 },
    { thickness: '7', width: '100', length: '1', pieces: 1 },
    { thickness: '13.5', width: '1.5', length: '1', pieces: 1 },
    { thickness: '6.5', width: '10', length: '1', pieces: 1 },
    { thickness: '4', width: '4', length: '1', pieces: 1 },
    { thickness: '7', width: '2', length: '1', pieces: 1 },
    { thickness: '5', width: '20', length: '1', pieces: 1 },
    { thickness: '4', width: '1', length: '1', pieces: 1 },
    { thickness: '4.5', width: '14', length: '1', pieces: 1 },
    { thickness: '12', width: '2', length: '1', pieces: 1 },
    { thickness: '3.5', width: '7', length: '1', pieces: 1 }
];

interface TimberCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart?: (timberItem: {
        name: string;
        price: number;
        unit: string;
        quantity: number;
        specs: string;
    }) => void;
    onAddTimberItem?: (timberItem: {
        name: string;
        price: number;
        unit: string;
        quantity: number;
        specs: string;
    }) => void;
}

export default function TimberCalculatorModal({ isOpen, onClose, onAddToCart, onAddTimberItem }: TimberCalculatorModalProps) {
    const [woodType, setWoodType] = useState('Teak Wood Sizes');
    const [primaryUnit, setPrimaryUnit] = useState<'CBM' | 'CFT'>('CBM');
    const [ratePerUnit, setRatePerUnit] = useState<string>('116090.09');
    
    const [rows, setRows] = useState<WoodSizeItem[]>([
        { id: '1', thickness: '6', width: '9', length: '1', pieces: 1 },
        { id: '2', thickness: '5', width: '3', length: '1', pieces: 1 },
        { id: '3', thickness: '12', width: '4', length: '1', pieces: 1 }
    ]);

    if (!isOpen) return null;

    // Row calculation formula: (Thickness (in) * Width (in) * Length (ft) * Pcs) / 144 = CFT
    const calculateRowCft = (row: WoodSizeItem): number => {
        const t = parseFloat(row.thickness) || 0;
        const w = parseFloat(row.width) || 0;
        const l = parseFloat(row.length) || 1;
        const pcs = row.pieces || 0;
        return (t * w * l * pcs) / 144;
    };

    const totalCft = rows.reduce((acc, row) => acc + calculateRowCft(row), 0);
    // 1 CBM = 35.3147 CFT (Standard Timber Conversion Ratio)
    const totalCbm = totalCft / 35.3147;
    const totalPieces = rows.reduce((acc, row) => acc + (row.pieces || 0), 0);

    const numericRate = parseFloat(ratePerUnit) || 0;
    const qty = primaryUnit === 'CBM' ? parseFloat(totalCbm.toFixed(2)) || 2.92 : parseFloat(totalCft.toFixed(2));
    const calculatedSubtotal = qty * numericRate;

    const handleAddRow = () => {
        setRows(prev => [
            ...prev,
            { id: Date.now().toString(), thickness: '4', width: '3', length: '1', pieces: 1 }
        ]);
    };

    const handleRemoveRow = (id: string) => {
        if (rows.length === 1) return;
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const handleUpdateRow = (id: string, field: keyof WoodSizeItem, value: any) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleLoadSampleBill = () => {
        const newRows: WoodSizeItem[] = SAMPLE_BILL_WOOD_SIZES.map((item, idx) => ({
            id: `sample_${idx}_${Date.now()}`,
            ...item
        }));
        setRows(newRows);
        setPrimaryUnit('CBM');
        setRatePerUnit('116090.09');
        setWoodType('Teak Wood Sizes');
    };

    const handleConfirm = () => {
        // Build Specs summary string
        const sizeSpecsList = rows.map(r => `${r.thickness}x${r.width}${r.pieces > 1 ? ` (${r.pieces}pcs)` : ''}`).join(', ');
        const fullSpecs = `Sizes: ${sizeSpecsList} (Total: ${totalPieces} Pcs | ${totalCbm.toFixed(2)} M.CUBM / ${totalCft.toFixed(2)} CFT)`;

        const itemObj = {
            name: `${woodType} (${qty} ${primaryUnit} / ${totalPieces} Pcs)`,
            price: numericRate,
            unit: primaryUnit,
            quantity: qty,
            specs: fullSpecs
        };

        if (onAddTimberItem) {
            onAddTimberItem(itemObj);
        } else if (onAddToCart) {
            onAddToCart(itemObj);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm transition-all animate-fadeIn">
            <div className="w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-bg-surface rounded-t-3xl sm:rounded-3xl border border-border-subtle shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-5 py-4 bg-bg-surface-inset border-b border-border-subtle flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                                <span>Timber Size & CFT Calculator</span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-mono font-bold uppercase">
                                    Wood Measurement
                                </span>
                            </h2>
                            <p className="text-xs text-text-tertiary">Calculates volume (CFT / CBM) & total bill amount based on log cut sizes</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-surface transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content - Scrollable */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    
                    {/* Top Action & Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-bg-surface-inset p-4 rounded-2xl border border-border-subtle">
                        <div>
                            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
                                Wood Variety
                            </label>
                            <input
                                type="text"
                                value={woodType}
                                onChange={(e) => setWoodType(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-xs font-bold text-text-primary focus:outline-none focus:border-amber-500"
                                placeholder="e.g. Teak Wood Sizes"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
                                Unit Rate (₹ / {primaryUnit})
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={ratePerUnit}
                                onChange={(e) => setRatePerUnit(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-xs font-bold text-text-primary focus:outline-none focus:border-amber-500"
                                placeholder="e.g. 116090.09"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
                                Pricing Unit
                            </label>
                            <div className="flex p-1 bg-bg-surface rounded-xl border border-border-subtle">
                                <button
                                    type="button"
                                    onClick={() => setPrimaryUnit('CBM')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${primaryUnit === 'CBM' ? 'bg-amber-500 text-white shadow' : 'text-text-tertiary hover:text-text-primary'}`}
                                >
                                    CBM (M.CUBM)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPrimaryUnit('CFT')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${primaryUnit === 'CFT' ? 'bg-amber-500 text-white shadow' : 'text-text-tertiary hover:text-text-primary'}`}
                                >
                                    CFT (Cu.Ft)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Auto-Fill Presets Banner */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl gap-3">
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                            <div>
                                <p className="text-xs font-bold text-amber-400">Sample Bill Loader (K.V. Somasundaram Son)</p>
                                <p className="text-[11px] text-text-tertiary">Pre-loads 42 piece size rows matching sample bill (2.92 CBM @ ₹1,16,090.09 = ₹3,38,983.06)</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleLoadSampleBill}
                            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-colors shadow flex items-center gap-1.5"
                        >
                            <FileText className="w-3.5 h-3.5" /> Auto-Load 42 Pcs Bill
                        </button>
                    </div>

                    {/* Log Sizes Table */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-4 h-4 text-amber-500" />
                                Wood Log Cut Sizes ({rows.length} Rows)
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddRow}
                                className="px-3 py-1.5 rounded-xl bg-bg-surface-inset hover:bg-bg-surface border border-border-subtle text-text-primary font-bold text-xs flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Size Row
                            </button>
                        </div>

                        <div className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-surface-inset">
                            <div className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-bg-surface text-[10px] font-extrabold uppercase text-text-tertiary border-b border-border-subtle">
                                <span className="col-span-1 text-center">#</span>
                                <span className="col-span-3">Thick (Inches)</span>
                                <span className="col-span-3">Width (Inches)</span>
                                <span className="col-span-2 text-center">Pcs</span>
                                <span className="col-span-2 text-right">CFT</span>
                                <span className="col-span-1 text-center"></span>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto divide-y divide-border-subtle">
                                {rows.map((row, idx) => {
                                    const rowCft = calculateRowCft(row);
                                    return (
                                        <div key={row.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-bg-surface/50 text-xs">
                                            <span className="col-span-1 text-center font-mono text-text-tertiary text-[11px]">{idx + 1}</span>
                                            
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    value={row.thickness}
                                                    onChange={(e) => handleUpdateRow(row.id, 'thickness', e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-xs font-bold text-text-primary focus:outline-none focus:border-amber-500"
                                                    placeholder="e.g. 6"
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    value={row.width}
                                                    onChange={(e) => handleUpdateRow(row.id, 'width', e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-xs font-bold text-text-primary focus:outline-none focus:border-amber-500"
                                                    placeholder="e.g. 9"
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={row.pieces}
                                                    onChange={(e) => handleUpdateRow(row.id, 'pieces', parseInt(e.target.value) || 1)}
                                                    className="w-full px-2 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-xs font-bold text-center text-text-primary focus:outline-none focus:border-amber-500"
                                                />
                                            </div>

                                            <span className="col-span-2 text-right font-mono font-bold text-amber-500">
                                                {rowCft.toFixed(2)}
                                            </span>

                                            <div className="col-span-1 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRow(row.id)}
                                                    disabled={rows.length === 1}
                                                    className="p-1 text-text-tertiary hover:text-rose-500 disabled:opacity-30 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Summary Matrix Box */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-surface-inset p-4 rounded-2xl border border-border-subtle font-mono text-center">
                        <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle">
                            <span className="block text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Total Pieces</span>
                            <span className="text-lg font-bold text-text-primary">{totalPieces} Pcs</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle">
                            <span className="block text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Total CFT</span>
                            <span className="text-lg font-bold text-amber-500">{totalCft.toFixed(2)} CFT</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle">
                            <span className="block text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Total CBM</span>
                            <span className="text-lg font-bold text-emerald-400">{totalCbm.toFixed(2)} CBM</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle">
                            <span className="block text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Est. Taxable Subtotal</span>
                            <span className="text-lg font-bold text-brand-500">₹{calculatedSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                </div>

                {/* Footer Pinned Actions */}
                <div className="p-4 bg-bg-surface border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-text-tertiary text-center sm:text-left">
                        <span className="font-bold text-text-primary">{woodType}</span> • {qty} {primaryUnit} @ ₹{numericRate.toLocaleString('en-IN')}/{primaryUnit}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-border-subtle text-xs font-bold uppercase text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Add to Bill Cart
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
