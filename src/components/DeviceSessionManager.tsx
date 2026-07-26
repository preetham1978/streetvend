import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, Tablet, X, ShieldAlert, Monitor, CheckCircle, Trash2 } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import UpgradeModal from './UpgradeModal';

export interface DeviceSession {
    id: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'pos';
    location: string;
    lastActive: string;
    isCurrent: boolean;
}

export default function DeviceSessionManager({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { config, currentPlan } = usePlanLimits();
    const maxDevices = config.maxDevices;

    const [sessions, setSessions] = useState<DeviceSession[]>([
        {
            id: 's1',
            deviceName: 'Chrome on Mac (This Browser)',
            deviceType: 'desktop',
            location: 'Bengaluru, KA',
            lastActive: 'Active Now',
            isCurrent: true
        },
        {
            id: 's2',
            deviceName: 'Samsung Galaxy Tab (Billing POS)',
            deviceType: 'tablet',
            location: 'Indiranagar Stall',
            lastActive: '12 mins ago',
            isCurrent: false
        },
        {
            id: 's3',
            deviceName: 'Redmi Note 12 (Vendor App)',
            deviceType: 'mobile',
            location: 'MG Road Counter',
            lastActive: '1 hour ago',
            isCurrent: false
        },
        {
            id: 's4',
            deviceName: 'iPad Air (Secondary Counter)',
            deviceType: 'tablet',
            location: 'Koramangala Stall',
            lastActive: '3 hours ago',
            isCurrent: false
        }
    ]);

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Escape Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Filter active sessions to match max device limit rule or show limit warning
    const activeSessionCount = sessions.length;
    const isExceedingLimit = activeSessionCount > maxDevices;

    const revokeSession = (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
    };

    const getDeviceIcon = (type: DeviceSession['deviceType']) => {
        switch (type) {
            case 'mobile': return <Smartphone className="w-5 h-5 text-brand-500" />;
            case 'tablet': return <Tablet className="w-5 h-5 text-accent-blue" />;
            case 'pos': return <Monitor className="w-5 h-5 text-accent-yellow" />;
            default: return <Laptop className="w-5 h-5 text-accent-green" />;
        }
    };

    return (
        <>
            {/* Click-Outside to Close: full-screen transparent overlay backdrop */}
            <div 
                className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px] cursor-default" 
                onClick={onClose}
            />

            {/* Dropdown Container */}
            <div 
                className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-[#141416] border border-[#28282e] rounded-3xl p-6 shadow-2xl z-50 text-left cursor-default animate-in fade-in-0 slide-in-from-top-2 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button Header */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-[#222228] transition-all cursor-pointer z-10"
                    aria-label="Close device session manager"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3.5 mb-6 pr-8">
                    <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-sans font-extrabold text-xl text-text-primary leading-tight">
                            Device Session Manager
                        </h2>
                        <p className="text-xs text-text-tertiary mt-0.5">
                            {config.name} allows up to <strong className="text-brand-500 font-bold">{maxDevices} concurrent device{maxDevices > 1 ? 's' : ''}</strong>
                        </p>
                    </div>
                </div>

                {/* Device Count Progress Bar */}
                <div className="bg-[#1b1b1e] p-4.5 rounded-2xl border border-[#2d2d34] mb-6">
                    <div className="flex justify-between items-center mb-2.5 text-xs font-bold">
                        <span className="text-text-secondary">Active Devices</span>
                        <span className={isExceedingLimit ? 'text-red-400 font-extrabold' : 'text-brand-500 font-extrabold'}>
                            {activeSessionCount} / {maxDevices} Device{maxDevices > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="h-2.5 bg-[#26262c] rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                isExceedingLimit ? 'bg-red-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${Math.min(100, (activeSessionCount / maxDevices) * 100)}%` }}
                        />
                    </div>

                    {isExceedingLimit && (
                        <div className="mt-3.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-red-300">
                            <span className="flex items-center gap-2 font-medium">
                                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                                Session cap exceeded for {config.name}!
                            </span>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider shrink-0 cursor-pointer self-start sm:self-auto transition-colors"
                            >
                                Upgrade Tier
                            </button>
                        </div>
                    )}
                </div>

                {/* Session List */}
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1 mb-6 custom-scrollbar">
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            className={`p-4 rounded-2xl border flex items-center justify-between transition-all gap-4 ${
                                s.isCurrent
                                    ? 'bg-brand-500/10 border-brand-500/30'
                                    : 'bg-[#18181c] border-[#292930] hover:border-brand-500/20'
                            }`}
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="p-3 rounded-xl bg-[#222228] shrink-0 flex items-center justify-center">
                                    {getDeviceIcon(s.deviceType)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-sm text-text-primary leading-snug truncate">{s.deviceName}</h3>
                                        {s.isCurrent && (
                                            <span className="px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                                                This Device
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-1 leading-normal truncate">
                                        {s.location} · {s.lastActive}
                                    </p>
                                </div>
                            </div>

                            {!s.isCurrent && (
                                <button
                                    onClick={() => revokeSession(s.id)}
                                    className="p-2.5 rounded-xl text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                                    title="Revoke session"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Bottom Actions Footer */}
                <div className="flex items-center justify-between pt-5 mt-6 border-t border-[#28282e]">
                    <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                        Plan: <strong className="text-brand-500 font-extrabold capitalize">{currentPlan}</strong>
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2.5 rounded-xl primary-button-gradient text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    >
                        Upgrade Multi-Device Tier
                    </button>
                </div>
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="Multi-Device Concurrent Login"
                requiredTier="professional"
                message="Your current plan restricts active devices. Upgrade to Professional (3 devices) or Enterprise (10 devices) for seamless team POS synchronization across carts and tablets."
            />
        </>
    );
}
