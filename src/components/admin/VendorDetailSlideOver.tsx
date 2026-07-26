import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Store, PieChart, Package, Calendar, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

interface VendorDetailSlideOverProps {
    vendor: any | null;
    onClose: () => void;
}

export default function VendorDetailSlideOver({ vendor, onClose }: VendorDetailSlideOverProps) {
    if (!vendor) return null;

    // Mock data for the vendor's specific performance
    const performanceData = [
        { date: 'Mon', revenue: 1200 },
        { date: 'Tue', revenue: 1500 },
        { date: 'Wed', revenue: 1100 },
        { date: 'Thu', revenue: 1800 },
        { date: 'Fri', revenue: 2200 },
        { date: 'Sat', revenue: 3100 },
        { date: 'Sun', revenue: 2800 },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                
                <div className="absolute inset-y-0 right-0 max-w-full flex">
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="w-screen max-w-md pointer-events-auto"
                    >
                        <div className="h-full flex flex-col bg-bg-surface shadow-2xl border-l border-border-subtle">
                            {/* Header */}
                            <div className="p-6 border-b border-border-subtle">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
                                            <Store className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-text-primary tracking-tight">
                                                {vendor.store_name}
                                            </h2>
                                            <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">
                                                Vendor Details
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={onClose}
                                        className="p-2 rounded-xl hover:bg-bg-surface-inset text-text-tertiary hover:text-text-primary transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest border border-brand-500/20">
                                        {vendor.plan_tier} Plan
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-bg-surface-inset text-text-secondary text-[10px] font-black uppercase tracking-widest border border-border-subtle">
                                        ID: {vendor.vendor_id.slice(0, 8)}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-bg-surface-inset border border-border-subtle">
                                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                                        <p className="text-xl font-black text-text-primary">₹{vendor.total_revenue_30d.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-bg-surface-inset border border-border-subtle">
                                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mb-1">Total Orders</p>
                                        <p className="text-xl font-black text-text-primary">{vendor.total_orders_30d}</p>
                                    </div>
                                </div>

                                {/* Performance Chart */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                            Weekly Performance
                                        </h3>
                                    </div>
                                    <div className="h-48 w-full bg-bg-surface-inset rounded-2xl border border-border-subtle p-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={performanceData}>
                                                <defs>
                                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.3} />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="revenue" stroke="#F97316" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Vendor Info */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                                        <Store className="w-3.5 h-3.5 text-brand-500" />
                                        Owner Information
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-inset border border-border-subtle">
                                            <span className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Name</span>
                                            <span className="text-sm font-bold text-text-primary">{vendor.vendor_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-inset border border-border-subtle">
                                            <span className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Store</span>
                                            <span className="text-sm font-bold text-text-primary">{vendor.store_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-inset border border-border-subtle">
                                            <span className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Last Active</span>
                                            <span className="text-sm font-bold text-text-primary">{vendor.last_active_at ? format(new Date(vendor.last_active_at), 'PPP') : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-border-subtle bg-bg-surface-inset space-y-3">
                                <button className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                                    <MessageSquare className="w-4 h-4" />
                                    Contact Vendor via WhatsApp
                                </button>
                                <button className="w-full py-4 bg-bg-surface border border-border-subtle text-text-primary rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-bg-surface-inset transition-all">
                                    <ArrowRight className="w-4 h-4" />
                                    View Detailed Vendor Dashboard
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}
