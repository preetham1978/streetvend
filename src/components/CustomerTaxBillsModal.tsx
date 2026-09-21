import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, FileText, Download, Printer, Lock, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Archive } from 'lucide-react';
import { Order } from '../lib/database.types';
import { mockDb, supabase, mapOrderFromDb } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';

interface CustomerTaxBillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    vendorId?: string;
    isAdmin?: boolean;
    onViewBillReplica?: (order: Order) => void;
}

export default function CustomerTaxBillsModal({
    isOpen,
    onClose,
    vendorId,
    isAdmin = false,
    onViewBillReplica
}: CustomerTaxBillsModalProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<'1yr' | 'fy' | '6m' | 'all'>('1yr');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            let list: Order[] = [];
            if (supabase) {
                try {
                    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
                    if (vendorId) {
                        query = query.eq('vendor_id', vendorId);
                    }
                    const { data, error } = await query;
                    if (data && !error) {
                        list = data.map(mapOrderFromDb);
                    }
                } catch (e) {
                    console.warn("Error loading orders from Supabase:", e);
                }
            }

            // Fallback / Merge with mockDb
            const localList = vendorId 
                ? mockDb.orders.filter(o => o.vendorId === vendorId)
                : mockDb.orders;

            const combined = [...list];
            for (const lo of localList) {
                if (!combined.some(o => o.id === lo.id)) {
                    combined.push(lo);
                }
            }
            setOrders(combined);
        } catch (err) {
            console.error("Failed to load tax orders:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadOrders();
        }
    }, [isOpen, vendorId]);

    if (!isOpen) return null;

    // Filter Logic
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const filteredOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        
        // Date Filter
        if (dateRange === '1yr' && orderDate < oneYearAgo) return false;
        if (dateRange === '6m' && orderDate < sixMonthsAgo) return false;
        if (dateRange === 'fy') {
            // Financial year 2025-26: Apr 1 2025 to Mar 31 2026
            const fyStart = new Date('2025-04-01T00:00:00Z');
            const fyEnd = new Date('2026-03-31T23:59:59Z');
            if (orderDate < fyStart || orderDate > fyEnd) return false;
        }

        // Status Filter
        if (statusFilter === 'archived' && !o.isArchived) return false;
        if (statusFilter === 'active' && o.isArchived) return false;

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = o.customerName?.toLowerCase().includes(q);
            const matchPhone = o.customerPhone?.includes(q);
            const matchId = o.id.toLowerCase().includes(q);
            const matchEway = o.ewayBillNo?.toLowerCase().includes(q);
            const matchVehicle = o.vehicleNo?.toLowerCase().includes(q);
            return matchName || matchPhone || matchId || matchEway || matchVehicle;
        }

        return true;
    });

    // Summary Totals for Tax
    const totalTaxable = filteredOrders.reduce((sum, o) => sum + (o.taxableAmount || (o.total / 1.18)), 0);
    const totalCgst = filteredOrders.reduce((sum, o) => sum + (o.cgst || ((o.total / 1.18) * 0.09)), 0);
    const totalSgst = filteredOrders.reduce((sum, o) => sum + (o.sgst || ((o.total / 1.18) * 0.09)), 0);
    const totalIgst = filteredOrders.reduce((sum, o) => sum + (o.igst || ((o.total / 1.18) * 0.18)), 0);
    const totalInvoiceValue = filteredOrders.reduce((sum, o) => sum + o.total, 0);

    // CSV Download Functionality for 1-Year Tax Filing
    const handleDownloadTaxCsv = () => {
        const headers = [
            'Invoice No',
            'Invoice Date',
            'Customer Name',
            'Customer Phone',
            'Customer GSTIN',
            'Customer Address',
            'E-Way Bill No',
            'Vehicle No',
            'Items / Wood Specs',
            'Taxable Amount (INR)',
            'CGST 9% (INR)',
            'SGST 9% (INR)',
            'IGST 18% (INR)',
            'Total Invoice Amount (INR)',
            'Payment Mode',
            'Archive Status'
        ];

        const rows = filteredOrders.map(o => [
            `"${o.id}"`,
            `"${new Date(o.createdAt).toLocaleDateString('en-IN')}"`,
            `"${o.customerName || 'Walk-in Customer'}"`,
            `"${o.customerPhone || ''}"`,
            `"${o.customerGstin || ''}"`,
            `"${(o.customerAddress || '').replace(/"/g, '""')}"`,
            `"${o.ewayBillNo || ''}"`,
            `"${o.vehicleNo || ''}"`,
            `"${(o.woodSpecs || o.items.map(i => i.name).join('; ')).replace(/"/g, '""')}"`,
            (o.taxableAmount || (o.total / 1.18)).toFixed(2),
            (o.cgst || ((o.total / 1.18) * 0.09)).toFixed(2),
            (o.sgst || ((o.total / 1.18) * 0.09)).toFixed(2),
            (o.igst || ((o.total / 1.18) * 0.18)).toFixed(2),
            o.total.toFixed(2),
            `"${o.paymentMethod.toUpperCase()}"`,
            `"${o.isArchived ? 'Archived in DB' : 'Active'}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `1_Year_Tax_Bills_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setActionMsg({ type: 'success', text: `Downloaded 1-Year Tax Statement CSV for ${filteredOrders.length} bills!` });
        setTimeout(() => setActionMsg(null), 4000);
    };

    // Admin Archive / Unarchive Handler
    const handleToggleArchive = async (order: Order) => {
        if (!isAdmin) {
            alert("Only an Admin can archive or unarchive bills in the database.");
            return;
        }

        const newArchivedState = !order.isArchived;
        const nowIso = new Date().toISOString();

        try {
            if (supabase) {
                const { error } = await (supabase.from('orders') as any)
                    .update({
                        is_archived: newArchivedState,
                        archived_at: newArchivedState ? nowIso : null,
                        archived_by: newArchivedState ? 'Admin' : null
                    })
                    .eq('id', order.id);

                if (error) {
                    console.warn("Supabase archive update notice:", error.message);
                }
            }

            // Always update in mockDb for instant local sync
            const targetMock = mockDb.orders.find(o => o.id === order.id);
            if (targetMock) {
                targetMock.isArchived = newArchivedState;
                targetMock.archivedAt = newArchivedState ? nowIso : undefined;
                targetMock.archivedBy = newArchivedState ? 'Admin' : undefined;
            }

            // Update local state
            setOrders(prev => prev.map(o => o.id === order.id ? {
                ...o,
                isArchived: newArchivedState,
                archivedAt: newArchivedState ? nowIso : undefined,
                archivedBy: newArchivedState ? 'Admin' : undefined
            } : o));

            logAdminAction(
                newArchivedState ? 'ARCHIVE_BILL' : 'UNARCHIVE_BILL',
                `Bill #${order.id} ${newArchivedState ? 'archived' : 'unarchived'} in DB by Admin`
            );

            setActionMsg({
                type: 'success',
                text: `Bill #${order.id} ${newArchivedState ? 'archived in database for tax retention' : 'restored to active status'}.`
            });
            setTimeout(() => setActionMsg(null), 4000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: `Failed to update archive status: ${err.message}` });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="w-full max-w-4xl bg-bg-surface rounded-3xl border border-border-subtle shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto">
                
                {/* Header Bar */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 via-bg-surface to-brand-500/10 border-b border-border-subtle flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold shadow-inner shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl sm:text-2xl font-black text-text-primary">Customer Tax Bills & 1-Year History</h2>
                                {isAdmin && (
                                    <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        Admin Controls Enabled
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Retrieve, print, and download 1-year tax-compliant bills for income tax & GST filing
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-bg-surface-inset hover:bg-bg-base text-text-secondary transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Status / Alert Banner */}
                {actionMsg && (
                    <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between ${
                        actionMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-b border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-b border-red-500/20'
                    }`}>
                        <div className="flex items-center gap-2">
                            {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <span>{actionMsg.text}</span>
                        </div>
                        <button onClick={() => setActionMsg(null)} className="text-current opacity-70 hover:opacity-100">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Filters & Export Toolbar */}
                <div className="p-4 sm:p-6 bg-bg-surface border-b border-border-subtle space-y-4 shrink-0">
                    
                    {/* Search & Period Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-text-tertiary" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by Customer Name, Phone, GSTIN, E-Way Bill or Invoice #..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-base border border-border-subtle text-xs sm:text-sm text-text-primary focus:outline-none focus:border-amber-500 transition-colors font-medium"
                            />
                        </div>

                        {/* Date Range Buttons */}
                        <div className="flex items-center gap-1.5 bg-bg-base p-1 rounded-xl border border-border-subtle overflow-x-auto">
                            <button
                                onClick={() => setDateRange('1yr')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    dateRange === '1yr' ? 'bg-amber-500 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                🗓️ Past 1 Year
                            </button>
                            <button
                                onClick={() => setDateRange('fy')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    dateRange === 'fy' ? 'bg-amber-500 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                📊 FY 2025-26
                            </button>
                            <button
                                onClick={() => setDateRange('6m')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    dateRange === '6m' ? 'bg-amber-500 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                6 Months
                            </button>
                            <button
                                onClick={() => setDateRange('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    dateRange === 'all' ? 'bg-amber-500 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                All Time
                            </button>
                        </div>
                    </div>

                    {/* Tax Metrics & Download Button Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Invoices</div>
                            <div className="text-lg font-black font-sans text-text-primary mt-0.5">{filteredOrders.length} Bills</div>
                        </div>

                        <div className="p-3 rounded-2xl bg-bg-surface-inset border border-border-subtle">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-tertiary">Total Taxable Value</div>
                            <div className="text-lg font-black font-sans text-text-primary mt-0.5">₹{totalTaxable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        </div>

                        <div className="p-3 rounded-2xl bg-bg-surface-inset border border-border-subtle">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-tertiary">GST Liability (CGST+SGST)</div>
                            <div className="text-lg font-black font-sans text-amber-500 mt-0.5">₹{(totalCgst + totalSgst).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        </div>

                        <button
                            onClick={handleDownloadTaxCsv}
                            disabled={filteredOrders.length === 0}
                            className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download 1-Yr Tax Statement (CSV)</span>
                        </button>
                    </div>

                    {/* Archive Filter selector */}
                    <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-2 text-text-tertiary font-medium">
                            <span>Filter Archive Status:</span>
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${statusFilter === 'all' ? 'bg-bg-surface-inset text-text-primary' : 'hover:text-text-primary'}`}
                            >
                                All ({orders.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('active')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${statusFilter === 'active' ? 'bg-bg-surface-inset text-text-primary' : 'hover:text-text-primary'}`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setStatusFilter('archived')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${statusFilter === 'archived' ? 'bg-bg-surface-inset text-text-primary' : 'hover:text-text-primary'}`}
                            >
                                🔒 Archived in DB ({orders.filter(o => o.isArchived).length})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Orders Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                    {isLoading ? (
                        <div className="py-12 text-center text-text-tertiary font-bold text-xs animate-pulse">
                            Loading tax bill records from database...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="py-12 text-center space-y-2">
                            <FileText className="w-12 h-12 mx-auto text-text-tertiary opacity-40" />
                            <div className="font-bold text-sm text-text-secondary">No Tax Bills Found</div>
                            <p className="text-xs text-text-tertiary">Try clearing search keywords or expanding the date range filter.</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => (
                            <div 
                                key={order.id}
                                className={`p-4 rounded-2xl border transition-all ${
                                    order.isArchived 
                                        ? 'bg-amber-500/5 border-amber-500/30' 
                                        : 'bg-bg-surface-inset border-border-subtle hover:border-brand-500/30'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-black text-sm text-text-primary">Bill #{order.id}</span>
                                            <span className="text-xs font-bold text-text-tertiary font-mono">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            {order.isArchived ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                                                    <Lock className="w-3 h-3" /> Archived in DB (Tax Retained)
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
                                                    Active Invoice
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs font-bold text-text-primary">
                                            Customer: {order.customerName || 'Walk-in Customer'} 
                                            {order.customerPhone && <span className="text-text-tertiary font-normal"> ({order.customerPhone})</span>}
                                        </div>

                                        {order.customerAddress && (
                                            <div className="text-[11px] text-text-secondary truncate max-w-lg">
                                                📍 {order.customerAddress}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {onViewBillReplica && (
                                            <button
                                                onClick={() => onViewBillReplica(order)}
                                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Printer className="w-3.5 h-3.5" /> View / Print Invoice
                                            </button>
                                        )}

                                        {/* Admin Archive / Unarchive Button */}
                                        {isAdmin ? (
                                            <button
                                                onClick={() => handleToggleArchive(order)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                                    order.isArchived
                                                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30'
                                                }`}
                                                title="Only Admin can archive previous dated bills into DB"
                                            >
                                                <Archive className="w-3.5 h-3.5" />
                                                {order.isArchived ? 'Unarchive Bill' : 'Archive to DB (Admin)'}
                                            </button>
                                        ) : (
                                            order.isArchived && (
                                                <span className="text-[10px] text-text-tertiary italic flex items-center gap-1">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Admin Secured
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Item specs & Tax breakdown */}
                                <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                    <div className="text-text-secondary font-mono text-[11px] space-y-0.5 flex-1">
                                        <div><strong>Cut Sizes / Items:</strong> {order.woodSpecs || order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</div>
                                        {order.ewayBillNo && <div><strong>E-Way Bill:</strong> {order.ewayBillNo} | <strong>Vehicle:</strong> {order.vehicleNo}</div>}
                                    </div>

                                    <div className="flex items-center gap-4 text-right font-sans shrink-0 bg-bg-surface p-2.5 rounded-xl border border-border-subtle">
                                        <div>
                                            <div className="text-[10px] text-text-tertiary uppercase font-bold">Taxable</div>
                                            <div className="font-bold text-text-primary">₹{(order.taxableAmount || (order.total / 1.18)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-text-tertiary uppercase font-bold">GST (18%)</div>
                                            <div className="font-bold text-amber-500">₹{((order.cgst || 0) + (order.sgst || 0) || (order.total - (order.total / 1.18))).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-text-tertiary uppercase font-bold">Total Bill</div>
                                            <div className="font-extrabold text-sm text-brand-500">₹{order.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Modal Note */}
                <div className="p-4 bg-bg-surface-inset border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-tertiary shrink-0">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>All bills retained for 7+ financial years per GST & Income Tax Section 44AA regulations.</span>
                    </div>
                    <div className="font-mono text-[11px] font-bold">
                        Showing {filteredOrders.length} of {orders.length} bills
                    </div>
                </div>

            </div>
        </div>
    );
}
