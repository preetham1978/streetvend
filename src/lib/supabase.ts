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
    storeName: row.name || row.store_name || '',
    ownerName: row.owner_name || '',
    phone: row.phone || '',
    email: row.email || '',
    category: row.category || 'Street Food',
    subscription: row.subscription || 'free',
    scheduledDowngrade: row.scheduled_downgrade || null,
    downgradeEffectiveDate: row.downgrade_effective_date || null,
    billingPeriodEnd: row.billing_period_end || null,
    isActive: row.is_active ?? true,
    qrCodeUrl: row.qr_code_url || null,
    upiId: row.upi_id || null,
    language: 'en',
    createdAt: row.created_at || new Date().toISOString(),
    gstin: row.gstin || row.gst_tin || null,
    pan: row.pan || null,
    hsnCode: row.hsn_code || null,
    address: row.address || null
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
    total: row.total || row.total_amount || 0,
    paymentMethod: (row.payment_method === 'upi' ? 'upi' : row.payment_method === 'card' ? 'card' : 'cash'),
    paymentStatus: row.status || row.payment_status || 'confirmed',
    createdAt: row.created_at || new Date().toISOString(),
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerAddress: row.customer_address || '',
    customerGstin: row.customer_gstin || '',
    ewayBillNo: row.eway_bill_no || '',
    vehicleNo: row.vehicle_no || '',
    taxableAmount: row.taxable_amount || 0,
    cgst: row.cgst || 0,
    sgst: row.sgst || 0,
    igst: row.igst || 0,
    woodSpecs: row.wood_specs || ''
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
    {
      id: 'v_timber_1',
      storeName: 'K.V.SOMASUNDARAM SON',
      ownerName: 'K.V. Somasundaram Son',
      phone: '+919865016017',
      email: 'kvstimbers@gmail.com',
      category: 'Timber & Wood Trading',
      subscription: 'enterprise',
      isActive: true,
      qrCodeUrl: null,
      upiId: 'kvstimbers@okaxis',
      language: 'en',
      createdAt: new Date().toISOString(),
      gstin: '33AJKPP5362R1ZG',
      pan: 'AJKPP5362R',
      hsnCode: '4407 / 4403',
      address: '1-A, Modachur Road, Gobi - 638476, Erode (Dt)'
    },
    { id: '1', storeName: "Raju's Chaat Corner", ownerName: "Raju Sharma", phone: "+919876543210", category: "Street Food", subscription: "professional", isActive: true, qrCodeUrl: null, upiId: 'raju@okaxis', language: "en", createdAt: new Date().toISOString() },
    { id: '2', storeName: "Fresh Green Organics", ownerName: "Meena Patel", phone: "+919876543211", category: "Vegetables & Fruits", subscription: "starter", isActive: true, qrCodeUrl: null, upiId: null, language: "en", createdAt: new Date().toISOString() },
    { id: '3', storeName: "Al-Noor Meat Shop", ownerName: "Ahmed Khan", phone: "+919876543212", category: "Meat & Seafood", subscription: "enterprise", isActive: true, qrCodeUrl: null, upiId: null, language: "en", createdAt: new Date().toISOString() },
    { id: '4', storeName: "Aunty's Dosa Point", ownerName: "Lakshmi Iyer", phone: "+919876543214", category: "Street Food", subscription: "starter", isActive: true, qrCodeUrl: null, upiId: null, language: "en", createdAt: new Date().toISOString() },
    { id: '5', storeName: "Preetham's Kabab", ownerName: "Preetham", phone: "+917092006655", category: "Street Food", subscription: "free", isActive: true, qrCodeUrl: null, upiId: 'prithvi@okaxis', language: "en", createdAt: new Date().toISOString() },
    { id: '6', storeName: "Sai Kirana Store", ownerName: "Suresh Yadav", phone: "+919876543213", category: "Groceries", subscription: "free", isActive: true, qrCodeUrl: null, upiId: null, language: "en", createdAt: new Date().toISOString() },
    { id: '7', storeName: "Preetham's Kebab", ownerName: "Preetham", phone: "+919900112233", category: "Street Food", subscription: "enterprise", isActive: true, qrCodeUrl: null, upiId: null, language: "en", createdAt: new Date().toISOString() }
  ],
  products: [
    { id: 't101', vendorId: 'v_timber_1', name: 'Teak Wood Sizes', price: 116090.09, unit: 'CBM', stock: 50, category: 'Teak Wood', barcode: '44070001' },
    { id: 't102', vendorId: 'v_timber_1', name: 'Teak Wood Logs', price: 1450, unit: 'CFT', stock: 500, category: 'Teak Wood', barcode: '44070002' },
    { id: 't103', vendorId: 'v_timber_1', name: 'Sal Wood Sizes', price: 1100, unit: 'CFT', stock: 350, category: 'Sal Wood', barcode: '44070003' },
    { id: 't104', vendorId: 'v_timber_1', name: 'Rosewood Cut Sizes', price: 2600, unit: 'CFT', stock: 200, category: 'Rosewood', barcode: '44070004' },
    { id: 't105', vendorId: 'v_timber_1', name: 'Pine Wood Planks', price: 680, unit: 'CFT', stock: 400, category: 'Pine Wood', barcode: '44070005' },
    { id: 't106', vendorId: 'v_timber_1', name: 'Commercial Plywood 8x4 (18mm)', price: 1850, unit: 'sheet', stock: 150, category: 'Plywood', barcode: '44070006' },

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
    {
      id: '25',
      vendorId: 'v_timber_1',
      customerName: 'R. Thangavelu',
      customerPhone: '9865016017',
      customerAddress: 'Nalla chitti Palayam, Sivagiri, Erode Dt.',
      ewayBillNo: '5418 6645 4188',
      vehicleNo: 'TN-70J-6881',
      taxableAmount: 338983.06,
      cgst: 30508.47,
      sgst: 30508.47,
      igst: 61016.94,
      total: 400000.00,
      items: [
        {
          productId: 't101',
          name: 'Teak Wood Sizes (2.92 CBM / 42 Pcs)',
          price: 116090.09,
          quantity: 2.92
        }
      ],
      woodSpecs: 'Sizes: 6x9, 5x3, 12x4, 12.5x2, 8x6, 8.3x1, 9x2, 3.5x3, 6.5x2, 7.5x1.5, 7x14, 4x3, 8x2, 5x2, 3.5x1, 4x2, 6.5x10, 3x3, 13x12.5, 5x4, 3.5x6, 8x3, 6x6, 4x2, 5.5x1, 12.5x14, 7x40, 7.4x1, 4x8, 5x60, 2.4x1, 8x12, 7x100, 13.5x1.5, 6.5x10, 4x4, 7x2, 5x20, 4x1, 4.5x14, 12x2, 3.5x7 (Total: 2.92 M.CUBM / ~103.12 CFT)',
      paymentMethod: 'cash',
      paymentStatus: 'confirmed',
      createdAt: '2025-08-25T14:30:00.000Z'
    },
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

