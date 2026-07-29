import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
    Store, 
    TrendingUp, 
    Users, 
    Activity, 
    AlertTriangle, 
    Download, 
    RefreshCcw,
    Layers,
    IndianRupee,
    UserPlus,
    ExternalLink,
    ChevronRight,
    MessageCircle,
    CheckCircle2,
    ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    PieChart as RePieChart, 
    Pie, 
    Cell, 
    Legend,
    BarChart,
    Bar
} from 'recharts';

// Modular components
import SummaryMetricCards from '../components/admin/SummaryMetricCards';
import SignupTrendChart from '../components/admin/SignupTrendChart';
import PlanDistributionChart from '../components/admin/PlanDistributionChart';
import VendorLeaderboard from '../components/admin/VendorLeaderboard';
import ChurnRiskTable from '../components/admin/ChurnRiskTable';
import FeatureUsageChart from '../components/admin/FeatureUsageChart';
import TopProductsGrid from '../components/admin/TopProductsGrid';
import VendorDetailSlideOver from '../components/admin/VendorDetailSlideOver';
import ReEngagementModal from '../components/admin/ReEngagementModal';
import ErrorState from '../components/ErrorState';

export default function AdminAnalytics() {
    const { isAdmin, isSuperAdmin, user: authUser, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());
    const [dateRange, setDateRange] = useState('30d');
    
    // Data states
    const [summary, setSummary] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [churnRisk, setChurnRisk] = useState<any[]>([]);
    const [signupTrend, setSignupTrend] = useState<any[]>([]);
    const [featureUsage, setFeatureUsage] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
    const [reEngageVendor, setReEngageVendor] = useState<any | null>(null);

    const canAccess = isAdmin || isSuperAdmin;

    const fetchData = async () => {
        if (!canAccess) return;
        if (!supabase) {
            setError("Supabase client not initialized. Please ensure environment variables are set.");
            setLoading(false);
            return;
        }
        setRefreshing(true);
        setError(null);
        try {
            const [
                { data: summaryData, error: summaryError },
                { data: leaderboardData, error: leaderboardError },
                { data: churnData, error: churnError },
                { data: trendData, error: trendError },
                { data: productsData, error: productsError }
            ] = await Promise.all([
                supabase.from('admin_platform_summary').select('*').single(),
                supabase.from('admin_vendor_leaderboard').select('*'),
                supabase.from('admin_churn_risk').select('*'),
                supabase.from('admin_signup_trend').select('*'),
                supabase.from('admin_top_products').select('*')
            ]);

            if (summaryError || leaderboardError || churnError || trendError || productsError) {
                throw new Error("One or more requests failed.");
            }

            setSummary(summaryData);
            setLeaderboard(leaderboardData || []);
            setChurnRisk(churnData || []);
            setSignupTrend(trendData || []);
            setTopProducts(productsData || []);
            setLastRefreshed(new Date());

            // Log the visit to audit log
            if (supabase && authUser) {
                await (supabase as any).from('admin_audit_log').insert([{
                    admin_user_id: authUser.id,
                    action: 'viewed_analytics',
                    ip_address: 'client-side'
                }]);
            }
        } catch (error) {
            console.error('Error fetching admin analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (canAccess) {
            fetchData();
        }
    }, [canAccess, dateRange]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-base">
                <RefreshCcw className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
                <ErrorState message={error} onRetry={fetchData} />
            </div>
        );
    }

    if (!canAccess) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    const exportToCSV = () => {
        const filename = `streetvend-admin-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        
        // Summary CSV
        const summaryRows = [
            ['Platform Summary'],
            ['Total Vendors', summary?.total_vendors || 0],
            ['Free Plans', summary?.free_plan_count || 0],
            ['Paid Plans', summary?.paid_plan_count || 0],
            ['Orders Today', summary?.total_orders_today || 0],
            ['Revenue Today', `₹${summary?.total_revenue_today || 0}`],
            ['Revenue (30d)', `₹${summary?.total_revenue_30d || 0}`],
            [''],
            ['Vendor Leaderboard (Top 20)'],
            ['Vendor Name', 'Store Name', 'Plan', 'Orders (30d)', 'Revenue (30d)'],
            ...(leaderboard.map(v => [
                v.vendor_name,
                v.store_name,
                v.subscription,
                v.total_orders_30d,
                v.total_revenue_30d
            ])),
            [''],
            ['Churn Risk Vendors'],
            ['Vendor Name', 'Plan', 'Days Inactive', 'Last Active'],
            ...(churnRisk.map(v => [
                v.vendor_name,
                v.subscription,
                v.days_inactive,
                v.last_login_at
            ]))
        ];

        const csvContent = summaryRows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-bg-base p-4 sm:p-6 lg:p-8 pt-24 lg:pt-28">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Bar */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <Link 
                            to="/admin/dashboard" 
                            className="inline-flex items-center gap-2 text-text-tertiary hover:text-brand-500 transition-colors text-xs font-bold uppercase tracking-wider mb-4 group"
                        >
                            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                            Back to Dashboard
                        </Link>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">
                                Admin Analytics
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
                                Admin View
                            </span>
                        </div>
                        <p className="text-text-secondary font-medium">
                            Platform-wide intelligence — VeloAI's Streetvend
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-bg-surface-inset p-1 rounded-xl border border-border-subtle">
                            {['Today', 'Week', 'Month', '30d', '90d'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                        dateRange === range 
                                            ? "bg-bg-surface text-brand-500 shadow-sm border border-border-subtle" 
                                            : "text-text-tertiary hover:text-text-secondary"
                                    )}
                                >
                                    {range === '30d' ? 'Last 30 Days' : range === '90d' ? 'Last 90 Days' : range}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-border-subtle hover:border-brand-500/30 text-text-primary rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>

                        <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
                            <div className="text-right">
                                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Last Refreshed</p>
                                <p className="text-[11px] text-text-secondary font-medium">{lastRefreshed.toLocaleTimeString()}</p>
                            </div>
                            <button 
                                onClick={fetchData}
                                className={cn(
                                    "p-2 rounded-lg bg-bg-surface border border-border-subtle hover:border-brand-500/30 text-text-secondary transition-all",
                                    refreshing && "animate-spin"
                                )}
                            >
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-32 bg-bg-surface border border-border-subtle rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* ROW 1 — SUMMARY METRIC CARDS */}
                        <SummaryMetricCards summary={summary} />

                        {/* ROW 2 — CHARTS */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <SignupTrendChart data={signupTrend} />
                            </div>
                            <div className="lg:col-span-2">
                                <PlanDistributionChart summary={summary} />
                            </div>
                        </div>

                        {/* ROW 3 — VENDOR LEADERBOARD */}
                        <VendorLeaderboard 
                            data={leaderboard} 
                            onVendorClick={(v) => setSelectedVendor(v)} 
                        />

                        {/* ROW 4 — CHURN RISK */}
                        <ChurnRiskTable 
                            data={churnRisk} 
                            onReEngage={(v) => setReEngageVendor(v)}
                        />

                        {/* ROW 5 & 6 — PRODUCTS */}
                        <div className="grid grid-cols-1 gap-6">
                            <TopProductsGrid products={topProducts} />
                        </div>
                    </>
                )}
            </div>

            {/* Modals & Overlays */}
            <VendorDetailSlideOver 
                vendor={selectedVendor} 
                onClose={() => setSelectedVendor(null)} 
            />
            <ReEngagementModal 
                vendor={reEngageVendor} 
                onClose={() => setReEngageVendor(null)} 
            />
        </div>
    );
}
