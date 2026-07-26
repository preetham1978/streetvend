import React from 'react';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip,
    Legend
} from 'recharts';

interface PlanDistributionChartProps {
    summary: any;
}

export default function PlanDistributionChart({ summary }: PlanDistributionChartProps) {
    if (!summary) return null;

    const data = [
        { name: 'Free', value: summary.free_plan_count, color: '#94A3B8' },
        { name: 'Paid', value: summary.paid_plan_count, color: '#F97316' }
    ].filter(d => d.value > 0);

    const total = summary.total_vendors;

    return (
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm h-full flex flex-col">
            <div className="mb-4">
                <h3 className="font-display font-black text-xl text-text-primary">
                    Plan Distribution
                </h3>
                <p className="text-xs text-text-secondary font-medium">Breakdown of active subscriptions</p>
            </div>

            <div className="flex-grow min-h-[250px] relative">
                {total === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary">
                        <PieChart width={40} height={40} className="opacity-20 mb-2">
                            <Pie data={[{v:1}]} dataKey="v" innerRadius={10} outerRadius={15} stroke="none" fill="currentColor" />
                        </PieChart>
                        <p className="text-sm font-medium italic">No vendors registered</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderRadius: '16px', 
                                border: '1px solid var(--border-subtle)',
                                fontSize: '12px'
                            }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            formatter={(value, entry: any) => (
                                <span className="text-[11px] font-bold text-text-secondary ml-1">
                                    {value} ({((entry.payload.value / total) * 100).toFixed(0)}%)
                                </span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
                )}
                
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-2xl font-black text-text-primary">{total}</span>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Vendors</span>
                </div>
            </div>
        </div>
    );
}
