import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/I18nContext';
import { Store, Globe, ChevronDown, LogOut, LayoutDashboard, Settings, Bell, Sun, Moon, ShoppingCart, Package, Sparkles, Wand2, PieChart, Check, CheckCheck, Trash2, AlertTriangle, MessageSquare, Mic, Menu, X, Receipt, Crown, Monitor, Database, Download, Smartphone, Wifi, WifiOff, User } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState, useRef, useEffect, ReactNode, MouseEvent } from 'react';
import type { Language } from '../lib/I18nContext';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../lib/ThemeContext';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from './UpgradeModal';
import DeviceSessionManager from './DeviceSessionManager';
import { supabase } from '../lib/supabase';

import { createPortal } from 'react-dom';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: string;
    type: 'order' | 'stock' | 'voice' | 'ai';
    read: boolean;
    link?: string;
}

// Helper for Portal Dropdowns
const DropdownPortal = ({ children, triggerRef, isOpen, onClose, width = 300, align = 'right' }: { children: ReactNode, triggerRef: React.RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void, width?: number | string, align?: 'left' | 'right' }) => {
    const [coords, setCoords] = useState({ top: 0, right: 0, left: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const top = rect.bottom + 8;
            
            if (align === 'right') {
                const right = Math.max(12, viewportWidth - rect.right);
                setCoords({ top, right, left: 0 });
            } else {
                const left = Math.max(12, rect.left);
                setCoords({ top, right: 0, left });
            }
        }
    }, [isOpen, triggerRef, align]);

    if (!isOpen || !mounted || typeof document === 'undefined' || !document.body) return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                data-dropdown-portal="true"
                className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-200"
                style={{ 
                    top: coords.top, 
                    right: align === 'right' ? coords.right : 'auto',
                    left: align === 'left' ? coords.left : 'auto',
                    width: typeof width === 'number' ? `${width}px` : width,
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: `calc(100vh - ${coords.top}px - 16px)`,
                    overflowY: 'auto'
                }}
            >
                {children}
            </div>
        </>,
        document.body
    );
};

