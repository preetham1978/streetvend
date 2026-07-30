export interface Vendor {
    id: string;
    userId?: string;
    storeName: string;
    ownerName: string;
    phone: string;
    email?: string;
    category: string;
    subscription: 'free' | 'starter' | 'growth' | 'professional' | 'enterprise';
    scheduledDowngrade?: 'free' | 'starter' | 'growth' | 'professional' | null;
    downgradeEffectiveDate?: string | null;
    billingPeriodEnd?: string | null;
    isActive: boolean;
    qrCodeUrl: string | null;
    language: 'en' | 'hi' | 'ta' | 'kn';
    createdAt: string;
}

export interface Product {
    id: string;
    vendorId: string;
    name: string;
    price: number;
    unit?: string;
    stock: number;
    category: string;
    barcode?: string;
    type?: 'product' | 'service';
}

export interface OrderItem {
    id?: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: string;
    vendorId: string;
    items: OrderItem[];
    total: number;
    paymentMethod: 'cash' | 'upi' | 'card';
    createdAt: string;
}

export interface Payment {
    id: string;
    vendorId: string;
    subscription: Vendor['subscription'];
    amount: number;
    gst: number;
    method: 'upi' | 'card' | 'netbanking';
    status: 'success' | 'pending' | 'refunded';
    createdAt: string;
}

export type Database = {
    public: {
        Tables: {
            vendors: { 
                Row: Vendor;
                Insert: Partial<Vendor>;
                Update: Partial<Vendor>;
            };
            products: { 
                Row: Product;
                Insert: Partial<Product>;
                Update: Partial<Product>;
            };
            orders: { 
                Row: Order;
                Insert: Partial<Order>;
                Update: Partial<Order>;
            };
            payments: { 
                Row: Payment;
                Insert: Partial<Payment>;
                Update: Partial<Payment>;
            };
            admin_audit_log: { 
                Row: { 
                    id: string;
                    admin_user_id: string;
                    action: string;
                    timestamp: string;
                    ip_address: string | null;
                };
                Insert: { 
                    id?: string;
                    admin_user_id: string;
                    action: string;
                    timestamp?: string;
                    ip_address?: string | null;
                };
                Update: { 
                    id?: string;
                    admin_user_id?: string;
                    action?: string;
                    timestamp?: string;
                    ip_address?: string | null;
                };
            };
        };
        Views: {
            admin_platform_summary: { Row: any };
            admin_vendor_leaderboard: { Row: any };
            admin_churn_risk: { Row: any };
            admin_signup_trend: { Row: any };
            admin_feature_usage: { Row: any };
            admin_top_products: { Row: any };
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
    };
};
