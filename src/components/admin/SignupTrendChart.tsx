import React, { useState, useMemo } from 'react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer
} from 'recharts';
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

interface SignupTrendChartProps {
    data: any[];
}

export default function SignupTrendChart({ data }: SignupTrendChartProps) {
    const [range, setRange] = useState('30d');

    // Process data to fill in missing dates and calculate cumulative totals
    const chartData = useMemo(() => {
        const days = range === '30d' ? 30 : 90;
        const end = new Date();
        const start = subDays(end, days - 1);
        
        const dateInterval = eachDayOfInterval({ start, end });
        
        let runningTotal = 0;
        
        // First, calculate the total signups BEFORE the start of our range
        // (This is tricky if the data prop only contains the last 30 days)
        // For simplicity, we'll start runningTotal from 0 or use the first available data
        
        return dateInterval.map(date => {
            const dayData = data.find(d => isSameDay(parseISO(d.date), date));
            const count = dayData ? dayData.count : 0;
            runningTotal += count;
            
            return {
                date: date.toISOString(),
                displayDate: format(date, 'dd MMM'),
                count: count,
                cumulative: runningTotal
            };
        });
    }, [data, range]);

    return (
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-subtle shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-display font-black text-xl text-text-primary">
                        Vendor Signup Trend
                    </h3>
                    <p className="text-xs text-text-secondary font-medium">New registrations & platform growth</p>
                </div>
                {data.length > 0 && (
                    <div className="flex bg-bg-surface-inset p-1 rounded-xl border border-border-subtle">
                        {['30d', '90d'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    range === r 
                                        ? "bg-bg-surface text-brand-500 shadow-sm border border-border-subtle" 
                                        : "text-text-tertiary hover:text-text-secondary"
                                }`}
                            >
                                {r === '30d' ? '30 Days' : '90 Days'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-[300px] w-full flex items-center justify-center">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-text-tertiary">
                        <LineChart width={40} height={40} data={[{v:0}]} className="opacity-20 mb-2">
                             <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} />
                        </LineChart>
                        <p className="text-sm font-medium italic">No signups recorded in this period</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
                        <XAxis 
                            dataKey="displayDate" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }}
                            dy={10}
                            minTickGap={30}
                        />
                        <YAxis 
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis 
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderRadius: '16px', 
                                border: '1px solid var(--border-subtle)',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                color: 'var(--text-primary)'
                            }}
                            itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="count" 
                            name="New Signups"
                            stroke="#F97316" 
                            strokeWidth={3}
                            dot={chartData.length < 40 ? { r: 3, strokeWidth: 2, fill: 'var(--bg-surface)' } : false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="cumulative" 
                            name="Total Vendors"
                            stroke="#0D9488" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