export default function Navigation() {
    const { user, isAdmin, isSuperAdmin, logout } = useAuth();
    const { language, setLanguage, t } = useI18n();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { currentPlan, config: planConfig } = usePlanLimits();

    const [isLangOpen, setIsLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);

    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showDeviceManager, setShowDeviceManager] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Network connectivity tracking using navigator.onLine
    const [isOnline, setIsOnline] = useState<boolean>(() => 
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        if (isMobileMenuOpen) {
            document.addEventListener('keydown', handleEsc);
            // Prevent body scroll when drawer is open
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isMobileMenuOpen]);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const [notifications, setNotifications] = useState<NotificationItem[]>([
        {
            id: 'n1',
            title: 'New Bill Generated',
            message: 'Order #ord_7f21 for ₹105 successfully created for Preetham.',
            time: '5m ago',
            type: 'order',
            read: false,
            link: '/cart'
        },
        {
            id: 'n2',
            title: 'Low Stock Warning',
            message: 'Pani Puri stock is low (12 plates left). Consider restocking.',
            time: '18m ago',
            type: 'stock',
            read: false,
            link: '/products'
        },
        {
            id: 'n3',
            title: 'Boli Voice Bill Processed',
            message: '1 offline bill recorded using Boli Mode speech input.',
            time: '1h ago',
            type: 'voice',
            read: false,
            link: '/cart'
        },
        {
            id: 'n4',
            title: 'Peak Hour AI Prediction',
            message: 'Expect 40% higher demand for Snacks between 5 PM - 8 PM.',
            time: '2h ago',
            type: 'ai',
            read: true,
            link: '/ai-insights'
        }
    ]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if ((target as HTMLElement)?.closest?.('[data-dropdown-portal]')) {
                return;
            }
            if (langRef.current && !langRef.current.contains(target)) {
                setIsLangOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(target)) {
                setIsNotifOpen(false);
            }
            if (moreRef.current && !moreRef.current.contains(target)) {
                setIsMoreOpen(false);
            }
            if (accountRef.current && !accountRef.current.contains(target)) {
                setIsAccountOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const removeNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNotificationClick = (item: NotificationItem) => {
        markAsRead(item.id);
        setIsNotifOpen(false);
        if (item.link) {
            navigate(item.link);
        }
    };

    const languages: { code: Language; label: string }[] = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'हिंदी (Hindi)' },
        { code: 'ta', label: 'தமிழ் (Tamil)' },
        { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    ];

    return (
        <>
            <nav className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl overflow-visible">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center w-full min-h-[5rem] gap-2 overflow-visible box-border">
                    {/* Left: Logo Area */}
                    <div className="flex-shrink-0 whitespace-nowrap">
                        <Link to="/" className="flex items-center gap-2 group shrink-0 whitespace-nowrap">
                            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
                                <img src="/favicon.png" alt="Streetvend Logo" className="w-full h-full object-cover shrink-0" />
                            </div>
                            <div className="flex flex-col whitespace-nowrap shrink-0">
                                <div className="flex items-center gap-1 leading-tight whitespace-nowrap shrink-0">
                                    <span className="hidden min-[1201px]:inline font-display font-bold text-base text-text-primary">Velo</span>
                                    <span className="hidden min-[1201px]:inline font-display font-bold text-base text-brand-500">AI's</span>
                                    <span className="hidden min-[1201px]:inline font-display font-bold text-base text-brand-500">-</span>
                                    <span className="font-display font-bold text-base text-brand-500">Streetvend</span>
                                </div>
                                <span className="hidden min-[1501px]:block text-[10px] text-text-secondary font-bold tracking-widest uppercase truncate whitespace-nowrap">
                                    Intelligence for modern vendors
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Center: Flex Spacer */}
                    <div className="flex-1" />

                    {/* Right: Actions Cluster */}
                    <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 min-w-fit overflow-visible">
                        {/* High Frequency Icon-Only Nav Actions (Always Visible 4-Item Cluster: Dashboard, Products, Cart, Account) */}
                        <div className="flex items-center gap-1 sm:gap-1.5 mr-1 pr-1 sm:mr-2 sm:pr-2 border-r border-border-subtle">
                            <Link 
                                to="/dashboard" 
                                title={t('nav.dashboard')}
                                className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                                    location.pathname === '/dashboard' 
                                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" 
                                        : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                                )}
                            >
                                <PieChart className="w-4 h-4 shrink-0" />
                            </Link>
                            <Link 
                                to="/products" 
                                title={t('nav.products')}
                                className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                                    location.pathname === '/products' 
                                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" 
                                        : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                                )}
                            >
                                <Package className="w-4 h-4 shrink-0" />
                            </Link>
                            <Link 
                                to="/cart" 
                                title={t('nav.cart')}
                                className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                                    location.pathname === '/cart' 
                                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" 
                                        : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                                )}
                            >
                                <ShoppingCart className="w-4 h-4 shrink-0" />
                            </Link>

                            {/* Account Dropdown Button (4th item in always-visible cluster) */}
                            <div className="relative shrink-0" ref={accountRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                                    title="Account & Portal Access"
                                    className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                                        isAccountOpen || user
                                            ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
                                            : "text-text-secondary hover:text-text-primary hover:bg-white/5 border border-border-subtle"
                                    )}
                                >
                                    {user ? (
                                        <div className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            {user.storeName.charAt(0)}
                                        </div>
                                    ) : isAdmin ? (
                                        <div className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            A
                                        </div>
                                    ) : (
                                        <User className="w-4 h-4 shrink-0" />
                                    )}
                                </button>

                                {isAccountOpen && (
                                    <DropdownPortal 
                                        triggerRef={accountRef} 
                                        isOpen={isAccountOpen} 
                                        onClose={() => setIsAccountOpen(false)} 
                                        width={320} 
                                        align="right"
                                    >
                                        <div className="w-full rounded-2xl border border-border-subtle bg-bg-surface shadow-2xl overflow-hidden text-left p-2">
                                            {user ? (
                                                <div className="p-3.5 bg-brand-500/5 rounded-xl mb-1.5 border border-brand-500/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                                                            {user.storeName.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-xs text-text-primary truncate">{user.storeName}</p>
                                                            <p className="text-[10px] text-text-secondary truncate">{user.phone || user.ownerName || 'Active Vendor'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-brand-500/10 gap-2">
                                                        <Link
                                                            to="/dashboard"
                                                            onClick={() => setIsAccountOpen(false)}
                                                            className="text-xs font-bold text-brand-500 hover:text-brand-400 flex items-center gap-1 transition-colors whitespace-nowrap"
                                                        >
                                                            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard →
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                console.log('[LOGOUT CLICKED] Vendor Logout');
                                                                await logout();
                                                                setIsAccountOpen(false);
                                                                navigate('/login');
                                                            }}
                                                            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer border border-red-500/20 shrink-0 whitespace-nowrap"
                                                        >
                                                            <LogOut className="w-3.5 h-3.5 shrink-0" /> Logout
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : isAdmin ? (
                                                <div className="p-3.5 bg-red-500/5 rounded-xl mb-1.5 border border-red-500/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                                                            A
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-xs text-text-primary truncate">Administrator</p>
                                                            <p className="text-[10px] text-emerald-400 font-bold truncate">Active Admin Session</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-red-500/10 gap-2">
                                                        <Link
                                                            to="/admin"
                                                            onClick={() => setIsAccountOpen(false)}
                                                            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors whitespace-nowrap"
                                                        >
                                                            <Database className="w-3.5 h-3.5" /> Admin Portal →
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                console.log('[LOGOUT CLICKED] Admin Logout');
                                                                await logout();
                                                                setIsAccountOpen(false);
                                                                navigate('/login');
                                                            }}
                                                            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer border border-red-500/20 shrink-0 whitespace-nowrap"
                                                        >
                                                            <LogOut className="w-3.5 h-3.5 shrink-0" /> Logout Admin
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-2">
                                                    <Link
                                                        to="/login"
                                                        onClick={() => setIsAccountOpen(false)}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-500/10 text-text-primary font-semibold text-xs transition-all"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                                                            <Store className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="leading-tight font-bold text-xs">Vendor Login</p>
                                                            <p className="text-[10px] text-text-tertiary font-normal">Manage store, stock & billing</p>
                                                        </div>
                                                    </Link>
                                                </div>
                                            )}

                                            {!isAdmin && (
                                                <>
                                                    <div className="border-t border-border-subtle my-1" />

                                                    <div className="p-1">
                                                        <Link
                                                            to="/admin"
                                                            onClick={() => setIsAccountOpen(false)}
                                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-text-primary group transition-all"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                                                <Database className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="font-bold text-xs text-text-primary group-hover:text-red-400 transition-colors">Admin Portal</p>
                                                                </div>
                                                                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Staff access</p>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </DropdownPortal>
                                )}
                            </div>
                        </div>

                        {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            aria-label="Toggle theme"
                            className="flex w-9 h-9 rounded-full bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-500/30 transition-all cursor-pointer shadow-sm shrink-0 items-center justify-center"
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                            ) : (
                                <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
                            )}
                        </button>

                        {/* Database Connection Status Badge */}
                        {(isAdmin || isSuperAdmin) && location.pathname.startsWith('/admin') && (
                            <div 
                                className={cn(
                                    "hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] font-extrabold tracking-wider uppercase transition-all select-none shadow-sm whitespace-nowrap min-w-[125px] justify-center shrink-0",
                                    supabase 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                )}
                                title={supabase ? "Supabase Cloud Database connected and operational!" : "Operating in robust offline mode with VeloAI local persistent database fallback."}
                            >
                                <Database className={cn("w-3.5 h-3.5 shrink-0", supabase ? "text-emerald-400 animate-pulse" : "text-amber-400")} />
                                <span className="whitespace-nowrap">{supabase ? "Supabase Active" : "Mock DB Mode"}</span>
                            </div>
                        )}

                        {/* Auth / CTA & Utilities */}
                        {isAdmin ? (
                            <div className="flex items-center gap-3 shrink-0">
                                <button 
                                    onClick={async () => {
                                        await logout();
                                        navigate('/login');
                                    }}
                                    className="px-5 py-2 rounded-full bg-bg-surface border border-border-subtle text-text-primary text-sm font-semibold hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    {t('nav.logoutAdmin')}
                                </button>
                            </div>
                        ) : user ? (
                            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                                {/* Functional Notification Drawer */}
                                <div className="relative shrink-0" ref={notifRef}>
                                    <button 
                                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                                        className="w-9 h-9 rounded-full bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary transition-all relative flex items-center justify-center shrink-0"
                                        title="Notifications"
                                    >
                                        <Bell className="w-4 h-4" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-brand-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 shadow-md border-2 border-bg-base">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {isNotifOpen && (
                                            <DropdownPortal 
                                                triggerRef={notifRef} 
                                                isOpen={isNotifOpen} 
                                                onClose={() => setIsNotifOpen(false)}
                                                width={320}
                                            >
                                                <div className="w-full sm:w-96 rounded-2xl border border-border-subtle bg-bg-surface shadow-2xl overflow-hidden text-left">
                                                    {/* Header */}
                                                    <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-base/50">
                                                        <div className="flex items-center gap-2">
                                                            <Bell className="w-4 h-4 text-brand-500" />
                                                            <h3 className="font-bold text-sm text-text-primary">Notifications</h3>
                                                            {unreadCount > 0 && (
                                                                <span className="text-[10px] font-bold bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full border border-brand-500/20">
                                                                    {unreadCount} new
                                                                </span>
                                                            )}
                                                        </div>
                                                        {unreadCount > 0 && (
                                                            <button 
                                                                onClick={markAllAsRead}
                                                                className="text-[11px] font-semibold text-brand-500 hover:underline flex items-center gap-1"
                                                            >
                                                                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Body */}
                                                    <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle">
                                                        {notifications.length === 0 ? (
                                                            <div className="p-8 text-center text-text-tertiary text-xs">
                                                                No notifications right now
                                                            </div>
                                                        ) : (
                                                            notifications.map((n) => (
                                                                <div 
                                                                    key={n.id}
                                                                    onClick={() => handleNotificationClick(n)}
                                                                    className={cn(
                                                                        "p-3.5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3 relative group",
                                                                        !n.read ? "bg-brand-500/5" : ""
                                                                    )}
                                                                >
                                                                    <div className="shrink-0 mt-0.5">
                                                                        {n.type === 'order' && (
                                                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                                                                <ShoppingCart className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                        {n.type === 'stock' && (
                                                                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                                                                <AlertTriangle className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                        {n.type === 'voice' && (
                                                                            <div className="w-8 h-8 rounded-xl bg-[#ff8a00]/10 text-[#ff8a00] flex items-center justify-center">
                                                                                <Mic className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                        {n.type === 'ai' && (
                                                                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                                                                <Sparkles className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex-1 min-w-0 pr-6">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <p className={cn("text-xs font-bold truncate", !n.read ? "text-text-primary" : "text-text-secondary")}>
                                                                                {n.title}
                                                                            </p>
                                                                            <span className="text-[10px] text-text-tertiary">{n.time}</span>
                                                                        </div>
                                                                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                                                                            {n.message}
                                                                        </p>
                                                                    </div>

                                                                    {!n.read && (
                                                                        <span className="w-2 h-2 rounded-full bg-brand-500 absolute top-4 right-3" />
                                                                    )}

                                                                    <button 
                                                                        onClick={(e) => removeNotification(n.id, e)}
                                                                        className="absolute bottom-2 right-2 p-1 text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        title="Dismiss"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="px-4 py-2.5 border-t border-border-subtle bg-bg-base/30 text-center">
                                                        <Link 
                                                            to="/dashboard"
                                                            onClick={() => setIsNotifOpen(false)}
                                                            className="text-[11px] font-bold text-text-tertiary hover:text-brand-500 transition-colors uppercase tracking-wider"
                                                        >
                                                            View Dashboard Summary →
                                                        </Link>
                                                    </div>
                                                </div>
                                            </DropdownPortal>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Device Manager Button & Dropdown */}
                                <div className="relative shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeviceManager(!showDeviceManager)}
                                        className="p-2 rounded-full bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary transition-all relative flex items-center justify-center shrink-0"
                                        title="Device Session Manager"
                                    >
                                        <Monitor className="w-4 h-4 text-brand-500" />
                                    </button>

                                    {showDeviceManager && (
                                        <DeviceSessionManager
                                            isOpen={showDeviceManager}
                                            onClose={() => setShowDeviceManager(false)}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 shrink-0">
                                <Link 
                                    to="/register" 
                                    className="px-4 py-2 rounded-full primary-button-gradient text-white text-xs font-bold shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                                >
                                    {t('nav.register')}
                                </Link>
                            </div>
                        )}

                        {/* Mobile Drawer Hamburger Toggle Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="w-9 h-9 rounded-xl bg-bg-surface border border-border-subtle text-text-primary hover:text-brand-500 hover:border-brand-500/40 transition-all shrink-0 flex items-center justify-center"
                            aria-label="Toggle navigation drawer"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5 text-brand-500" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        {/* Persistent Sticky Offline Connectivity Banner */}
        <AnimatePresence>
            {!isOnline && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-amber-500 text-black px-4 py-2 text-xs font-black flex items-center justify-center gap-2 shadow-lg border-b border-amber-600 overflow-hidden relative z-40"
                >
                    <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>
                        <strong>OFFLINE MODE ACTIVE:</strong> Internet connectivity lost. Managing inventory, billing & Boli voice orders remain fully functional & saved on your device.
                    </span>
                </motion.div>
            )}
        </AnimatePresence>

            {/* Responsive Mobile Drawer Menu */}
            {mounted && typeof document !== 'undefined' && document.body && createPortal(
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <div className="fixed inset-0 z-[99999] pointer-events-none">
                            {/* Backdrop */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                            
                            {/* Drawer Panel */}
                            <motion.div 
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="absolute top-[5rem] right-0 bottom-0 w-[min(320px,85vw)] bg-bg-base border-l border-border-subtle flex flex-col overflow-y-auto overflow-x-hidden shadow-2xl pointer-events-auto"
                            >
                        
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border-subtle flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <img src="/favicon.png" alt="Logo" className="w-8 h-8" />
                                <span className="font-bold text-text-primary text-sm">Streetvend</span>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-secondary hover:text-text-primary transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Install PWA App Card in Mobile Drawer */}
                        <div className="p-3 bg-gradient-to-r from-brand-500/10 to-amber-500/10 border-b border-border-subtle">
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    localStorage.removeItem('streetvend_pwa_dismissed');
                                    window.dispatchEvent(new Event('beforeinstallprompt'));
                                    window.location.reload();
                                }}
                                className="w-full p-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                            >
                                <div className="flex items-center gap-2">
                                    <Download className="w-4 h-4 shrink-0" />
                                    <span>Install Mobile App</span>
                                </div>
                                <span className="px-2 py-0.5 text-[9px] bg-white/20 rounded-full uppercase tracking-wider font-extrabold">PWA</span>
                            </button>
                        </div>

                        {/* Vendor or Admin Info (if logged in) */}
                        {user ? (
                            <div className="p-4 border-b border-border-subtle flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {(user as any).storeName?.charAt(0) || 'V'}
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <p className="text-text-primary font-bold text-sm truncate">{(user as any).storeName}</p>
                                        <p className="text-text-tertiary text-xs truncate">{(user as any).phone || (user as any).ownerName}</p>
                                    </div>
                                </div>
                                {/* Plan badge */}
                                <div className="mt-2 text-left">
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 uppercase">
                                        {currentPlan || 'FREE'} PLAN
                                    </span>
                                </div>
                            </div>
                        ) : isAdmin ? (
                            <div className="p-4 border-b border-border-subtle flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        A
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <p className="text-text-primary font-bold text-sm truncate">Administrator</p>
                                        <p className="text-emerald-400 text-xs font-bold truncate">Active Admin Session</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Nav Links */}
                        <nav className="flex-1 p-3 flex flex-col gap-1">
                            
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest px-3 pt-2 pb-1">
                                Navigation
                            </p>

                            {[
                                { to: '/ai-assistant', icon: Sparkles, label: 'AI Assistant' },
                                { to: '/ai-insights', icon: Wand2, label: 'AI Insights' },
                                { to: '/ai-marketing', icon: MessageSquare, label: 'AI Marketing Config' },
                                { to: '/expenses', icon: Receipt, label: 'Expenses' },
                                { to: '/admin', icon: Database, label: 'Admin Portal' },
                            ].map(({ to, icon: Icon, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-3",
                                        "rounded-xl text-sm font-medium transition-all",
                                        location.pathname === to
                                            ? "bg-brand-500 text-white"
                                            : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                                    )}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span>{label}</span>
                                    {location.pathname === to && (
                                        <Check className="w-3.5 h-3.5 ml-auto" />
                                    )}
                                </Link>
                            ))}

                            <div className="h-px bg-border-subtle my-2" />
                            
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest px-3 pt-1 pb-1">
                                Settings
                            </p>

                            {/* Connectivity Status Row */}
                            <div 
                                className="flex items-center justify-between px-3 py-3 rounded-xl bg-white/5 transition-all select-none"
                                title={isOnline ? "Connected to Cloud" : "Offline Mode"}
                            >
                                <div className="flex items-center gap-3">
                                    {isOnline ? (
                                        <Wifi className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
                                    )}
                                    <span className="text-sm font-medium text-text-secondary">
                                        Status
                                    </span>
                                </div>
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                                    isOnline 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                )}>
                                    {isOnline ? "Online" : "Offline"}
                                </span>
                            </div>

                            {/* Language Selector Row */}
                            <div className="px-3 py-2">
                                <p className="text-xs text-text-tertiary mb-2">
                                    Language
                                </p>
                                <div className="flex flex-col gap-1">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code as any);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2.5",
                                                "rounded-lg text-sm transition-all w-full text-left",
                                                language === lang.code
                                                    ? "bg-brand-500/10 text-brand-500 font-medium"
                                                    : "text-text-secondary hover:bg-white/5"
                                            )}
                                        >
                                            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                                            {lang.label}
                                            {language === lang.code && (
                                                <Check className="w-3 h-3 ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </nav>

                        {/* Bottom: Logout */}
                        {(user || isAdmin || isSuperAdmin) && (
                            <div className="p-3 border-t border-border-subtle flex-shrink-0">
                                <button
                                    onClick={async () => {
                                        await logout();
                                        setIsMobileMenuOpen(false);
                                        navigate('/login');
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium w-full text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4 flex-shrink-0" />
                                    <span>{isAdmin ? 'Sign Out Admin' : 'Sign Out'}</span>
                                </button>
                            </div>
                        )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="Subscription Management"
                requiredTier="starter"
            />
        </>
    );
}

function MobileDrawerLink({ to, active, onClick, children }: { to: string, active: boolean, onClick: () => void, children: ReactNode }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 min-h-[44px] rounded-2xl text-xs font-bold transition-all",
                active
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                    : "text-text-secondary hover:bg-bg-base hover:text-text-primary"
            )}
        >
            {children}
        </Link>
    );
}

function NavLink({ to, active, children }: { to: string, active: boolean, children: ReactNode }) {
    return (
        <Link 
            to={to} 
            className={cn(
                "px-3 py-1.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap flex items-center justify-center min-h-[32px]",
                active 
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" 
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
        >
            {children}
        </Link>
    );
}
