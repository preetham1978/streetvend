import { apiFetch } from './apiFetch';
import { supabase, mapProductFromDb, mapOrderFromDb, mapVendorFromDb, mockDb } from './supabase';
import { Product, Order, Vendor } from './database.types';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const inFlightPromises = new Map<string, Promise<any>>();

/**
 * Executes a fetcher with in-flight request deduplication and time-to-live caching.
 */
export async function fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 30000,
    forceRefresh: boolean = false
): Promise<T> {
    const now = Date.now();
    
    if (!forceRefresh) {
        const existing = cache.get(key);
        if (existing && (now - existing.timestamp < ttlMs)) {
            return existing.data;
        }

        if (inFlightPromises.has(key)) {
            return inFlightPromises.get(key)!;
        }
    }

    const promise = (async () => {
        try {
            const data = await fetcher();
            cache.set(key, { data, timestamp: Date.now() });
            return data;
        } finally {
            inFlightPromises.delete(key);
        }
    })();

    inFlightPromises.set(key, promise);
    return promise;
}

/**
 * Invalidates cache entries matching a prefix or clears all if no prefix is provided.
 */
export function invalidateCache(keyPrefix?: string) {
    if (!keyPrefix) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key.startsWith(keyPrefix)) {
            cache.delete(key);
        }
    }
}

/**
 * Fetches vendor products with deduplication and 30s cache.
 */
export async function getVendorProducts(vendorId: string, forceRefresh = false): Promise<Product[]> {
    if (!vendorId) return [];
    return fetchWithCache(
        `products:${vendorId}`,
        async () => {
            let remoteList: Product[] = [];
            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from('products')
                        .select('*')
                        .eq('vendor_id', vendorId);
                    if (data && !error) {
                        remoteList = data.map(mapProductFromDb);
                    }
                } catch (e) {
                    console.warn("Remote product fetch error:", e);
                }
            }
            const localList = mockDb.products.filter(p => p.vendorId === vendorId) as Product[];
            
            // Merge without duplicates
            const combined = [...remoteList];
            for (const lp of localList) {
                if (!combined.some(rp => rp.id === lp.id || rp.name.toLowerCase() === lp.name.toLowerCase())) {
                    combined.push(lp);
                }
            }
            return combined;
        },
        30000,
        forceRefresh
    );
}

/**
 * Fetches vendor orders with deduplication and 30s cache.
 */
export async function getVendorOrders(vendorId: string, forceRefresh = false): Promise<Order[]> {
    if (!vendorId) return [];
    return fetchWithCache(
        `orders:${vendorId}`,
        async () => {
            if (supabase) {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('vendor_id', vendorId);
                if (data && !error) {
                    return data.map(mapOrderFromDb);
                }
            }
            return [];
        },
        30000,
        forceRefresh
    );
}

/**
 * Fetches vendor profile with deduplication and 60s cache.
 */
export async function getVendorProfile(userIdOrEmail: string, forceRefresh = false): Promise<Vendor | null> {
    if (!userIdOrEmail) return null;
    return fetchWithCache(
        `profile:${userIdOrEmail}`,
        async () => {
            // 1. Try server admin endpoint first (bypasses RLS and type casting quirks)
            try {
                const res = await apiFetch(`/api/vendor/profile?identifier=${encodeURIComponent(userIdOrEmail)}`);
                if (res.ok) {
                    const resJson = await res.json();
                    if (resJson.success && resJson.vendor) {
                        return mapVendorFromDb(resJson.vendor);
                    }
                }
            } catch (apiErr) {
                // Silently ignore or handle error
            }

            // 2. Direct Supabase query fallback
            if (supabase) {
                const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userIdOrEmail);
                let query = supabase.from('vendors').select('*');
                if (isUuid) {
                    query = query.or(`user_id.eq.${userIdOrEmail},id.eq.${userIdOrEmail}`);
                } else {
                    query = query.ilike('email', userIdOrEmail.trim());
                }

                const { data, error } = await query.limit(1);

                if (data && data.length > 0 && !error) {
                    return mapVendorFromDb(data[0]);
                }
            }

            // 3. Mock DB fallback
            const mockVendor = mockDb.vendors.find(v => 
                v.id === userIdOrEmail || 
                v.email.toLowerCase() === userIdOrEmail.toLowerCase()
            );
            if (mockVendor) {
                return mockVendor;
            }

            return null;
        },
        60000,
        forceRefresh
    );
}

/**
 * Fetches vendor trust score with deduplication and 5m cache.
 */
export async function getVendorTrustScore(vendorId: string, token?: string, forceRefresh = false): Promise<any> {
    if (!vendorId) return null;
    return fetchWithCache(
        `trust_score:${vendorId}`,
        async () => {
            if (!token) return null;
            const res = await apiFetch(`/api/vendor/${vendorId}/trust-score`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                return await res.json();
            }
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `HTTP error! status: ${res.status}`);
        },
        300000, // 5 minutes TTL
        forceRefresh
    );
}

/**
 * Fetches AI Daily Insights with deduplication and 15m session cache.
 */
export async function getAiDailyInsight(vendorId: string, products: Product[], orders: Order[], vendorPlan?: string, forceRefresh = false): Promise<string> {
    if (vendorPlan && vendorPlan.toLowerCase() === 'free') {
        throw new Error("GatedFeature: Free tier does not include AI Daily Insights.");
    }
    if (!vendorId) return "Add your first product to unlock AI insights.";
    if (products.length === 0) return "Add your first product to unlock AI insights.";
    if (orders.length === 0) return "Log your first order to unlock data-driven AI insights.";

    return fetchWithCache(
        `ai_insight:${vendorId}`,
        async () => {
            const res = await apiFetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'stock', vendorId, vendorPlan, vendorData: products })
            });
            if (res.status === 403) {
                throw new Error("GatedFeature: AI Daily Insights require a Starter plan subscription.");
            }
            if (res.ok) {
                const data = await res.json();
                const prediction = data?.data?.predictions?.[0];
                if (prediction && prediction.recommendation) {
                    return prediction.recommendation;
                }
            }
            return "AI Insights will appear here as your store generates more sales data.";
        },
        900000, // 15 minutes TTL
        forceRefresh
    );
}
