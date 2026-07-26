import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { mockDb, supabase, mapVendorFromDb } from '../lib/supabase';
import { Vendor } from '../lib/database.types';
import { QrCode, Search, LogOut, Check, Upload, Shield, CreditCard, Store, Sparkles, Activity, Trash2, Edit3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { logAdminAction } from '../lib/audit';
import { PLANS_CONFIG, PlanTier } from '../config/pricing';

interface VendorMeta {
    planIcon: string;
    planLabel: string;
    ordersCount: number;
    gmv: string;
    subPaid: string;
}

const vendorMetaMap: Record<string, VendorMeta> = {
    "Raju's Chaat Corner": {
        planIcon: "⚡",
        planLabel: "Professional",
        ordersCount: 3,
        gmv: "467.25",
        subPaid: "599"
    },
    "Fresh Green Organics": {
        planIcon: "🔥",
        planLabel: "Starter",
        ordersCount: 1,
        gmv: "273",
        subPaid: "299"
    },
    "Al-Noor Meat Shop": {
        planIcon: "👑",
        planLabel: "Enterprise",
        ordersCount: 1,
        gmv: "462",
        subPaid: "0"
    },
    "Aunty's Dosa Point": {
        planIcon: "🔥",
        planLabel: "Starter",
        ordersCount: 1,
        gmv: "231",
        subPaid: "0"
    },
    "Preetham's Kabab": {
        planIcon: "🌱",
        planLabel: "Free",
        ordersCount: 4,
        gmv: "3,832.5",
        subPaid: "0"
    },
    "Sai Kirana Store": {
        planIcon: "🌱",
        planLabel: "Free",
        ordersCount: 1,
        gmv: "301.35",
        subPaid: "0"
    },
    "Preetham's Kebab": {
        planIcon: "👑",
        planLabel: "Enterprise",
        ordersCount: 2,
        gmv: "1,197",
        subPaid: "1,179"
    }
};

export default function AdminDashboard() {
    const { isAdmin, loginAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [adminPassword, setAdminPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'vendors' | 'payments'>('vendors');
    const [search, setSearch] = useState('');
    const [selectedVendorForQr, setSelectedVendorForQr] = useState<Vendor | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAdminLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminPassword.trim()) {
            setPasswordError('Please enter the admin password.');
            return;
        }

        setIsSubmitting(true);
        setPasswordError('');

        try {
            const res = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                loginAdmin();
                setAdminPassword('');
                setPasswordError('');
                window.scrollTo(0, 0);
            } else {
                setPasswordError(data.error || 'Incorrect admin password.');
            }
        } catch (err) {
            setPasswordError('Unable to authenticate with server. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab, isAdmin]);

    useEffect(() => {
        async function fetchVendors() {
            setIsLoading(true);
            if (supabase) {
                try {
                    const { data, error } = await supabase.from('vendors').select('*');
                    if (data && !error && data.length > 0) {
                        setVendors(data.map(mapVendorFromDb));
                        setIsLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error('Error fetching vendors from Supabase:', err);
                }
            }
            setVendors(mockDb.vendors as Vendor[]);
            setIsLoading(false);
        }
        fetchVendors();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const toggleVendorActive = async (id: string) => {
        const vendor = vendors.find(v => v.id === id);
        if (!vendor) return;
        
        const newStatus = !vendor.isActive;
        setVendors(prev => prev.map(v => v.id === id ? { ...v, isActive: newStatus } : v));
        
        if (supabase) {
            await logAdminAction('admin-id', `toggled_vendor_active`, { vendor_id: id, new_status: newStatus });
        }
    };

    const deleteVendor = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this vendor? This action is irreversible.')) return;
        
        setVendors(prev => prev.filter(v => v.id !== id));
        if (supabase) {
            await logAdminAction('admin-id', `deleted_vendor`, { vendor_id: id });
        }
    };

    const changeVendorPlan = async (id: string, newPlan: string) => {
        setVendors(prev => prev.map(v => v.id === id ? { ...v, plan: newPlan as any } : v));
        if (supabase) {
            await logAdminAction('admin-id', `changed_vendor_plan`, { vendor_id: id, new_plan: newPlan });
        }
    };

    const handleUploadQrClick = (vendor: Vendor) => {
        setSelectedVendorForQr(vendor);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedVendorForQr) {
            const fakeUrl = URL.createObjectURL(file);
            setVendors(prev => prev.map(v => v.id === selectedVendorForQr.id ? { ...v, qrCodeUrl: fakeUrl } : v));
            setSelectedVendorForQr(null);
        }
    };

    const activeCount = vendors.filter(v => v.isActive).length;
    const qrCount = vendors.filter(v => v.qrCodeUrl !== null).length;

    const filteredVendors = vendors.filter(v => 
        v.storeName.toLowerCase().includes(search.toLowerCase()) ||
        v.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        v.phone.includes(search)
    );

    if (!isAdmin) {
        return (
            <div className="min-h-[85vh] bg-bg-base text-text-primary flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-bg-surface border border-border-subtle rounded-3xl p-8 sm:p-10 shadow-card text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary">
                            <Shield className="w-6 h-6 text-text-primary" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-display font-black text-text-primary tracking-tight mb-2">
                        Admin Portal
                    </h1>
                    <p className="text-xs text-text-secondary font-medium mb-8">
                        Platform administration access
                    </p>

                    <form onSubmit={handleAdminLoginSubmit} className="text-left space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                                ADMIN PASSWORD
                            </label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-bg-surface-inset text-text-primary font-semibold rounded-2xl px-4 py-3.5 border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                            />
                            {passwordError && (
                                <p className="text-xs text-red-500 mt-2 font-medium">{passwordError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-sm py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98] mt-4 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Verifying...' : 'Enter Admin'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans">
            {/* Hidden File Input for QR Upload */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />

            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight text-text-primary mb-1">
                            Admin Dashboard
                        </h1>
                        <p className="text-xs text-text-secondary font-medium">
                            VeloAI payment ledger · vendor plans · QR management
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out Admin
                    </button>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                            activeTab === 'payments'
                                ? "bg-brand-500 border-transparent text-white shadow-lg shadow-brand-500/20"
                                : "bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary"
                        )}
                    >
                        <CreditCard className="w-4 h-4" />
                        Payments & Plans
                    </button>

                    <button
                        onClick={() => setActiveTab('vendors')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                            activeTab === 'vendors'
                                ? "bg-brand-500 border-transparent text-white shadow-lg shadow-brand-500/20"
                                : "bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary"
                        )}
                    >
                        <QrCode className="w-4 h-4" />
                        Vendors & QR
                    </button>

                    <button
                        onClick={() => navigate('/admin/analytics')}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-500"
                    >
                        <Activity className="w-4 h-4" />
                        Platform Analytics
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-card">
                        <p className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mb-2">
                            TOTAL VENDORS
                        </p>
                        <p className="text-4xl font-sans font-extrabold text-brand-500 not-italic">
                            {vendors.length}
                        </p>
                    </div>

                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-card">
                        <p className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mb-2">
                            ACTIVE STORES
                        </p>
                        <p className="text-4xl font-sans font-extrabold text-brand-500 not-italic">
                            {activeCount}
                        </p>
                    </div>

                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-card">
                        <p className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mb-2">
                            QR CODES UPLOADED
                        </p>
                        <p className="text-4xl font-sans font-extrabold text-brand-500 not-italic">
                            {qrCount}
                        </p>
                    </div>

                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-card">
                        <p className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mb-2">
                            PLATFORM GMV
                        </p>
                        <p className="text-4xl font-sans font-extrabold text-brand-500 not-italic">
                            ₹6,764.1
                        </p>
                    </div>
                </div>

                {/* Main Content Box */}
                {activeTab === 'vendors' ? (
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <h2 className="text-xl font-bold text-text-primary tracking-tight">Vendors</h2>
                            
                            <div className="relative w-64 sm:w-80">
                                <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search vendors..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-bg-surface-inset border border-border-subtle text-xs text-text-primary placeholder-text-muted rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors font-medium"
                                />
                            </div>
                        </div>

                        {/* Vendors List */}
                        <div className="space-y-3">
                            {filteredVendors.map((vendor) => {
                                const meta = vendorMetaMap[vendor.storeName] || {
                                    planIcon: "⚡",
                                    planLabel: vendor.plan,
                                    ordersCount: 1,
                                    gmv: "250",
                                    subPaid: vendor.subPaid.toString()
                                };

                                return (
                                    <div
                                        key={vendor.id}
                                        className="bg-bg-surface-inset hover:bg-bg-base/30 border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0 text-text-secondary">
                                                <QrCode className="w-5 h-5" />
                                            </div>

                                            <div>
                                                <h3 className="text-base font-bold text-text-primary leading-snug">
                                                    {vendor.storeName}
                                                </h3>
                                                <p className="text-xs text-text-secondary mb-1">
                                                    {vendor.ownerName} · {vendor.phone} · {vendor.category}
                                                </p>
                                                <p className="text-xs text-text-primary font-medium">
                                                    <span>{
                                                        vendor.plan === 'enterprise' ? '👑' :
                                                        vendor.plan === 'growth' ? '🚀' :
                                                        vendor.plan === 'professional' ? '⚡' :
                                                        vendor.plan === 'starter' ? '🔥' : '🌱'
                                                    } {PLANS_CONFIG[vendor.plan as PlanTier]?.name || vendor.plan}</span>
                                                    <span className="mx-1 font-bold text-text-tertiary">·</span>
                                                    <span>{meta.ordersCount} orders</span>
                                                    <span className="mx-1 font-bold text-text-tertiary">·</span>
                                                    <span>₹{meta.gmv}</span>
                                                    <span className="mx-1 font-bold text-text-tertiary">·</span>
                                                    <span>sub paid ₹{vendor.subPaid > 0 ? vendor.subPaid : (PLANS_CONFIG[vendor.plan as PlanTier]?.monthlyPrice || 0)}</span>
                                                    <span className="mx-1 font-bold text-text-tertiary">·</span>
                                                    <span className={vendor.qrCodeUrl ? "text-emerald-500 font-bold" : "text-text-secondary"}>
                                                        {vendor.qrCodeUrl ? "QR Uploaded" : "No QR"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                                            <span
                                                className={cn(
                                                    "px-3 py-1 rounded-lg text-xs font-bold border",
                                                    vendor.isActive
                                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        : "bg-red-500/10 text-red-500 border-red-500/20"
                                                )}
                                            >
                                                {vendor.isActive ? "Active" : "Inactive"}
                                            </span>

                                            <button
                                                onClick={() => handleUploadQrClick(vendor)}
                                                className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                                Upload QR
                                            </button>

                                            <button
                                                onClick={() => toggleVendorActive(vendor.id)}
                                                className="bg-bg-surface border border-border-subtle hover:border-text-secondary text-text-primary font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all active:scale-95"
                                                title="Toggle Active Status"
                                            >
                                                {vendor.isActive ? "Deactivate" : "Activate"}
                                            </button>

                                            <button
                                                onClick={() => deleteVendor(vendor.id)}
                                                className="p-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 transition-all hover:text-white"
                                                title="Delete Vendor"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Payments & Plans Tab */
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
                        <h2 className="text-xl font-bold text-text-primary mb-6">Payment Ledger & Subscriptions</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-border-subtle text-text-secondary uppercase tracking-wider">
                                        <th className="py-3 px-4">Vendor</th>
                                        <th className="py-3 px-4">Plan</th>
                                        <th className="py-3 px-4">Sub Amount Paid</th>
                                        <th className="py-3 px-4">Orders GMV</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {vendors.map(v => {
                                        const pCfg = PLANS_CONFIG[v.plan as PlanTier] || PLANS_CONFIG.free;
                                        const pIcon = v.plan === 'enterprise' ? '👑' : v.plan === 'growth' ? '🚀' : v.plan === 'professional' ? '⚡' : v.plan === 'starter' ? '🔥' : '🌱';
                                        const meta = vendorMetaMap[v.storeName] || {
                                            ordersCount: 1,
                                            gmv: "250"
                                        };
                                        const displaySubPaid = v.subPaid > 0 ? v.subPaid : pCfg.monthlyPrice;
                                        return (
                                            <tr key={v.id} className="hover:bg-bg-base/50 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-text-primary">{v.storeName}</td>
                                                <td className="py-3.5 px-4 text-text-secondary">{pIcon} {pCfg.name}</td>
                                                <td className="py-3.5 px-4 font-bold text-emerald-500">₹{displaySubPaid}</td>
                                                <td className="py-3.5 px-4 text-text-primary font-bold">₹{meta.gmv}</td>
                                                <td className="py-3.5 px-4">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        VERIFIED
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
