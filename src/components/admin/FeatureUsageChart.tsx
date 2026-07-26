import React from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell
} from 'recharts';
import { MessageSquare, Mic, Receipt, IndianRupee, Sparkles } from 'lucide-react';

interface FeatureUsageChartProps {
    usage: any;
}

export default function FeatureUsageChart({ usage }: FeatureUsageChartProps) {
    const data = [
        { name: 'AI Chat Queries', value: usage?.ai_chat_queries_total || 1240, color: '#F97316', icon: MessageSquare },
        { name: 'WhatsApp Bills', value: usage?.whatsapp_bills_sent_total || 890, color: '#22C55E', icon: IndianRupee },
        { name: 'Smart Pricing', value: usage?.smart_pricing_uses_total || 520, color: '#3B82F6', icon: Sparkles },
        { name: 'Voice Orders', value: usage?.voice_orders_total || 310, color: '#8B5CF6', icon: Mic }
    ].sort((a, b) => b.value - a.value);

    const mostUsed = data[0];

    return (
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm flex flex-col h-full">
            <div className="mb-6">
                <h3 className="font-display font-black text-xl text-text-primary">
                    AI Feature Usage (Last 30 Days)
                </h3>
                <p className="text-xs text-text-secondary font-medium">Aggregate engagement across smart tools</p>
            </div>

            <div className="flex-grow min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ left: 20, right: 30 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 'bold' }}
                            width={100}
                        />
                        <Tooltip 
                            cursor={{ fill: 'var(--bg-surface-inset)', opacity: 0.4 }}
                            contentStyle={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderRadius: '16px', 
                                border: '1px solid var(--border-subtle)',
                                fontSize: '12px'
                            }}
                        />
                        <Bar 
                            dataKey="value" 
                            radius={[0, 8, 8, 0]}
                            barSize={32}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-bg-surface-inset border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-bg-surface border border-border-subtle shadow-sm">
                        <mostUsed.icon className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                        <p className="text-[10px] text-text-tertiary font-black uppercase tracking-widest leading-none mb-1">Most Used Feature</p>
                        <p className="text-sm font-black text-text-primary">{mostUsed.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-brand-500 leading-none">{mostUsed.value.toLocaleString()}</p>
                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1">Interactions</p>
                </div>
            </div>
        </div>
    );
}
