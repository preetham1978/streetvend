import React from 'react';
import GatedChartWrapper from './GatedChartWrapper';
import { Package, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { Product } from '../lib/database.types';

interface StockPredictionWidgetProps {
    products?: Product[];
}

const DEFAULT_INVENTORY_METRICS = [
    { name: 'Puri Shells', current: 420, capacity: 500, status: 'good', depletionDays: 4.2, speed: 'Fast Moving' },
    { name: 'Potato Masala', current: 45, capacity: 200, status: 'low', depletionDays: 1.1, speed: 'Fast Moving' },
    { name: 'Pudina Chutney', current: 12, capacity: 100, status: 'critical', depletionDays: 0.3, speed: 'High Velocity' },
    { name: 'Cold Coffee Beans', current: 180, capacity: 200, status: 'good', depletionDays: 12.0, speed: 'Slow Moving' }
];

export default function StockPredictionWidget({ products }: StockPredictionWidgetProps) {
    const items = products ? products.map(p => ({
        name: p.name,
        current: p.stock,
        capacity: 500, // Assuming a reasonable capacity
        status: p.stock < 10 ? 'critical' : p.stock < 30 ? 'low' : 'good',
        depletionDays: p.stock > 0 ? (p.stock / 5).toFixed(1) : 0, // Mock depletion rate
        speed: p.stock > 30 ? 'Slow Moving' : 'Fast Moving'
    })) : [];

    return (
        <GatedChartWrapper
            requiredTier="starter"
            title="Stock Predictions & Depletion Velocity"
            subtitle="Real-time inventory depletion meters & AI reorder triggers"
        >
            {items.length === 0 ? (
                <div className="text-center py-8 text-text-tertiary">No inventory data available yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
                    {items.map((item) => {
                        const pct = Math.min(100, Math.round((item.current / item.capacity) * 100));
                        let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        let meterColor = 'bg-emerald-400';
                        let statusLabel = 'HEALTHY';

                        if (item.status === 'low') {
                            badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                            meterColor = 'bg-amber-400';
                            statusLabel = 'LOW STOCK';
                        } else if (item.status === 'critical') {
                            badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                            meterColor = 'bg-red-500';
                            statusLabel = 'CRITICAL';
                        }

                        return (
                            <div key={item.name} className="p-4 rounded-2xl bg-bg-surface-inset border border-border-subtle flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badgeColor}`}>
                                            {statusLabel}
                                        </span>
                                        <span className="text-[10px] text-text-tertiary font-bold">{item.speed}</span>
                                    </div>
                                    <h5 className="font-bold text-text-primary text-sm mb-1 truncate">{item.name}</h5>
                                    <div className="flex items-baseline justify-between text-xs text-text-secondary mb-2">
                                        <span>{item.current} / {item.capacity} units</span>
                                        <strong className="text-text-primary font-extrabold">{pct}%</strong>
                                    </div>

                                    <div className="h-2 bg-bg-base rounded-full overflow-hidden mb-3">
                                        <div
                                            className={`h-full rounded-full ${meterColor} transition-all duration-500`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px]">
                                    <span className="text-text-tertiary">Run-out in:</span>
                                    <span className={`font-extrabold ${item.status === 'critical' ? 'text-red-400 animate-pulse' : 'text-text-primary'}`}>
                                        {item.depletionDays} days
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </GatedChartWrapper>
    );
}
