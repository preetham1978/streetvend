import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import GatedChartWrapper from './GatedChartWrapper';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-bg-surface border border-border-subtle rounded-xl p-3 shadow-xl text-xs">
                <p className="font-bold text-text-primary mb-1">{label}</p>
                <p className="text-brand-500 font-extrabold">₹{payload[0].value.toLocaleString()} Revenue</p>
                {payload[1] && <p className="text-accent-green font-bold">{payload[1].value} Orders</p>}
            </div>
        );
    }
    return null;
};

export default function SalesTrendChart() {
    const { user } = useAuth();
    const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSalesData() {
            if (!user) return;
            setIsLoading(true);
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('vendor_id', user.id);
            
            if (error || !orders) {
                setData([]);
            } else {
                // Process orders into daily trend
                const dailyMap: Record<string, { revenue: number, orders: number }> = {};
                (orders as any[]).forEach(o => {
                    const date = new Date(o.created_at).toLocaleDateString('en-US', { weekday: 'short' });
                    if (!dailyMap[date]) dailyMap[date] = { revenue: 0, orders: 0 };
                    dailyMap[date].revenue += o.total;
                    dailyMap[date].orders += 1;
                });
                const chartData = Object.entries(dailyMap).map(([day, metrics]) => ({
                    day,
                    ...metrics
                }));
                setData(chartData);
            }
            setIsLoading(false);
        }
        fetchSalesData();
    }, [user]);

    if (isLoading) return <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-brand-500" /></div>;
    if (data.length === 0) return (
        <GatedChartWrapper requiredTier="starter" title="Revenue & Order Trend" subtitle="Real-time daily sales volume and daily total revenue">
            <div className="h-[220px] flex items-center justify-center text-text-tertiary">Not enough data yet.</div>
        </GatedChartWrapper>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Revenue Trend Chart (2 cols) */}
            <div className="lg:col-span-2">
                <GatedChartWrapper
                    requiredTier="starter"
                    title="Revenue & Order Trend"
                    subtitle="Real-time daily sales volume and daily total revenue"
                >
                    <div className="flex justify-end mb-4">
                        <div className="inline-flex rounded-xl bg-bg-base p-1 border border-border-subtle">
                            <button
                                onClick={() => setTimeframe('daily')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    timeframe === 'daily' ? 'bg-brand-500 text-white shadow-md' : 'text-text-tertiary hover:text-text-primary'
                                }`}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setTimeframe('weekly')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    timeframe === 'weekly' ? 'bg-brand-500 text-white shadow-md' : 'text-text-tertiary hover:text-text-primary'
                                }`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f95808" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#f95808" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" stroke="#666" fontSize={11} tickLine={false} />
                                <YAxis stroke="#666" fontSize={11} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#f95808"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GatedChartWrapper>
            </div>

            {/* Product Share Donut Chart (1 col) - Simplified for brevity as per instructions */}
            <div className="lg:col-span-1">
                <GatedChartWrapper
                    requiredTier="starter"
                    title="Top Dishes Sold"
                    subtitle="Share of overall stall sales volume"
                >
                     <div className="text-center py-12 text-text-tertiary text-sm">Product breakdown not available.</div>
                </GatedChartWrapper>
            </div>
        </div>
    );
}
