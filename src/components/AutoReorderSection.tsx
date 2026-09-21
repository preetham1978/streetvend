import { apiFetch } from '../lib/apiFetch';
import React, { useState } from 'react';
import { RefreshCw, PackageCheck, Send, CheckCircle2, ShieldAlert, Sparkles, Building2, Truck, Check, Lock } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { useAuth } from '../lib/auth';
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
    const { session, user } = useAuth();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [sentOrders, setSentOrders] = useState<Record<string, boolean>>({});
    const [isReordering, setIsReordering] = useState<Record<string, boolean>>({});

    const isUnlocked = hasFeature('ai_auto_reorder');

    const defaultPOs: PurchaseOrder[] = [
        {
            id: 'po_1',
            productName: 'Teak Wood Cut Sizes (2.92 CBM / 42 Pcs Batch)',
            supplierName: 'Burma Teak Depot & Forest Imports',
            supplierPhone: '+919865016017',
            currentStock: 15,
            threshold: 50,
            suggestedQty: 20,
            estimatedCost: 232180,
            status: 'pending'
        },
        {
            id: 'po_2',
            productName: 'Sal Wood Cut Planks (3.5x3 & 4x3 Sizes)',
            supplierName: 'Kerala Timber & Saw Mill Depot',
            supplierPhone: '+919812300445',
            currentStock: 8,
            threshold: 40,
            suggestedQty: 25,
            estimatedCost: 27500,
            status: 'pending'
        },
        {
            id: 'po_3',
            productName: 'Commercial Plywood 8x4 (18mm - 100 Sheets)',
            supplierName: 'Greenply & Century Plywood Wholesalers',
            supplierPhone: '+919765400998',
            currentStock: 5,
            threshold: 30,
            suggestedQty: 25,
            estimatedCost: 46250,
            status: 'pending'
        }
    ];

    const handleSendPo = async (po: PurchaseOrder) => {
        if (!isUnlocked) {
            setShowUpgradeModal(true);
            return;
        }

        setIsReordering(prev => ({ ...prev, [po.id]: true }));

        try {
            // Server-side entitlement verification API call
            const response = await apiFetch('/api/vendor/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    vendorId: user?.id,
                    vendorPlan: currentPlan,
                    poId: po.id,
                    productName: po.productName,
                    supplierName: po.supplierName,
                    suggestedQty: po.suggestedQty,
                    estimatedCost: po.estimatedCost
                })
            });

            if (response.status === 403) {
                const errorData = await response.json().catch(() => ({}));
                setShowUpgradeModal(true);
                alert(errorData.error || 'Enterprise plan required to approve and send Purchase Orders.');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.error || 'Failed to process purchase order on server.');
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
        } catch (err: any) {
            console.error('Error sending purchase order:', err);
            alert('Failed to connect to server for purchase order authorization.');
        } finally {
            setIsReordering(prev => ({ ...prev, [po.id]: false }));
        }
    };

    return (
        <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border-subtle">
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

                {!isUnlocked && (
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-amber-500/20 transition-all shrink-0"
                    >
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span>Enterprise Feature Locked</span>
                    </button>
                )}
            </div>

            {/* PO List Grid with Lock Blur Overlay Treatment */}
            <div className="relative">
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 transition-all ${
                    !isUnlocked ? 'filter blur-md select-none pointer-events-none opacity-40' : ''
                }`}>
                    {defaultPOs.map((po) => {
                        const isSent = sentOrders[po.id];
                        const loading = isReordering[po.id];

                        return (
                            <div
                                key={po.id}
                                className="bg-bg-surface-inset border border-border-subtle rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/40 transition-all"
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

                                    <div className="bg-bg-base p-3 rounded-xl border border-border-subtle space-y-1 mb-4 text-xs">
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
                                    disabled={loading}
                                    className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        isSent
                                            ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                                            : 'primary-button-gradient text-white shadow-lg hover:scale-[1.02]'
                                    }`}
                                >
                                    {loading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                    ) : isSent ? (
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

                {/* Locked Overlay for Non-Enterprise Tier Users */}
                {!isUnlocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/70 backdrop-blur-md rounded-2xl border border-brand-500/20 text-center animate-fade-in">
                        <div className="p-3.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 mb-3 shadow-lg">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-extrabold text-text-primary mb-2">
                            Unlock AI Auto-Reorder & Purchase Orders
                        </h3>
                        <p className="text-xs text-text-tertiary max-w-md mb-5 leading-relaxed">
                            Automated threshold triggers, stock depletion velocity calculations, and 1-click WhatsApp supplier purchase order dispatch are locked on your current plan. Upgrade to <strong className="text-brand-500">Enterprise</strong> to enable full inventory automation.
                        </p>
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-6 py-3 rounded-xl primary-button-gradient text-white text-xs font-extrabold uppercase tracking-widest shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Upgrade to Enterprise (₹999/mo)</span>
                        </button>
                    </div>
                )}
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

