import { apiFetch } from '../lib/apiFetch';
import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, Tablet, X, ShieldAlert, Monitor, CheckCircle, Trash2 } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { useAuth } from '../lib/auth';
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
    const { user } = useAuth();
    const maxDevices = config.maxDevices;

    const [sessions, setSessions] = useState<DeviceSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Fetch and sync sessions from server
    useEffect(() => {
        if (isOpen && user?.id) {
            setIsLoading(true);
            const currentSessionId = localStorage.getItem('device_session_id') || ('s_' + Math.random().toString(36).substring(2, 9));
            localStorage.setItem('device_session_id', currentSessionId);

            const isMobile = /iphone|ipad|ipod|android|mobile/.test(navigator.userAgent.toLowerCase());
            const deviceName = isMobile ? 'Mobile Browser (This Device)' : 'Chrome on Desktop (This Browser)';
            const deviceType = isMobile ? 'mobile' : 'desktop';

            apiFetch(`/api/vendor/${user.id}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    deviceName,
                    deviceType,
                    location: 'India'
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.sessions) {
                    const mapped = data.sessions.map((s: any) => ({
                        ...s,
                        isCurrent: s.id === currentSessionId
                    }));
                    setSessions(mapped);
                }
            })
            .catch(err => console.error("Failed to sync sessions:", err))
            .finally(() => setIsLoading(false));
        }
    }, [isOpen, user?.id]);

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

    const activeSessionCount = sessions.length;
    const isExceedingLimit = activeSessionCount > maxDevices;

    const revokeSession = async (id: string) => {
        if (!user?.id) return;
        try {
            const res = await apiFetch(`/api/vendor/${user.id}/sessions/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success && data.sessions) {
                const currentSessionId = localStorage.getItem('device_session_id');
                const mapped = data.sessions.map((s: any) => ({
                    ...s,
                    isCurrent: s.id === currentSessionId
                }));
                setSessions(mapped);
            }
        } catch (err) {
            console.error("Failed to revoke session:", err);
        }
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
                className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-bg-surface border border-border-subtle rounded-3xl p-6 shadow-2xl z-50 text-left cursor-default animate-in fade-in-0 slide-in-from-top-2 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button Header */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-surface-inset transition-all cursor-pointer z-10"
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
                <div className="bg-bg-surface-inset p-4.5 rounded-2xl border border-border-subtle mb-6">
                    <div className="flex justify-between items-center mb-2.5 text-xs font-bold">
                        <span className="text-text-secondary">Active Devices</span>
                        <span className={isExceedingLimit ? 'text-red-400 font-extrabold' : 'text-brand-500 font-extrabold'}>
                            {activeSessionCount} / {maxDevices} Device{maxDevices > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="h-2.5 bg-border-subtle rounded-full overflow-hidden shadow-inner">
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
                    {isLoading ? (
                        <div className="text-center py-6 text-xs text-text-tertiary">Loading active sessions...</div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-6 text-xs text-text-tertiary">No active sessions found.</div>
                    ) : (
                        sessions.map((s) => (
                            <div
                                key={s.id}
                                className={`p-4 rounded-2xl border flex items-center justify-between transition-all gap-4 ${
                                    s.isCurrent
                                        ? 'bg-brand-500/10 border-brand-500/30'
                                        : 'bg-bg-surface-inset border-border-subtle hover:border-brand-500/20'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="p-3 rounded-xl bg-bg-surface-inset shrink-0 flex items-center justify-center">
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
                        ))
                    )}
                </div>

                {/* Bottom Actions Footer */}
                <div className="flex items-center justify-between pt-5 mt-6 border-t border-border-subtle">
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
