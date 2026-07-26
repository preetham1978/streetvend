import React, { useState } from 'react';
import { RefreshCw, PackageCheck, Send, CheckCircle2, ShieldAlert, Sparkles, Building2, Truck, Check } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from './UpgradeModal';
import { Product } from '../lib/database.types';

export interface PurchaseOrder {
    id: string;
    productName: string;
    supplierName: string;
    supplierPhone: string;
    currentStock: number;
    threshold: number;
    suggestedQty: number;
    estimatedCost: number;
    status: 'pending' | 'sent';
}

interface AutoReorderSectionProps {
    products?: Product[];
}

export default function AutoReorderSection({ products = [] }: AutoReorderSectionProps) {
    const { hasFeature, currentPlan } = usePlanLimits();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [sentOrders, setSentOrders] = useState<Record<string, boolean>>({});

    const defaultPOs: PurchaseOrder[] = [
        {
            id: 'po_1',
            productName: 'Puri Shells (Crispy Box 500 pcs)',
            supplierName: 'Gupta Wholesale Provision Store',
            supplierPhone: '+919876500112',
            currentStock: 8,
            threshold: 25,
            suggestedQty: 5,
            estimatedCost: 1200,
            status: 'pending'
        },
        {
            id: 'po_2',
            productName: 'Tamarind Chutney Puree (5kg Can)',
            supplierName: 'Sharma Sauce & Spices Dist.',
            supplierPhone: '+919812300445',
            currentStock: 2,
            threshold: 10,
            suggestedQty: 3,
            estimatedCost: 850,
            status: 'pending'
        },
        {
            id: 'po_3',
            productName: 'Special Masala Powder (1kg Bag)',
            supplierName: 'Royal Spice Traders',
            supplierPhone: '+919765400998',
            currentStock: 1,
            threshold: 5,
            suggestedQty: 4,
            estimatedCost: 640,
            status: 'pending'
        }
    ];

    const handleSendPo = (po: PurchaseOrder) => {
        if (!hasFeature('ai_auto_reorder')) {
            setShowUpgradeModal(true);
            return;
        }

        const message = encodeURIComponent(
            `*AUTOMATED PURCHASE ORDER - STREETVEND*\n\n` +
            `Supplier: ${po.supplierName}\n` +
            `Item: ${po.productName}\n` +
            `Requested Qty: ${po.suggestedQty} unit(s)\n` +
            `Estimated Total: ₹${po.estimatedCost}\n\n` +
            `Please confirm dispatch and delivery timeframe for our stall.`
        );

        window.open(`https://wa.me/${po.supplierPhone.replace(/\D/g, '')}?text=${message}`, '_blank');
        setSentOrders(prev => ({ ...prev, [po.id]: true }));
    };

    return (
        <div className="bg-[#141416] border border-[#28282e] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#28282e]">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-extrabold uppercase tracking-widest border border-brand-500/20 mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ENTERPRISE INVENTORY ENGINE</span>
                    </div>
                    <h2 className="font-sans font-extrabold text-2xl text-text-primary">
                        AI Auto-Reorder & Purchase Orders
                    </h2>
                    <p className="text-xs text-text-tertiary mt-0.5">
                        Automated threshold triggers & supplier dispatch management
                    </p>
                </div>

                {!hasFeature('ai_auto_reorder') && (
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-amber-500/20 transition-all shrink-0"
                    >
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        <span>Enterprise Feature Locked</span>
                    </button>
                )}
            </div>

            {/* PO List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {defaultPOs.map((po) => {
                    const isSent = sentOrders[po.id];

                    return (
                        <div
                            key={po.id}
                            className="bg-[#1a1a1e] border border-[#2d2d34] rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/40 transition-all"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                        Stock: {po.currentStock} (Limit: {po.threshold})
                                    </span>
                                    <Building2 className="w-4 h-4 text-text-tertiary" />
                                </div>

                                <h3 className="font-bold text-base text-text-primary mb-1">{po.productName}</h3>
                                <p className="text-xs text-text-tertiary mb-4 flex items-center gap-1">
                                    <Truck className="w-3.5 h-3.5 text-brand-500" />
                                    <span>{po.supplierName}</span>
                                </p>

                                <div className="bg-[#121214] p-3 rounded-xl border border-[#25252a] space-y-1 mb-4 text-xs">
                                    <div className="flex justify-between text-text-secondary">
                                        <span>Suggested Reorder:</span>
                                        <strong className="text-white">{po.suggestedQty} Units</strong>
                                    </div>
                                    <div className="flex justify-between text-text-secondary">
                                        <span>Estimated Wholesale:</span>
                                        <strong className="text-brand-500 font-sans font-extrabold">₹{po.estimatedCost}</strong>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleSendPo(po)}
                                className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    isSent
                                        ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                                        : 'primary-button-gradient text-white shadow-lg hover:scale-[1.02]'
                                }`}
                            >
                                {isSent ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>PO Sent to Supplier</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Approve & Reorder via WA</span>
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="AI Auto-Reorder & Full Inventory"
                requiredTier="enterprise"
                message="AI Auto-Reorder calculates stock depletion speeds, generates supplier Purchase Orders automatically, and dispatches POs over WhatsApp in 1-click. Upgrade to Enterprise to enable auto-reorder."
            />
        </div>
    );
}
