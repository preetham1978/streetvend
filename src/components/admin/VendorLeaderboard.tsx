import React, { useState } from 'react';
import { Trophy, ExternalLink, MessageCircle, MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface VendorLeaderboardProps {
    data: any[];
    onVendorClick: (vendor: any) => void;
}

export default function VendorLeaderboard({ data, onVendorClick }: VendorLeaderboardProps) {
    const [showMore, setShowMore] = useState(false);
    const visibleData = showMore ? data : data.slice(0, 10);

    const getRankBadge = (rank: number) => {
        if (rank === 0) return "🥇";
        if (rank === 1) return "🥈";
        if (rank === 2) return "🥉";
        return `#${rank + 1}`;
    };

    const getPlanPill = (plan: string) => {
        const styles = {
            free: "bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20",
            starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            professional: "bg-brand-500/10 text-brand-400 border-brand-500/20",
            enterprise: "bg-amber-400/10 text-amber-300 border-amber-400/20"
        };
        const style = styles[plan as keyof typeof styles] || styles.free;
        return (
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border", style)}>
                {plan}
            </span>
        );
    };

    return (
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-display font-black text-xl text-text-primary">
                        Top Vendors by Revenue (Last 30 Days)
                    </h3>
                    <p className="text-xs text-text-secondary font-medium">Ranked by overall platform GMV contribution</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-border-subtle">
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest">Rank</th>
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest">Vendor / Store</th>
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest text-center">Plan</th>
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest text-right">Orders</th>
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest text-right">Revenue</th>
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest text-right">Avg Order</th>
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest text-right">Joined</th>
                            <th className="py-4 px-4 text-[11px] font-black text-text-tertiary uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {visibleData.map((vendor, idx) => (
                            <tr 
                                key={vendor.vendor_id} 
                                onClick={() => onVendorClick(vendor)}
                                className="group hover:bg-bg-surface-inset transition-all cursor-pointer"
                            >
                                <td className="py-4 px-4 font-black text-lg text-text-tertiary opacity-50">
                                    {getRankBadge(idx)}
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-text-primary group-hover:text-brand-500 transition-colors">
                                            {vendor.vendor_name}
                                        </span>
                                        <span className="text-xs text-text-tertiary font-medium">
                                            {vendor.store_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                    {getPlanPill(vendor.subscription)}
                                </td>
                                <td className="py-4 px-4 text-right font-black text-text-secondary">
                                    {vendor.total_orders_30d}
                                </td>
                                <td className="py-4 px-4 text-right font-black text-text-primary">
                                    ₹{Math.round(vendor.total_revenue_30d).toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-right font-bold text-text-tertiary">
                                    ₹{vendor.total_orders_30d > 0 ? Math.round(vendor.total_revenue_30d / vendor.total_orders_30d).toLocaleString() : 0}
                                </td>
                                <td className="py-4 px-4 text-right text-xs text-text-tertiary font-medium">
                                    {vendor.created_at ? format(new Date(vendor.created_at), 'MMM dd, yyyy') : 'Unknown'}
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 rounded-lg bg-bg-surface-inset border border-border-subtle text-text-tertiary hover:text-text-primary transition-all">
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.length > 10 && (
                <div className="mt-6 flex justify-center">
                    <button 
                        onClick={() => setShowMore(!showMore)}
                        className="px-6 py-2.5 rounded-xl border border-border-subtle hover:border-brand-500/30 text-text-secondary font-bold text-xs transition-all shadow-sm"
                    >
                        {showMore ? 'Show Less' : 'Show More Vendors'}
                    </button>
                </div>
            )}
        </div>
    );
}
