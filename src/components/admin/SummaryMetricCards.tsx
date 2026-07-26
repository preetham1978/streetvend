import React from 'react';
import { Store, IndianRupee, Activity, Layers, UserPlus, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SummaryMetricCardsProps {
    summary: any;
}

export default function SummaryMetricCards({ summary }: SummaryMetricCardsProps) {
    if (!summary) return null;

    const cards = [
        {
            id: 'vendors',
            label: 'Total Vendors',
            value: summary.total_vendors,
            icon: Store,
            trend: 'Overall platform scale',
            trendColor: 'text-brand-500'
        },
        {
            id: 'revenue_30d',
            label: 'Revenue (30d)',
            value: `₹${(summary.total_revenue_30d || 0).toLocaleString()}`,
            icon: IndianRupee,
            trend: 'Last 30 days performance',
            trendColor: 'text-emerald-400'
        },
        {
            id: 'active',
            label: 'Active Today',
            value: `${summary.total_orders_today || 0} orders`,
            icon: Activity,
            subValue: `₹${(summary.total_revenue_today || 0).toLocaleString()} revenue today`,
            trendColor: 'text-emerald-400'
        },
        {
            id: 'plans',
            label: 'Plan Distribution',
            type: 'plans-bar',
            icon: Layers
        },
        {
            id: 'paid_ratio',
            label: 'Paid Conversion',
            value: `${((summary.paid_plan_count / summary.total_vendors) * 100 || 0).toFixed(1)}%`,
            icon: UserPlus,
            trend: `${summary.paid_plan_count || 0} paid vendors`,
            trendColor: 'text-brand-500'
        },
        {
            id: 'churn',
            label: 'Churn Risk',
            value: 'Monitoring',
            icon: AlertTriangle,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card) => (
                <div 
                    key={card.id} 
                    className="p-5 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-2.5 rounded-xl bg-bg-surface-inset border border-border-subtle", card.color || "text-brand-500")}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary">
                            {card.label}
                        </span>
                    </div>

                    {card.type === 'plans-bar' ? (
                        <div className="space-y-2.5">
                            <div className="h-2 flex rounded-full overflow-hidden bg-bg-surface-inset border border-border-subtle">
                                <div 
                                    className="bg-text-tertiary h-full" 
                                    style={{ width: `${(summary.free_plan_count / summary.total_vendors) * 100 || 0}%` }} 
                                />
                                <div 
                                    className="bg-brand-500 h-full" 
                                    style={{ width: `${(summary.paid_plan_count / summary.total_vendors) * 100 || 0}%` }} 
                                />
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-text-tertiary">
                                <span>Free: {summary.free_plan_count || 0}</span>
                                <span>Paid: {summary.paid_plan_count || 0}</span>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-xl font-black text-text-primary tracking-tight">
                                {card.value}
                            </h3>
                            {card.subValue && (
                                <p className="text-xs text-text-secondary font-medium mt-0.5">
                                    {card.subValue}
                                </p>
                            )}
                            {card.trend && (
                                <p className={cn("text-[10px] font-bold mt-1.5", card.trendColor)}>
                                    {card.trend}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
