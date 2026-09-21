import { apiFetch } from './apiFetch';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vendor } from './database.types';
import { mockDb, supabase, mapVendorFromDb } from './supabase';
import { getVendorProfile, invalidateCache } from './dataCache';

interface AuthContextType {
    user: Vendor | null;
    session: any;
    loading: boolean;
    isLoading: boolean;
    loginWithEmail: (email: string) => Promise<void>;
    verifyOtp: (email: string, token: string) => Promise<Vendor>;
    login: (email: string) => Promise<Vendor>; // Kept for transition/demo
    logout: () => void;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    loginAdmin: () => void;
    isSuperAdmin: boolean;
    updateUser: (updates: Partial<Vendor>) => void;
    updatePlan: (newPlan: Vendor['subscription']) => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Vendor | null>(null);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    
    // Device session enforcement
    useEffect(() => {
        if (user?.id) {
            const checkSession = async () => {
                const currentSessionId = localStorage.getItem('device_session_id') || ('s_' + Math.random().toString(36).substring(2, 9));
                localStorage.setItem('device_session_id', currentSessionId);
                
                const isMobile = /iphone|ipad|ipod|android|mobile/.test(navigator.userAgent.toLowerCase());
                const deviceName = isMobile ? 'Mobile Browser (This Device)' : 'Chrome on Desktop (This Browser)';
                const deviceType = isMobile ? 'mobile' : 'desktop';

                try {
                    // Register on first load
                    if (!(window as any).sessionRegistered) {
                        const res = await apiFetch(`/api/vendor/${user.id}/sessions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId: currentSessionId,
                                deviceName,
                                deviceType,
                                location: 'India'
                            })
                        });
                        if (res.status === 403) {
                             console.error("Device limit reached.");
                             if (supabase) await supabase.auth.signOut();
                             return;
                        }
                        (window as any).sessionRegistered = true;
                    }

                    // Ping via GET to check validity without re-registering
                    const res = await apiFetch(`/api/vendor/${user.id}/sessions`);
                    
                    if (res.status === 403) {
                         console.error("Device limit reached.");
                         if (supabase) await supabase.auth.signOut();
                         return;
                    }
                    
                    const data = await res.json();
                    if (data.success && data.sessions) {
                        const isValid = data.sessions.some((s: any) => s.id === currentSessionId);
                        if (!isValid) {
                            console.error("Session revoked by server.");
                            if (supabase) await supabase.auth.signOut();
                        }
                    }
                } catch (err) {
                    console.error("Session check failed", err);
                }
            };
            
            checkSession();
            // Optional: run periodically
            const interval = setInterval(checkSession, 15000); 
            return () => clearInterval(interval);
        }
    }, [user?.id]);

    const fetchVendorProfile = async (userIdOrEmail: string, forceRefresh = false): Promise<Vendor | null> => {
        try {
            let vendor = await getVendorProfile(userIdOrEmail, forceRefresh);

            // Fallback attempt with session user email or ID if first lookup missed
            if (!vendor && session?.user) {
                const altIdentifier = userIdOrEmail === session.user.id ? session.user.email : session.user.id;
                if (altIdentifier && altIdentifier !== userIdOrEmail) {
                    vendor = await getVendorProfile(altIdentifier, forceRefresh);
                }
            }

            if (vendor) {
                // Check for scheduled downgrade enforcement
                if (vendor.downgradeEffectiveDate && new Date(vendor.downgradeEffectiveDate) <= new Date()) {
                    try {
                        if (supabase) {
                            await (supabase.from('vendors') as any)
                                .update({
                                    subscription: vendor.scheduledDowngrade,
                                    scheduled_downgrade: null,
                                    downgrade_effective_date: null,
                                    billing_period_end: null
                                })
                                .eq('id', vendor.id);
                        }
                        apiFetch('/api/vendor/apply-downgrade', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ vendorId: vendor.id, targetPlan: vendor.scheduledDowngrade, currentPlan: vendor.subscription })
                        }).catch(() => {});
                        
                        if (vendor.scheduledDowngrade) {
                            vendor.subscription = vendor.scheduledDowngrade;
                        }
                        vendor.scheduledDowngrade = null;
                        vendor.downgradeEffectiveDate = null;
                        vendor.billingPeriodEnd = null;
                    } catch (err) {
                        console.error("Failed to enforce downgrade:", err);
                    }
                }

                setUser(vendor);
                setIsAdmin(false);
                localStorage.removeItem('vendor_admin');
                localStorage.setItem('vendor_user', JSON.stringify(vendor));
                return vendor;
            } else {
                console.warn(`[fetchVendorProfile] Vendor record NOT found for identifier: "${userIdOrEmail}"`);
            }
        } catch (err) {
            console.error("Supabase load user profile error:", err);
        }
        return null;
    };

    useEffect(() => {
        if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                if (session?.user) {
                    setIsAdmin(session.user.user_metadata?.role === 'admin' || session.user.user_metadata?.role === 'superadmin');
                    setIsSuperAdmin(session.user.user_metadata?.role === 'superadmin');
                    fetchVendorProfile(session.user.email || session.user.id).finally(() => {
                        setLoading(false);
                    });
                } else {
                    // Purge stale local storage and clear state when Supabase reports no session
                    localStorage.removeItem('vendor_user');
                    localStorage.removeItem('vendor_admin');
                    setUser(null);
                    setIsAdmin(false);
                    setIsSuperAdmin(false);
                    setLoading(false);
                }
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
                setSession(newSession);
                if (newSession?.user) {
                    setIsAdmin(newSession.user.user_metadata?.role === 'admin' || newSession.user.user_metadata?.role === 'superadmin');
                    setIsSuperAdmin(newSession.user.user_metadata?.role === 'superadmin');
                    await fetchVendorProfile(newSession.user.email || newSession.user.id);
                } else {
                    // Immediately purge local storage and reset state when newSession is null/undefined or on SIGNED_OUT
                    localStorage.removeItem('vendor_user');
                    localStorage.removeItem('vendor_admin');
                    setUser(null);
                    setIsAdmin(false);
                    setIsSuperAdmin(false);
                }
                setLoading(false);
            });

            return () => {
                subscription.unsubscribe();
            };
        } else {
            const storedUser = localStorage.getItem('vendor_user');
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Failed to parse stored vendor user", e);
                }
            }
            const storedAdmin = localStorage.getItem('vendor_admin');
            if (storedAdmin === 'true') {
                setIsAdmin(true);
            }
            setLoading(false);
        }
    }, []);

    const loginWithEmail = async (email: string) => {
        if (!supabase) return;
        try {
            const { error } = await supabase.auth.signInWithOtp({ 
                email,
                options: {
                    shouldCreateUser: true
                }
            });
            if (error) {
                console.warn("Supabase OTP notice (Test mode default OTP 123456 active):", error.message);
            }
        } catch (err) {
            console.warn("Supabase OTP error (Test mode default OTP 123456 active):", err);
        }
    };

    const verifyOtp = async (email: string, token: string): Promise<Vendor> => {
        // Test Mode: Accept default OTP '123456' for vendor demo
        if (token === '123456') {
            if (supabase) {
                try {
                    const profile = await fetchVendorProfile(email);
                    if (profile) return profile;
                } catch (e) {
                    console.warn("Fetch vendor profile error during default OTP verification:", e);
                }
            }

            const mockV = mockDb.vendors.find(v => v.email?.toLowerCase() === email.toLowerCase() || v.id === email);
            if (mockV) {
                setUser(mockV);
                localStorage.setItem('vendor_user', JSON.stringify(mockV));
                return mockV;
            }

            throw new Error("Vendor profile not found. Please register.");
        }

        if (!supabase) throw new Error("Supabase not initialized");
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });
        
        if (error) throw error;
        if (!data.user) throw new Error("No user returned");

        const profile = await fetchVendorProfile(data.user.email || data.user.id);
        if (!profile) {
            throw new Error("Vendor profile not found. Please register.");
        }
        return profile;
    };

    const login = async (email: string): Promise<Vendor> => {
        setIsAdmin(false);
        localStorage.removeItem('vendor_admin');
        
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const profile = await fetchVendorProfile(session.user.email || session.user.id);
                if (profile) return profile;
            }
            // Fallback for demo accounts or offline testing
            const mockV = mockDb.vendors.find(v => v.email?.toLowerCase() === email.toLowerCase() || v.id === email);
            if (mockV) {
                setUser(mockV);
                localStorage.setItem('vendor_user', JSON.stringify(mockV));
                return mockV;
            }
            throw new Error("Authentication required via OTP.");
        }

        const vendor = mockDb.vendors.find(v => v.email?.toLowerCase() === email.toLowerCase() || v.id === email);
        if (vendor) {
            setUser(vendor);
            setIsAdmin(false);
            localStorage.removeItem('vendor_admin');
            localStorage.setItem('vendor_user', JSON.stringify(vendor));
            return vendor;
        }
        throw new Error("Vendor account not found.");
    };

    const signOut = async () => {
        localStorage.removeItem('vendor_user');
        localStorage.removeItem('vendor_admin');
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        if (supabase) {
            try {
                await supabase.auth.signOut();
            } catch (err) {
                console.error("Error during supabase signOut:", err);
            }
        }
    };

    const logout = async () => {
        await signOut();
    };

    const loginAdmin = () => {
        // Clear active vendor session so admin session is clean and independent
        setUser(null);
        setSession(null);
        localStorage.removeItem('vendor_user');
        setIsAdmin(true);
        localStorage.setItem('vendor_admin', 'true');
    };

    const updateUser = (updates: Partial<Vendor> | Vendor) => {
        const updated = user ? { ...user, ...updates } : (updates as Vendor);
        setUser(updated as Vendor);
        localStorage.setItem('vendor_user', JSON.stringify(updated));
        const mockV = mockDb.vendors.find(v => v.id === updated.id);
        if (mockV) {
            Object.assign(mockV, updated);
        }
    };

    const updatePlan = (newPlan: Vendor['subscription']) => {
        const updated = user ? {
            ...user,
            subscription: newPlan,
            scheduledDowngrade: null,
            downgradeEffectiveDate: null,
            billingPeriodEnd: null
        } : {
            id: 'v_demo',
            storeName: "Streetvend Partner",
            ownerName: "Vendor",
            phone: "+919876543210",
            category: "Street Food",
            subscription: newPlan,
            isActive: true,
            qrCodeUrl: null,
            language: "en" as const,
            createdAt: new Date().toISOString()
        };
        setUser(updated);
        localStorage.setItem('vendor_user', JSON.stringify(updated));

        if (supabase && user?.id) {
            (supabase.from('vendors') as any)
                .update({
                    subscription: newPlan,
                    scheduled_downgrade: null,
                    downgrade_effective_date: null,
                    billing_period_end: null
                })
                .eq('id', user.id)
                .then(() => {})
                .catch((err: any) => console.error("Error updating vendor plan in DB:", err));
        }
    };

    const refreshProfile = async () => {
        if (supabase) {
            let userId = session?.user?.id || user?.id;
            if (!userId) {
                const { data } = await supabase.auth.getSession();
                userId = data.session?.user?.id;
            }
            if (userId) {
                const profile = await fetchVendorProfile(userId, true);
                if (profile) {
                    setUser(profile);
                    localStorage.setItem('vendor_user', JSON.stringify(profile));
                }
            }
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            session, 
            loading, 
            isLoading: loading, 
            loginWithEmail,
            verifyOtp,
            login, 
            logout, 
            signOut, 
            isAdmin, 
            loginAdmin, 
            isSuperAdmin,
            updateUser,
            updatePlan,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
