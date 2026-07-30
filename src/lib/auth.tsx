import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vendor } from './database.types';
import { mockDb, supabase, mapVendorFromDb } from './supabase';

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

    const fetchVendorProfile = async (userIdOrEmail: string): Promise<Vendor | null> => {
        if (supabase) {
            try {
                let { data, error } = await supabase
                    .from('vendors')
                    .select('*')
                    .or(`user_id.eq.${userIdOrEmail},id.eq.${userIdOrEmail},email.eq.${userIdOrEmail}`)
                    .limit(1);
                
                if ((!data || data.length === 0) && userIdOrEmail.includes('@')) {
                    const { data: searchData } = await supabase
                        .from('vendors')
                        .select('*')
                        .or(`email.ilike.%${userIdOrEmail}%,name.ilike.%Raju%`)
                        .limit(1);
                    data = searchData;
                }

                if (data && data.length > 0 && !error) {
                    let vendor = mapVendorFromDb(data[0]);

                    // Check for scheduled downgrade enforcement
                    if (vendor.downgradeEffectiveDate && new Date(vendor.downgradeEffectiveDate) <= new Date()) {
                        console.log(`Enforcing downgrade for vendor ${vendor.id} to ${vendor.scheduledDowngrade}`);
                        try {
                            // Update vendor in database
                            await (supabase.from('vendors') as any)
                                .update({
                                    subscription: vendor.scheduledDowngrade,
                                    scheduled_downgrade: null,
                                    downgrade_effective_date: null,
                                    billing_period_end: null
                                })
                                .eq('id', vendor.id);

                            fetch('/api/vendor/apply-downgrade', {
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
                    localStorage.setItem('vendor_user', JSON.stringify(vendor));
                    return vendor;
                }
            } catch (err) {
                console.error("Supabase load user profile error:", err);
            }
        }
        return null;
    };

    useEffect(() => {
        if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                if (session?.user) {
                    setIsSuperAdmin(session.user.user_metadata?.role === 'superadmin');
                    fetchVendorProfile(session.user.id).finally(() => {
                        setLoading(false);
                    });
                } else {
                    const storedUser = localStorage.getItem('vendor_user');
                    if (storedUser) {
                        try {
                            setUser(JSON.parse(storedUser));
                        } catch (e) {
                            console.error("Failed to parse stored vendor user", e);
                        }
                    }
                    setLoading(false);
                }
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
                setSession(newSession);
                if (newSession?.user) {
                    setIsSuperAdmin(newSession.user.user_metadata?.role === 'superadmin');
                    await fetchVendorProfile(newSession.user.id);
                } else {
                    setIsSuperAdmin(false);
                    const hasMockUser = localStorage.getItem('vendor_user');
                    if (!hasMockUser) {
                        setUser(null);
                    }
                }
                setLoading(false);
            });

            const storedAdmin = localStorage.getItem('vendor_admin');
            if (storedAdmin === 'true') {
                setIsAdmin(true);
            }

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
        if (!supabase) throw new Error("Supabase not initialized");
        // Phase 2: replace/augment with WhatsApp OTP via MSG91
        // when Meta WhatsApp Business API approval is complete
        
        // IMPORTANT: To receive a 6-digit numeric OTP instead of a Magic Link:
        // 1. Go to Supabase Dashboard -> Authentication -> Providers -> Email
        // 2. Ensure "Enable Email OTP" is toggled ON
        // 3. Toggle "Confirm Email" to OFF (this ensures codes are sent for verification)
        // 4. Ensure the Email Template for "OTP" uses {{ .Token }}
        const { error } = await supabase.auth.signInWithOtp({ 
            email,
            options: {
                shouldCreateUser: true
                // We explicitly omit emailRedirectTo to favor the numeric OTP code delivery
            }
        });
        if (error) throw error;
    };

    const verifyOtp = async (email: string, token: string): Promise<Vendor> => {
        if (!supabase) throw new Error("Supabase not initialized");
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });
        
        if (error) throw error;
        if (!data.user) throw new Error("No user returned");

        const profile = await fetchVendorProfile(data.user.id);
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
                const profile = await fetchVendorProfile(session.user.id);
                if (profile) return profile;
            }
            throw new Error("Authentication required via OTP.");
        }

        const vendor = mockDb.vendors.find(v => v.email.toLowerCase() === email.toLowerCase());
        if (vendor) {
            setUser(vendor);
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

    const updateUser = (updates: Partial<Vendor>) => {
        if (!user) return;
        const updated = { ...user, ...updates };
        setUser(updated);
        localStorage.setItem('vendor_user', JSON.stringify(updated));
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
            const userId = session?.user?.id || user?.id;
            if (userId) {
                const profile = await fetchVendorProfile(userId);
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
