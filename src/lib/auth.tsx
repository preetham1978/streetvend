import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Vendor } from './database.types';
import { mockDb, supabase, mapVendorFromDb } from './supabase';

interface AuthContextType {
    user: Vendor | null;
    session: any;
    loading: boolean;
    isLoading: boolean; // Backwards compatibility
    login: (phone: string) => Promise<Vendor>;
    logout: () => void; // Backwards compatibility
    signOut: () => Promise<void>;
    isAdmin: boolean;
    loginAdmin: () => void;
    isSuperAdmin: boolean;
    updatePlan: (newPlan: Vendor['plan']) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Vendor | null>(null);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const fetchVendorProfile = async (phone: string): Promise<Vendor> => {
        const cleanPhone = phone.trim();
        const digitsOnly = cleanPhone.replace(/\D/g, '');

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('vendors')
                    .select('*');
                if (data && !error && data.length > 0) {
                    const matched = data.find((v: any) => {
                        const vPhoneDigits = (v.phone || '').replace(/\D/g, '');
                        return v.phone === cleanPhone || (digitsOnly && vPhoneDigits.includes(digitsOnly));
                    });
                    if (matched) {
                        const vendor = mapVendorFromDb(matched);
                        setUser(vendor);
                        localStorage.setItem('vendor_user', JSON.stringify(vendor));
                        return vendor;
                    }
                }
            } catch (err) {
                console.error("Supabase load user profile error:", err);
            }
        }

        // Fallback to mockDb
        let vendor = mockDb.vendors.find(v => {
            const vDigits = v.phone.replace(/\D/g, '');
            return v.phone === cleanPhone || (digitsOnly && vDigits.endsWith(digitsOnly)) || (digitsOnly && digitsOnly.endsWith(vDigits));
        }) as Vendor | undefined;

        if (!vendor) {
            vendor = {
                id: 'v_' + Math.random().toString(36).substring(2, 9),
                storeName: "Streetvend Partner",
                ownerName: "Vendor",
                phone: cleanPhone || "+919876543210",
                category: "Street Food",
                plan: "free",
                subPaid: 0,
                isActive: true,
                qrCodeUrl: null,
                language: "en",
                createdAt: new Date().toISOString()
            };
            mockDb.vendors.push(vendor);
        }

        // If using Supabase, ensure the vendor (including mock/new ones) exists in the database
        // so that foreign key constraints (like in products table) don't fail.
        if (supabase) {
            try {
                const newVendorDb = {
                    id: vendor.id,
                    name: vendor.storeName,
                    owner_name: vendor.ownerName,
                    phone: vendor.phone,
                    email: vendor.email || null,
                    category: vendor.category,
                    subscription: vendor.plan === 'professional' ? 'pro' : vendor.plan,
                    is_active: true,
                    created_at: vendor.createdAt
                };
                
                // We use upsert to avoid duplicate errors if it was just added or existed
                const { error: insertError } = await (supabase.from('vendors') as any).upsert([newVendorDb], { onConflict: 'id' });
                if (insertError) {
                    console.error("Failed to sync vendor to Supabase:", insertError);
                }
            } catch (syncErr) {
                console.error("Exception syncing vendor to Supabase:", syncErr);
            }
        }

        setUser(vendor);
        localStorage.setItem('vendor_user', JSON.stringify(vendor));
        return vendor;
    };

    useEffect(() => {
        if (supabase) {
            // Get initial session
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                if (session?.user) {
                    setIsSuperAdmin(session.user.user_metadata?.role === 'superadmin');
                    fetchVendorProfile(session.user.phone || '').finally(() => {
                        setLoading(false);
                    });
                } else {
                    // Fallback to localStorage for mock session
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

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
                setSession(newSession);
                if (newSession?.user) {
                    setIsSuperAdmin(newSession.user.user_metadata?.role === 'superadmin');
                    await fetchVendorProfile(newSession.user.phone || '');
                } else {
                    setIsSuperAdmin(false);
                    // Only clear user if there is no local mock user
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
            // No Supabase, load from localStorage
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

    const login = async (phone: string): Promise<Vendor> => {
        // Clear any active admin session when logging in as vendor
        setIsAdmin(false);
        localStorage.removeItem('vendor_admin');
        const vendor = await fetchVendorProfile(phone);
        return vendor;
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

    const updatePlan = (newPlan: Vendor['plan']) => {
        const subPaidMap: Record<string, number> = {
            free: 0,
            starter: 79,
            professional: 299,
            growth: 549,
            enterprise: 999
        };
        const updated = user ? { ...user, plan: newPlan, subPaid: subPaidMap[newPlan] } : {
            id: 'v_demo',
            storeName: "Streetvend Partner",
            ownerName: "Vendor",
            phone: "+919876543210",
            category: "Street Food",
            plan: newPlan,
            subPaid: subPaidMap[newPlan],
            isActive: true,
            qrCodeUrl: null,
            language: "en" as const,
            createdAt: new Date().toISOString()
        };
        setUser(updated);
        localStorage.setItem('vendor_user', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            session, 
            loading, 
            isLoading: loading, 
            login, 
            logout, 
            signOut, 
            isAdmin, 
            loginAdmin, 
            isSuperAdmin,
            updatePlan 
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
