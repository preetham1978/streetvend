import React from 'react';
import { Tag, TrendingUp, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TopProductsGridProps {
    products: any[];
}

export default function TopProductsGrid({ products }: TopProductsGridProps) {
    return (
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm flex flex-col h-full">
            <div className="mb-6">
                <h3 className="font-display font-black text-xl text-text-primary">
                    Most Popular Products Across Platform
                </h3>
                <p className="text-xs text-text-secondary font-medium">Based on how many vendors have added each product</p>
            </div>

            <div className="flex flex-wrap gap-2.5 overflow-y-auto max-h-[400px] pr-2">
                {products.length === 0 ? (
                    <div className="w-full py-12 flex flex-col items-center justify-center text-text-tertiary">
                        <Tag className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium italic">No product data available yet</p>
                    </div>
                ) : (
                    products.map((product, idx) => (
                        <div 
                            key={product.canonical_product_id || idx}
                            className="group relative"
                        >
                            <div className="px-4 py-2.5 rounded-2xl bg-bg-surface-inset border border-border-subtle hover:border-brand-500/30 hover:bg-bg-surface transition-all cursor-pointer flex items-center gap-3 group-active:scale-95 shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center text-[10px] font-black text-brand-500">
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-text-primary group-hover:text-brand-500 transition-colors">
                                        {product.product_name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3 text-text-tertiary" />
                                            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                                                {product.vendor_count} Vendors
                                            </span>
                                        </div>
                                        {product.total_quantity_sold > 0 && (
                                            <div className="flex items-center gap-1 border-l border-border-subtle pl-2">
                                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                    {product.total_quantity_sold} Sold
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-auto pt-6 border-t border-border-subtle flex items-center justify-between text-xs font-bold text-text-tertiary uppercase tracking-widest">
                <span>Top Categories</span>
                <div className="flex gap-2">
                    <span className="px-2 py-1 rounded-lg bg-bg-surface-inset border border-border-subtle">Fast Food</span>
                    <span className="px-2 py-1 rounded-lg bg-bg-surface-inset border border-border-subtle">Beverages</span>
                    <span className="px-2 py-1 rounded-lg bg-bg-surface-inset border border-border-subtle">Kirana</span>
                </div>
            </div>
        </div>
    );
}
