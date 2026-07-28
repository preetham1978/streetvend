import { createClient } from '@supabase/supabase-js';
import { Database, Vendor, Product, Order } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Mapping helpers between Supabase DB columns and frontend types
export function mapVendorFromDb(row: any): Vendor {
  return {
    id: row.id,
    storeName: row.name || '',
    ownerName: row.owner_name || '',
    phone: row.phone || '',
    email: row.email || '',
    category: row.category || 'Street Food',
    plan: (row.subscription === 'pro' ? 'professional' : row.subscription) || 'free',
    subPaid: row.subscription === 'enterprise' ? 999 : row.subscription === 'growth' ? 549 : row.subscription === 'professional' || row.subscription === 'pro' ? 299 : row.subscription === 'starter' ? 79 : 0,
    isActive: row.is_active ?? true,
    qrCodeUrl: row.qr_code_url || null,
    language: 'en',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function mapProductFromDb(row: any): Product {
  return {
    id: row.id,
    vendorId: row.vendor_id || '',
    name: row.name || '',
    price: row.price || 0,
    unit: row.unit || 'piece',
    stock: row.stock_qty ?? 10,
    category: row.category || 'General',
    barcode: row.barcode || ''
  };
}

export function mapOrderFromDb(row: any): Order {
  return {
    id: row.id,
    vendorId: row.vendor_id || '',
    items: row.items || [],
    total: row.total || 0,
    paymentMethod: (row.payment_method === 'upi' ? 'upi' : row.payment_method === 'card' ? 'card' : 'cash'),
    createdAt: row.created_at || new Date().toISOString()
  };
}

// Mock database fallback for offline/testing
export const mockDb: {
  vendors: Vendor[];
  products: Product[];
  orders: Order[];
  payments: any[];
} = {
  vendors: [
    { id: '1', storeName: "Raju's Chaat Corner", ownerName: "Raju Sharma", phone: "+919876543210", category: "Street Food", plan: "professional", subPaid: 599, isActive: true, qrCodeUrl: null, language: "en", createdAt: new Date().toISOString() },
    { id: '2', storeName: "Fresh Green Organics", ownerName: "Meena Patel", phone: "+919876543211", category: "Vegetables & Fruits", plan: "starter", subPaid: 299, isActive: true, qrCodeUrl: null, language: "en", createdAt: new Date().toISOString() },
    { id: '3', storeName: "Al-Noor Meat Shop", ownerName: "Ahmed Khan", phone: "+919876543212", category: "Meat & Seafood", plan: "enterprise", subPaid: 0, isActive: true, qrCodeUrl: null, language: "en", createdAt: new Date().toISOString() },
    { id: '4', storeName: "Aunty's Dosa Point", ownerName: "Lakshmi Iyer", phone: "+919876543214", category: "Street Food", plan: "starter", subPaid: 0, isActive: true, qrCodeUrl: null, language: "en", createdAt: new Date().toISOString() },
    { id: '5', storeName: "Preetham's Kabab", ownerName: "Preetham", phone: "+917092006655", category: "Street Food", plan: "free", subPaid: 0, isActive: true, qrCodeUrl: null, language: "en", createdAt: new Date().toISOString() },
    { id: '6', storeName: "Sai Kirana Store", ownerName: "Suresh Yadav", phone: "+919876543213", category: "Groceries", plan: "free", subPaid: 0, isActive: true, qrCodeUrl: null, language: "en", createdAt: new Date().toISOString() },
    { id: '7', storeName: "Preetham's Kebab", ownerName: "Preetham", phone: "+919900112233", category: "Street Food", plan: "enterprise", subPaid: 1179, isActive: true, qrCodeUrl: null, language: "en", createdAt: new Date().toISOString() }
  ],
  products: [
    { id: '101', vendorId: '1', name: 'Pani Puri', price: 40, unit: 'plate', stock: 100, category: 'Snacks' },
    { id: '102', vendorId: '1', name: 'Bhel Puri', price: 50, unit: 'plate', stock: 50, category: 'Snacks' },
    { id: '103', vendorId: '1', name: 'Aloo Tikki', price: 60, unit: 'plate', stock: 30, category: 'Snacks' },
    { id: '104', vendorId: '1', name: 'Dahi Puri', price: 65, unit: 'plate', stock: 40, category: 'Snacks' },

    { id: '201', vendorId: '2', name: 'Organic Spinach', price: 40, unit: 'kg', stock: 25, category: 'Vegetables' },
    { id: '202', vendorId: '2', name: 'Farm Fresh Apples', price: 120, unit: 'kg', stock: 30, category: 'Fruits' },
    { id: '203', vendorId: '2', name: 'Fresh Carrots', price: 50, unit: 'kg', stock: 40, category: 'Vegetables' },

    { id: '301', vendorId: '3', name: 'Fresh Chicken Breast', price: 260, unit: 'kg', stock: 15, category: 'Poultry' },
    { id: '302', vendorId: '3', name: 'Mutton Chops', price: 650, unit: 'kg', stock: 10, category: 'Meat' },

    { id: '401', vendorId: '4', name: 'Masala Dosa', price: 70, unit: 'plate', stock: 50, category: 'South Indian' },
    { id: '402', vendorId: '4', name: 'Plain Dosa', price: 50, unit: 'plate', stock: 60, category: 'South Indian' },
    { id: '403', vendorId: '4', name: 'Idli Vada Combo', price: 60, unit: 'plate', stock: 45, category: 'South Indian' },

    { id: '501', vendorId: '5', name: 'Chicken Tikka Kabab', price: 240, unit: 'plate', stock: 35, category: 'Non-Veg' },
    { id: '502', vendorId: '5', name: 'Reshmi Kabab', price: 280, unit: 'plate', stock: 25, category: 'Non-Veg' },
    { id: '503', vendorId: '5', name: 'Mutton Seekh Kabab', price: 350, unit: 'plate', stock: 20, category: 'Non-Veg' },

    { id: '601', vendorId: '6', name: 'Basmati Rice 1kg', price: 110, unit: 'pack', stock: 50, category: 'Grains' },
    { id: '602', vendorId: '6', name: 'Fortune Sunflower Oil 1L', price: 145, unit: 'pouch', stock: 30, category: 'Grocery' },

    { id: '701', vendorId: '7', name: 'Special Mixed Platter', price: 580, unit: 'platter', stock: 15, category: 'Special' },
    { id: '702', vendorId: '7', name: 'Galouti Kebab', price: 320, unit: 'plate', stock: 20, category: 'Special' }
  ],
  orders: [
    { id: 'o1', vendorId: '1', items: [{ productId: '101', name: 'Pani Puri', price: 40, quantity: 3 }], total: 120, paymentMethod: 'upi', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'o2', vendorId: '1', items: [{ productId: '102', name: 'Bhel Puri', price: 50, quantity: 2 }, { productId: '103', name: 'Aloo Tikki', price: 60, quantity: 1 }], total: 160, paymentMethod: 'cash', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'o3', vendorId: '1', items: [{ productId: '104', name: 'Dahi Puri', price: 65, quantity: 2 }, { productId: '101', name: 'Pani Puri', price: 40, quantity: 1.43 }], total: 187.25, paymentMethod: 'upi', createdAt: new Date(Date.now() - 10800000).toISOString() },

    { id: 'o4', vendorId: '2', items: [{ productId: '202', name: 'Farm Fresh Apples', price: 120, quantity: 2 }, { productId: '201', name: 'Organic Spinach', price: 33, quantity: 1 }], total: 273, paymentMethod: 'upi', createdAt: new Date().toISOString() },

    { id: 'o5', vendorId: '3', items: [{ productId: '301', name: 'Fresh Chicken Breast', price: 260, quantity: 1 }, { productId: '302', name: 'Mutton Chops', price: 202, quantity: 1 }], total: 462, paymentMethod: 'cash', createdAt: new Date().toISOString() },

    { id: 'o6', vendorId: '4', items: [{ productId: '401', name: 'Masala Dosa', price: 70, quantity: 2 }, { productId: '403', name: 'Idli Vada Combo', price: 60, quantity: 1.51 }], total: 231, paymentMethod: 'upi', createdAt: new Date().toISOString() },

    { id: 'o7', vendorId: '5', items: [{ productId: '503', name: 'Mutton Seekh Kabab', price: 350, quantity: 5 }, { productId: '501', name: 'Chicken Tikka Kabab', price: 240, quantity: 5 }], total: 2950, paymentMethod: 'upi', createdAt: new Date().toISOString() },
    { id: 'o8', vendorId: '5', items: [{ productId: '502', name: 'Reshmi Kabab', price: 280, quantity: 3.15 }], total: 882.5, paymentMethod: 'cash', createdAt: new Date().toISOString() },

    { id: 'o9', vendorId: '6', items: [{ productId: '601', name: 'Basmati Rice 1kg', price: 110, quantity: 1 }, { productId: '602', name: 'Fortune Sunflower Oil 1L', price: 145, quantity: 1 }, { productId: '601', name: 'Extra Item', price: 46.35, quantity: 1 }], total: 301.35, paymentMethod: 'cash', createdAt: new Date().toISOString() },

    { id: 'o10', vendorId: '7', items: [{ productId: '701', name: 'Special Mixed Platter', price: 580, quantity: 1 }, { productId: '702', name: 'Galouti Kebab', price: 320, quantity: 1 }], total: 900, paymentMethod: 'upi', createdAt: new Date().toISOString() },
    { id: 'o11', vendorId: '7', items: [{ productId: '702', name: 'Galouti Kebab', price: 297, quantity: 1 }], total: 297, paymentMethod: 'upi', createdAt: new Date().toISOString() }
  ],
  payments: []
};

