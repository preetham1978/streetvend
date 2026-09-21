import { apiFetch } from '../lib/apiFetch';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { mockDb, supabase, mapVendorFromDb } from '../lib/supabase';
import { Vendor } from '../lib/database.types';
import { QrCode, Search, LogOut, Check, Upload, Shield, CreditCard, Store, Sparkles, Activity, Trash2, Edit3, ShieldAlert, KeyRound, Clock, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight, Lock, X, Copy, Archive, FileText, Printer } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { logAdminAction } from '../lib/audit';
import { PLANS_CONFIG, PlanTier } from '../config/pricing';
import CustomerTaxBillsModal from '../components/CustomerTaxBillsModal';
import TimberInvoiceReplicaModal from '../components/TimberInvoiceReplicaModal';

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

    // Login Form State
    const [adminEmail, setAdminEmail] = useState('admin@streetvend.app');
    const [adminPassword, setAdminPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Rate limiting & lockout state
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);

    // Dashboard Data State
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'vendors' | 'payments' | 'audit_logs' | 'bill_archives'>('vendors');
    const [showTaxBillsModal, setShowTaxBillsModal] = useState(false);
    const [selectedReplicaOrder, setSelectedReplicaOrder] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [selectedVendorForQr, setSelectedVendorForQr] = useState<Vendor | null>(null);
    const [armedVendorId, setArmedVendorId] = useState<string | null>(null);

    // Audit logs state
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

    // UPI Upgrade Requests state
    const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
    const [rejectModalData, setRejectModalData] = useState<any | null>(null);
    const [rejectReasonText, setRejectReasonText] = useState('');

    const fetchUpgradeRequests = async () => {
        setIsLoadingRequests(true);
        try {
            const res = await apiFetch('/api/admin/upgrade-requests');
            const data = await res.json();
            if (data && data.requests) {
                setUpgradeRequests(data.requests);
            }
        } catch (err) {
            console.error("Failed to fetch upgrade requests:", err);
        } finally {
            setIsLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (isAdmin && activeTab === 'payments') {
            fetchUpgradeRequests();
        }
    }, [activeTab, isAdmin]);

    const handleApproveRequest = async (req: any) => {
        if (!req.id || !req.vendor_id || !req.tier) return;
        setActionProcessingId(req.id);
        try {
            const res = await apiFetch('/api/admin/approve-upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: req.id,
                    vendorId: req.vendor_id,
                    targetPlan: req.tier
                })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                alert("Approval failed: " + (data.error || "Unknown error"));
            } else {
                setVendors(prev => prev.map(v => v.id === req.vendor_id ? { ...v, subscription: req.tier } : v));
                await fetchUpgradeRequests();
            }
        } catch (err: any) {
            alert("Approval error: " + err.message);
        } finally {
            setActionProcessingId(null);
        }
    };

    const handleRejectRequestConfirm = async () => {
        if (!rejectModalData) return;
        setActionProcessingId(rejectModalData.id);
        try {
            const res = await apiFetch('/api/admin/reject-upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: rejectModalData.id,
                    reason: rejectReasonText.trim() || 'Invalid or unverified UTR reference number.'
                })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                alert("Rejection failed: " + (data.error || "Unknown error"));
            } else {
                setRejectModalData(null);
                setRejectReasonText('');
                await fetchUpgradeRequests();
            }
        } catch (err: any) {
            alert("Rejection error: " + err.message);
        } finally {
            setActionProcessingId(null);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check rate limit status on load
    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await apiFetch('/api/admin-login-status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.isLockedOut) {
                        setIsLockedOut(true);
                        setLockoutRemainingSeconds(data.lockoutRemainingSeconds || 900);
                    }
                }
            } catch (e) {
                // Ignore status check errors
            }
        }
        checkStatus();
    }, []);

    // Countdown interval for account lockout
    useEffect(() => {
        if (isLockedOut && lockoutRemainingSeconds > 0) {
            const timer = setInterval(() => {
                setLockoutRemainingSeconds(prev => {
                    if (prev <= 1) {
                        setIsLockedOut(false);
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isLockedOut, lockoutRemainingSeconds]);

    const formatLockoutTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    };

    const handleAdminLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLockedOut) return;

        if (!adminEmail.trim() || !adminEmail.includes('@')) {
            setPasswordError('Please enter a valid admin email address.');
            return;
        }

        if (!adminPassword.trim()) {
            setPasswordError('Please enter the admin password.');
            return;
        }

        setIsSubmitting(true);
        setPasswordError('');

        try {
            const res = await apiFetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: adminEmail, password: adminPassword })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                loginAdmin();
                setAdminPassword('');
                setPasswordError('');
                window.scrollTo(0, 0);
            } else if (res.status === 429 || data.isLockedOut) {
                setIsLockedOut(true);
                setLockoutRemainingSeconds(data.lockoutRemainingSeconds || 900);
                setPasswordError(data.error || 'Account locked due to consecutive failed attempts.');
            } else {
                setPasswordError(data.error || 'Incorrect admin password.');
            }
        } catch (err) {
            setPasswordError('Unable to authenticate with server. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchAuditLogs = async () => {
        setIsLoadingAuditLogs(true);
        try {
            const res = await apiFetch('/api/admin/audit-logs');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setAuditLogs(data.logs || []);
                }
            }
        } catch (err) {
            console.error("Failed to fetch audit logs:", err);
        } finally {
            setIsLoadingAuditLogs(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        if (isAdmin && activeTab === 'audit_logs') {
            fetchAuditLogs();
        }
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
            if (import.meta.env.DEV) {
                setVendors(mockDb.vendors as Vendor[]);
            } else {
                setVendors([]);
            }
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

    const deleteVendor = async (rawId: string) => {
        const id = String(rawId);
        if (armedVendorId !== id) {
            setArmedVendorId(id);
            setTimeout(() => {
                setArmedVendorId(prev => (prev === id ? null : prev));
            }, 4000);
            return;
        }

        setArmedVendorId(null);
        setVendors(prev => prev.filter(v => String(v.id) !== id));
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
                <div 
                    className="max-w-md w-full bg-bg-surface border border-border-subtle rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center"
                >
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl"></div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20 relative group">
                            <div className="absolute inset-0 bg-brand-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Shield className="w-8 h-8 text-brand-500 relative z-10" />
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-text-primary tracking-tight mb-2">
                            Admin Portal
                        </h1>
                        <p className="text-text-tertiary font-bold uppercase tracking-widest text-[10px]">
                            StreetVend Control & Administrative Oversight
                        </p>
                    </div>

                    {/* LOCKOUT WARNING BANNER */}
                    {isLockedOut && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-left flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">
                                    ACCOUNT LOCKED
                                </p>
                                <p className="text-xs text-text-primary font-medium leading-relaxed mb-2">
                                    Too many failed authentication attempts. Access is locked to prevent brute-force attacks.
                                </p>
                                <div className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-mono font-bold">
                                    <Clock className="w-3.5 h-3.5" />
                                    Try again in {formatLockoutTime(lockoutRemainingSeconds)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ADMIN CREDENTIALS FORM */}
                    <form onSubmit={handleAdminLoginSubmit} className="text-left space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">
                                ADMIN EMAIL
                            </label>
                            <input
                                type="email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                placeholder="admin@streetvend.app"
                                disabled={isLockedOut || isSubmitting}
                                className="w-full bg-bg-base text-text-primary font-bold rounded-xl px-4 py-3.5 border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">
                                ADMIN PASSWORD
                            </label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={isLockedOut || isSubmitting}
                                className="w-full bg-bg-base text-text-primary font-bold rounded-xl px-4 py-3.5 border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm disabled:opacity-50"
                            />
                            {passwordError && (
                                <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    {passwordError}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || isLockedOut}
                            className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs primary-button-gradient text-white shadow-xl shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
                        >
                            {isSubmitting ? (
                                'Authenticating...'
                            ) : (
                                <>
                                    Sign In to Admin Portal
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
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
                            VeloAI payment ledger · vendor plans · 2FA security audit
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="bg-bg-surface border border-border-subtle hover:border-text-secondary text-text-secondary hover:text-text-primary px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Admin Logout
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
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
                            "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                            activeTab === 'vendors'
                                ? "bg-brand-500 border-transparent text-white shadow-lg shadow-brand-500/20"
                                : "bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary"
                        )}
                    >
                        <QrCode className="w-4 h-4" />
                        Vendors & QR
                    </button>

                    <button
                        onClick={() => setActiveTab('audit_logs')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                            activeTab === 'audit_logs'
                                ? "bg-brand-500 border-transparent text-white shadow-lg shadow-brand-500/20"
                                : "bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary"
                        )}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        Security Audit Logs
                    </button>

                    <button
                        onClick={() => setActiveTab('bill_archives')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                            activeTab === 'bill_archives'
                                ? "bg-amber-500 border-transparent text-white shadow-lg shadow-amber-500/20"
                                : "bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary"
                        )}
                    >
                        <Archive className="w-4 h-4 text-amber-400" />
                        Tax Archives & DB Bill Retention
                    </button>

                    <button
                        onClick={() => navigate('/admin/analytics')}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-500 cursor-pointer"
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

                        <div className="grid grid-cols-1 gap-4">
                            {filteredVendors.map(vendor => {
                                const pCfg = PLANS_CONFIG[vendor.subscription as PlanTier] || PLANS_CONFIG.free;
                                const pIcon = vendor.subscription === 'enterprise' ? '👑' : vendor.subscription === 'growth' ? '🚀' : vendor.subscription === 'professional' ? '⚡' : vendor.subscription === 'starter' ? '🔥' : '🌱';
                                return (
                                    <div
                                        key={vendor.id}
                                        className="bg-bg-surface border border-border-subtle rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-border-strong transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-bg-surface-inset border border-border-subtle flex items-center justify-center font-bold text-text-primary shrink-0 text-sm">
                                                {pIcon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-text-primary text-sm sm:text-base">{vendor.storeName}</h3>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                                                        vendor.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}>
                                                        {vendor.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-secondary mt-0.5">
                                                    Owner: <span className="font-semibold text-text-primary">{vendor.ownerName}</span> · Phone: {vendor.phone} · Category: {vendor.category}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                                            <div className="flex items-center gap-1 bg-bg-surface-inset border border-border-subtle rounded-lg px-2.5 py-1 text-xs font-bold">
                                                <span>Plan:</span>
                                                <select
                                                    value={vendor.subscription}
                                                    onChange={(e) => changeVendorPlan(vendor.id, e.target.value)}
                                                    className="bg-transparent text-brand-500 font-extrabold focus:outline-none cursor-pointer"
                                                >
                                                    <option value="free">🌱 Free</option>
                                                    <option value="starter">🔥 Starter</option>
                                                    <option value="professional">⚡ Professional</option>
                                                    <option value="growth">🚀 Growth</option>
                                                    <option value="enterprise">👑 Enterprise</option>
                                                </select>
                                            </div>

                                            <button
                                                onClick={() => handleUploadQrClick(vendor)}
                                                className="bg-bg-surface border border-border-subtle hover:border-brand-500 text-text-primary font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                                Upload QR
                                            </button>

                                            <button
                                                onClick={() => toggleVendorActive(vendor.id)}
                                                className="bg-bg-surface border border-border-subtle hover:border-text-secondary text-text-primary font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                                                title="Toggle Active Status"
                                            >
                                                {vendor.isActive ? "Deactivate" : "Activate"}
                                            </button>

                                            <button
                                                onClick={() => deleteVendor(vendor.id)}
                                                className={cn(
                                                    "p-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold cursor-pointer",
                                                    armedVendorId === vendor.id
                                                        ? "bg-red-600 text-white border-red-600 animate-pulse"
                                                        : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"
                                                )}
                                                title={armedVendorId === vendor.id ? "Click again to confirm" : "Delete Vendor"}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                {armedVendorId === vendor.id && <span>Confirm?</span>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : activeTab === 'payments' ? (
                    /* Payments & Plans Tab */
                    <div className="space-y-8">
                        {/* Pending & Recent UPI Upgrade Requests Card */}
                        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                        <span>UPI Payment Upgrade Requests</span>
                                        {upgradeRequests.filter(r => r.status === 'pending_verification').length > 0 && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-black animate-pulse">
                                                {upgradeRequests.filter(r => r.status === 'pending_verification').length} PENDING
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-xs text-text-secondary mt-1">
                                        Manual UTR reference verification for vendor plan upgrades. Verify incoming payments in bank/UPI app before approving.
                                    </p>
                                </div>
                                <button
                                    onClick={fetchUpgradeRequests}
                                    disabled={isLoadingRequests}
                                    className="px-3.5 py-2 rounded-xl bg-bg-base border border-border-subtle hover:border-brand-500 text-text-primary text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                    <RefreshCw className={cn("w-3.5 h-3.5", isLoadingRequests && "animate-spin")} />
                                    <span>Refresh Requests</span>
                                </button>
                            </div>

                            {isLoadingRequests ? (
                                <div className="py-12 text-center text-text-tertiary">
                                    <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
                                    <p className="text-xs font-medium">Loading upgrade requests...</p>
                                </div>
                            ) : upgradeRequests.length === 0 ? (
                                <div className="p-8 text-center bg-bg-base rounded-2xl border border-border-subtle text-text-tertiary text-xs">
                                    No UPI upgrade requests submitted yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-border-subtle text-text-secondary uppercase tracking-wider">
                                                <th className="py-3 px-4">Store / Vendor</th>
                                                <th className="py-3 px-4">Requested Plan</th>
                                                <th className="py-3 px-4">Payable Amount</th>
                                                <th className="py-3 px-4">UTR Reference Number</th>
                                                <th className="py-3 px-4">Submitted At</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle">
                                            {upgradeRequests.map((req) => {
                                                const isPending = req.status === 'pending_verification';
                                                const isApproved = req.status === 'approved' || req.status === 'success';
                                                const isRejected = req.status === 'rejected';
                                                const planName = req.plan_name || req.tier || 'Upgrade';

                                                return (
                                                    <tr key={req.id} className="hover:bg-bg-base/50 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-text-primary">
                                                            <div>{req.storeName}</div>
                                                            <div className="text-[10px] font-normal text-text-tertiary">{req.ownerName} ({req.vendor_id})</div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="px-2.5 py-1 rounded-lg font-bold bg-brand-500/10 text-brand-500 border border-brand-500/20 capitalize">
                                                                {planName}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-bold text-emerald-500">
                                                            ₹{req.amount}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold text-text-primary">
                                                            <span className="px-2 py-1 bg-bg-base rounded border border-border-subtle select-all">
                                                                {req.gateway_ref || req.utr || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-text-tertiary">
                                                            {new Date(req.created_at).toLocaleString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            {isPending && (
                                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1 w-fit">
                                                                    <Clock className="w-3 h-3 animate-pulse" /> PENDING
                                                                </span>
                                                            )}
                                                            {isApproved && (
                                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                                                    <CheckCircle2 className="w-3 h-3" /> APPROVED
                                                                </span>
                                                            )}
                                                            {isRejected && (
                                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-1 w-fit">
                                                                    <X className="w-3 h-3" /> REJECTED
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            {isPending ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleApproveRequest(req)}
                                                                        disabled={actionProcessingId === req.id}
                                                                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        <span>Approve</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setRejectModalData(req)}
                                                                        disabled={actionProcessingId === req.id}
                                                                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                        <span>Reject</span>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-text-tertiary text-[11px]">
                                                                    Reviewed
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Existing Vendor Active Subscriptions Table */}
                        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Active Vendor Plan Subscriptions</h2>
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
                                            const pCfg = PLANS_CONFIG[v.subscription as PlanTier] || PLANS_CONFIG.free;
                                            const pIcon = v.subscription === 'enterprise' ? '👑' : v.subscription === 'growth' ? '🚀' : v.subscription === 'professional' ? '⚡' : v.subscription === 'starter' ? '🔥' : '🌱';
                                            const meta = vendorMetaMap[v.storeName] || {
                                                ordersCount: 1,
                                                gmv: "250"
                                            };
                                            const displaySubPaid = pCfg.monthlyPrice;
                                            return (
                                                <tr key={v.id} className="hover:bg-bg-base/50 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-text-primary">{v.storeName}</td>
                                                    <td className="py-3.5 px-4 text-text-secondary">{pIcon} {pCfg.name}</td>
                                                    <td className="py-3.5 px-4 font-bold text-emerald-500">₹{displaySubPaid}</td>
                                                    <td className="py-3.5 px-4 text-text-primary font-bold">₹{meta.gmv}</td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            ACTIVE
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* SECURITY AUDIT LOGS TAB */
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-brand-500" />
                                    Security Audit Logs & Access Alerts
                                </h2>
                                <p className="text-xs text-text-secondary mt-1">
                                    Real-time audit log of admin authentications, password checks, rate-limit enforcement, and account lockouts.
                                </p>
                            </div>

                            <button
                                onClick={fetchAuditLogs}
                                disabled={isLoadingAuditLogs}
                                className="bg-bg-surface-inset border border-border-subtle hover:border-brand-500 text-text-primary font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingAuditLogs && "animate-spin")} />
                                Refresh Logs
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-border-subtle text-text-secondary uppercase tracking-wider text-[10px] font-bold">
                                        <th className="py-3 px-4">Timestamp</th>
                                        <th className="py-3 px-4">Security Action</th>
                                        <th className="py-3 px-4">Admin Identifier</th>
                                        <th className="py-3 px-4">IP Address</th>
                                        <th className="py-3 px-4">Details / Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-text-tertiary">
                                                {isLoadingAuditLogs ? 'Loading security audit logs...' : 'No audit log entries recorded yet.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log, i) => {
                                            const action = log.action || 'UNKNOWN_ACTION';
                                            const details = typeof log.details === 'object' ? log.details : {};
                                            const email = details.email || log.admin_user_id || 'admin';
                                            const ip = log.ip_address || details.ip || '—';
                                            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : '—';

                                            let actionBadge = (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-bg-surface-inset text-text-secondary border border-border-subtle">
                                                    {action}
                                                </span>
                                            );

                                            if (action.includes('LOCKOUT') || action.includes('BLOCKED')) {
                                                actionBadge = (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/30 flex items-center gap-1 w-fit">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        {action}
                                                    </span>
                                                );
                                            } else if (action.includes('FAILED')) {
                                                actionBadge = (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1 w-fit">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {action}
                                                    </span>
                                                );
                                            } else if (action.includes('SUCCESSFUL')) {
                                                actionBadge = (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {action}
                                                    </span>
                                                );
                                            } else if (action.includes('OTP_SENT')) {
                                                actionBadge = (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30 flex items-center gap-1 w-fit">
                                                        <KeyRound className="w-3 h-3" />
                                                        {action}
                                                    </span>
                                                );
                                            }

                                            return (
                                                <tr key={log.id || i} className="hover:bg-bg-base/50 transition-colors">
                                                    <td className="py-3 px-4 font-mono text-text-secondary whitespace-nowrap">{timeStr}</td>
                                                    <td className="py-3 px-4">{actionBadge}</td>
                                                    <td className="py-3 px-4 font-semibold text-text-primary">{email}</td>
                                                    <td className="py-3 px-4 font-mono text-text-secondary">{ip}</td>
                                                    <td className="py-3 px-4 text-text-secondary">
                                                        {details.reason || details.message || JSON.stringify(details)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'bill_archives' && (
                    <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
                            <div>
                                <h2 className="text-2xl font-black text-text-primary flex items-center gap-3">
                                    <Archive className="w-6 h-6 text-amber-500" />
                                    Database Bill Archival & 1-Year Tax Management
                                </h2>
                                <p className="text-xs text-text-secondary mt-1">
                                    Admin-only archive repository for previous dated customer bills and 1-year tax compliance exports.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-3 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
                                    <Shield className="w-4 h-4" /> Admin Authorized
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">📜 1-Year Customer Tax Downloads</div>
                                <p className="text-xs text-text-secondary">Filter customer bills by 1-year window, customer name, GSTIN, or phone, and download structured CSV tax statements.</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-brand-500/10 border border-brand-500/30 space-y-2">
                                <div className="text-xs font-bold text-brand-500 uppercase tracking-wider">🔒 Admin DB Archiving</div>
                                <p className="text-xs text-text-secondary">Previous dated bills can be archived directly in the database (`is_archived: true`) by Admin for 7+ years tax retention.</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                                <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider">🖨️ Replica Invoices</div>
                                <p className="text-xs text-text-secondary">View and print exact physical timber bill replicas with cut dimensions, HSN codes, and GST breakdown.</p>
                            </div>
                        </div>

                        {/* Inline Embedded Tax & Archive Portal */}
                        <div className="pt-2">
                            <CustomerTaxBillsModal
                                isOpen={true}
                                onClose={() => {}}
                                isAdmin={true}
                                onViewBillReplica={(order) => {
                                    setSelectedReplicaOrder(order);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <TimberInvoiceReplicaModal
                isOpen={!!selectedReplicaOrder}
                onClose={() => setSelectedReplicaOrder(null)}
                orderData={selectedReplicaOrder}
            />

            {/* Reject Request Modal */}
            <AnimatePresence>
                {rejectModalData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border-subtle p-6 space-y-4"
                        >
                            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
                                <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                                    <X className="w-5 h-5 text-red-500" />
                                    Reject Upgrade Request
                                </h3>
                                <button
                                    onClick={() => setRejectModalData(null)}
                                    className="p-1 rounded bg-bg-base hover:bg-border-subtle transition-colors text-text-tertiary"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-text-secondary">
                                Rejecting request for vendor <strong className="text-text-primary">{rejectModalData.storeName}</strong> ({rejectModalData.tier} plan, ₹{rejectModalData.amount}).
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Rejection Reason</label>
                                <textarea
                                    value={rejectReasonText}
                                    onChange={(e) => setRejectReasonText(e.target.value)}
                                    placeholder="e.g. UTR reference not found in bank statement or amount mismatched."
                                    className="w-full h-24 p-3 bg-bg-base border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setRejectModalData(null)}
                                    className="px-4 py-2 rounded-xl bg-bg-base text-text-secondary font-bold text-xs hover:text-text-primary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectRequestConfirm}
                                    disabled={actionProcessingId === rejectModalData.id}
                                    className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 cursor-pointer disabled:opacity-50"
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
