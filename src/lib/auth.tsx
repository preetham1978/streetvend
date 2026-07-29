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

    const fetchVendorProfile = async (userId: string): Promise<Vendor | null> => {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('vendors')
                    .select('*')
                    .eq('user_id', userId)
                    .single();
                
                if (data && !error) {
                    const vendor = mapVendorFromDb(data);
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
        // Mock/Legacy login - kept for transition
        setIsAdmin(false);
        localStorage.removeItem('vendor_admin');
        
        if (supabase && session?.user) {
            const profile = await fetchVendorProfile(session.user.id);
            if (profile) return profile;
        }

        const vendor = mockDb.vendors.find(v => v.email === email) as Vendor;
        if (vendor) {
            setUser(vendor);
            localStorage.setItem('vendor_user', JSON.stringify(vendor));
            return vendor;
        }
        throw new Error("User not found");
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

    const updatePlan = (newPlan: Vendor['subscription']) => {
        const updated = user ? { ...user, subscription: newPlan } : {
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
    };

    const refreshProfile = async () => {
        if (supabase && session?.user) {
            const profile = await fetchVendorProfile(session.user.id);
            if (profile) {
                setUser(profile);
                localStorage.setItem('vendor_user', JSON.stringify(profile));
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
