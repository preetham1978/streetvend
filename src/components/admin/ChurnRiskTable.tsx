import React from 'react';
import { AlertTriangle, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface ChurnRiskTableProps {
    data: any[];
    onReEngage: (vendor: any) => void;
}

export default function ChurnRiskTable({ data, onReEngage }: ChurnRiskTableProps) {
    if (data.length === 0) {
        return (
            <div className="p-8 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-display font-black text-xl text-text-primary mb-1">
                    No vendors at risk — great retention!
                </h3>
                <p className="text-sm text-text-secondary font-medium">All paid vendors have been active in the last 5 days.</p>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm overflow-hidden">
            <div className="mb-6">
                <h3 className="font-display font-black text-xl text-text-primary flex items-center gap-2">
                    Churn Risk — Paid Vendors Gone Quiet
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                        Attention Required
                    </span>
                </h3>
                <p className="text-xs text-text-secondary font-medium">Paid plan vendors inactive for 5+ days</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-border-subtle text-text-tertiary uppercase tracking-widest text-[11px] font-black">
                            <th className="py-4 px-4">Vendor Name</th>
                            <th className="py-4 px-4">Plan</th>
                            <th className="py-4 px-4 text-center">Days Inactive</th>
                            <th className="py-4 px-4">Last Login</th>
                            <th className="py-4 px-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {data.map((vendor) => {
                            const isHighRisk = vendor.days_inactive >= 8;
                            return (
                                <tr 
                                    key={vendor.vendor_id} 
                                    className={cn(
                                        "transition-all",
                                        isHighRisk ? "bg-red-500/5 hover:bg-red-500/10" : "bg-amber-400/5 hover:bg-amber-400/10"
                                    )}
                                >
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full animate-pulse",
                                                isHighRisk ? "bg-red-500" : "bg-amber-400"
                                            )} />
                                            <span className="font-bold text-text-primary">{vendor.vendor_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="px-2 py-0.5 rounded-full bg-bg-surface border border-border-subtle text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">
                                            {vendor.subscription}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={cn(
                                            "font-black text-lg",
                                            isHighRisk ? "text-red-500" : "text-amber-500"
                                        )}>
                                            {vendor.days_inactive}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-xs text-text-secondary font-medium">
                                        {format(new Date(vendor.last_login_at), 'PPP')}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <button 
                                            onClick={() => onReEngage(vendor)}
                                            className="flex items-center gap-2 ml-auto px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Send Re-engagement
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
