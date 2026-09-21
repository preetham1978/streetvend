
export interface ProductTemplate {
  name: string;
  defaultUnit: string;
  category: string;
  type: 'product' | 'service';
  defaultPrice?: number;
}

export const PRODUCT_TEMPLATES: Record<string, ProductTemplate[]> = {
  "Vegetables & Fruits": [
    // Vegetables
    { name: "Onion", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Tomato", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Potato", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Brinjal", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Bhindi", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Cauliflower", defaultUnit: "piece", category: "Vegetables", type: 'product' },
    { name: "Cabbage", defaultUnit: "piece", category: "Vegetables", type: 'product' },
    { name: "Carrot", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Beans", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Green Peas", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Capsicum", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Cucumber", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Ginger", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Garlic", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Green Chilli", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Coriander Leaves", defaultUnit: "bunch", category: "Vegetables", type: 'product' },
    { name: "Spinach", defaultUnit: "bunch", category: "Vegetables", type: 'product' },
    { name: "Beetroot", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Radish", defaultUnit: "kg", category: "Vegetables", type: 'product' },
    { name: "Bottle Gourd", defaultUnit: "piece", category: "Vegetables", type: 'product' },
    // Fruits
    { name: "Banana", defaultUnit: "dozen", category: "Fruits", type: 'product' },
    { name: "Apple", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Orange", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Mango", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Papaya", defaultUnit: "piece", category: "Fruits", type: 'product' },
    { name: "Watermelon", defaultUnit: "piece", category: "Fruits", type: 'product' },
    { name: "Grapes", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Pomegranate", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Guava", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Sapota", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Pineapple", defaultUnit: "piece", category: "Fruits", type: 'product' },
    { name: "Sweet Lime", defaultUnit: "kg", category: "Fruits", type: 'product' },
    { name: "Lemon", defaultUnit: "piece", category: "Fruits", type: 'product' },
    { name: "Coconut", defaultUnit: "piece", category: "Fruits", type: 'product' },
  ],
  "Groceries": [
    { name: "Rice", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Wheat Atta", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Toor Dal", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Moong Dal", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Chana Dal", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Urad Dal", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Sugar", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Salt", defaultUnit: "kg", category: "Groceries", type: 'product' },
    { name: "Cooking Oil", defaultUnit: "litre", category: "Groceries", type: 'product' },
    { name: "Tea Powder", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Milk", defaultUnit: "litre", category: "Groceries", type: 'product' },
    { name: "Coffee Powder", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Turmeric Powder", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Chilli Powder", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Coriander Powder", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Garam Masala", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Biscuits", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Soap", defaultUnit: "piece", category: "Groceries", type: 'product' },
    { name: "Detergent", defaultUnit: "packet", category: "Groceries", type: 'product' },
    { name: "Matchbox", defaultUnit: "piece", category: "Groceries", type: 'product' },
  ],
  "Street Food": [
    { name: "Pani Puri", defaultUnit: "plate", category: "Snacks", type: 'product' },
    { name: "Samosa", defaultUnit: "piece", category: "Snacks", type: 'product' },
    { name: "Vada Pav", defaultUnit: "piece", category: "Snacks", type: 'product' },
    { name: "Masala Dosa", defaultUnit: "plate", category: "Breakfast", type: 'product' },
    { name: "Idli", defaultUnit: "plate", category: "Breakfast", type: 'product' },
    { name: "Pav Bhaji", defaultUnit: "plate", category: "Snacks", type: 'product' },
    { name: "Bhel Puri", defaultUnit: "plate", category: "Snacks", type: 'product' },
    { name: "Aloo Tikki", defaultUnit: "plate", category: "Snacks", type: 'product' },
    { name: "Jalebi", defaultUnit: "piece", category: "Sweets", type: 'product' },
    { name: "Chai", defaultUnit: "cup", category: "Beverages", type: 'product' },
  ],
  "Meat & Seafood": [
    { name: "Chicken (With Skin)", defaultUnit: "kg", category: "Meat", type: 'product' },
    { name: "Chicken (Skinless)", defaultUnit: "kg", category: "Meat", type: 'product' },
    { name: "Mutton", defaultUnit: "kg", category: "Meat", type: 'product' },
    { name: "Rohu Fish", defaultUnit: "kg", category: "Seafood", type: 'product' },
    { name: "Katla Fish", defaultUnit: "kg", category: "Seafood", type: 'product' },
    { name: "Prawns (Medium)", defaultUnit: "kg", category: "Seafood", type: 'product' },
    { name: "Eggs", defaultUnit: "dozen", category: "Meat", type: 'product' },
  ],
  "Laundry": [
    { name: "Wash & Iron", defaultUnit: "piece", category: "Laundry", type: 'service' },
    { name: "Dry Cleaning", defaultUnit: "piece", category: "Laundry", type: 'service' },
    { name: "Steam Iron", defaultUnit: "piece", category: "Laundry", type: 'service' },
    { name: "Blanket Wash", defaultUnit: "piece", category: "Laundry", type: 'service' },
    { name: "Shoe Cleaning", defaultUnit: "pair", category: "Laundry", type: 'service' },
  ],
  "Key Maker": [
    { name: "Duplicate Key (Standard)", defaultUnit: "piece", category: "Key Maker", type: 'service' },
    { name: "Duplicate Key (Computerized)", defaultUnit: "piece", category: "Key Maker", type: 'service' },
    { name: "Lock Repair", defaultUnit: "service", category: "Key Maker", type: 'service' },
    { name: "Emergency Lockout", defaultUnit: "service", category: "Key Maker", type: 'service' },
    { name: "Digital Key Programming", defaultUnit: "piece", category: "Key Maker", type: 'service' },
  ],
  "Mobile Accessories": [
    { name: "Tempered Glass", defaultUnit: "piece", category: "Accessories", type: 'product' },
    { name: "Silicon Mobile Case", defaultUnit: "piece", category: "Accessories", type: 'product' },
    { name: "Fast Charger", defaultUnit: "piece", category: "Electronics", type: 'product' },
    { name: "Wired Earphones", defaultUnit: "piece", category: "Electronics", type: 'product' },
    { name: "Type-C Cable", defaultUnit: "piece", category: "Electronics", type: 'product' },
  ],
  "Watch Repair's": [
    { name: "Battery Replacement", defaultUnit: "piece", category: "Repair", type: 'service' },
    { name: "Strap Replacement", defaultUnit: "piece", category: "Repair", type: 'service' },
    { name: "Glass Replacement", defaultUnit: "piece", category: "Repair", type: 'service' },
    { name: "Movement Servicing", defaultUnit: "service", category: "Repair", type: 'service' },
    { name: "Analog Watch Repair", defaultUnit: "service", category: "Repair", type: 'service' },
  ],
  "Pan Shop": [
    { name: "Meetha Pan", defaultUnit: "piece", category: "Pan", type: 'product' },
    { name: "Sada Pan", defaultUnit: "piece", category: "Pan", type: 'product' },
    { name: "Cigarette (Single)", defaultUnit: "piece", category: "Tobacco", type: 'product' },
    { name: "Matchbox", defaultUnit: "piece", category: "Essentials", type: 'product' },
    { name: "Cold Drink (250ml)", defaultUnit: "piece", category: "Beverages", type: 'product' },
  ],
  "Fancy Store": [
    { name: "Glass Bangles", defaultUnit: "set", category: "Fancy", type: 'product' },
    { name: "Metal Earrings", defaultUnit: "pair", category: "Fancy", type: 'product' },
    { name: "Necklace Set", defaultUnit: "piece", category: "Fancy", type: 'product' },
    { name: "Nail Polish", defaultUnit: "piece", category: "Cosmetics", type: 'product' },
    { name: "Lipstick", defaultUnit: "piece", category: "Cosmetics", type: 'product' },
    { name: "Hair Clips", defaultUnit: "piece", category: "Fancy", type: 'product' },
  ],
  "Stationery": [
    { name: "A4 Notebook (100 Pages)", defaultUnit: "piece", category: "Stationery", type: 'product' },
    { name: "Blue Ballpoint Pen", defaultUnit: "piece", category: "Stationery", type: 'product' },
    { name: "Pencil Pack", defaultUnit: "packet", category: "Stationery", type: 'product' },
    { name: "Eraser/Sharpener Set", defaultUnit: "piece", category: "Stationery", type: 'product' },
    { name: "Glue Stick", defaultUnit: "piece", category: "Stationery", type: 'product' },
    { name: "Plastic Ruler (15cm)", defaultUnit: "piece", category: "Stationery", type: 'product' },
    { name: "Chart Paper", defaultUnit: "piece", category: "Stationery", type: 'product' },
  ],
  "South Indian": [
    { name: "Plain Dosa", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Masala Dosa", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Mysore Masala Dosa", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Idli (2 pcs)", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Vada (2 pcs)", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Onion Uttapam", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Rava Dosa", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Medhu Vada", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Upma", defaultUnit: "plate", category: "South Indian", type: 'product' },
    { name: "Filter Coffee", defaultUnit: "cup", category: "Beverages", type: 'product' },
  ],
  "Kebab & Grill": [
    { name: "Chicken Tikka (6 pcs)", defaultUnit: "plate", category: "Kebab", type: 'product' },
    { name: "Mutton Seekh Kebab", defaultUnit: "plate", category: "Kebab", type: 'product' },
    { name: "Paneer Tikka", defaultUnit: "plate", category: "Grill", type: 'product' },
    { name: "Tandoori Chicken (Full)", defaultUnit: "piece", category: "Grill", type: 'product' },
    { name: "Tandoori Chicken (Half)", defaultUnit: "piece", category: "Grill", type: 'product' },
    { name: "Chicken Malai Kebab", defaultUnit: "plate", category: "Kebab", type: 'product' },
    { name: "Hariyali Kebab", defaultUnit: "plate", category: "Kebab", type: 'product' },
    { name: "Grilled Fish", defaultUnit: "plate", category: "Grill", type: 'product' },
    { name: "Rumali Roti", defaultUnit: "piece", category: "Bread", type: 'product' },
    { name: "Butter Naan", defaultUnit: "piece", category: "Bread", type: 'product' },
  ],
  "Timber & Wood Trading": [
    { name: "Teak Wood Batch (2.92 CBM / 42 Pcs - Bill #25)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 6\" x 9\" (Door Frame)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 5\" x 3\" (Window Frame)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 12\" x 4\" (Threshold Beam)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 12½' x 2\" (Planks)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 8\" x 6\" (Main Pillar)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 7\" x 14\" (Heavy Roof Beam)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 4\" x 3\" (Sub Post)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 6.5\" x 10\" (Door Frame)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 13\" x 12.5\" (Table Slab)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 2\" x 100\" (Long Battens)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 7\" x 40\" (Scaffolding Board)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 5\" x 60\" (Plank / Fascia)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 4\" x 2\" (Rafter / Joist)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Cut Size 3\" x 3\" (Runner / Batten)", defaultUnit: "CBM", category: "Teak Wood", type: 'product', defaultPrice: 116090.09 },
    { name: "Teak Wood Logs (Grade A)", defaultUnit: "CFT", category: "Teak Wood", type: 'product', defaultPrice: 1450 },
    { name: "Sal Wood Cut Sizes (3.5x3 & 4x3)", defaultUnit: "CFT", category: "Sal Wood", type: 'product', defaultPrice: 1100 },
    { name: "Rosewood Cut Sizes", defaultUnit: "CFT", category: "Rosewood", type: 'product', defaultPrice: 2600 },
    { name: "Pine Wood Planks", defaultUnit: "CFT", category: "Pine Wood", type: 'product', defaultPrice: 680 },
    { name: "Commercial Plywood 8x4 (18mm)", defaultUnit: "sheet", category: "Plywood", type: 'product', defaultPrice: 1850 },
    { name: "Marine Plywood 8x4 (12mm)", defaultUnit: "sheet", category: "Plywood", type: 'product', defaultPrice: 2200 },
    { name: "Veneer Sheet (8x4)", defaultUnit: "sqft", category: "Veneer", type: 'product', defaultPrice: 180 },
  ]
};

// Aliases for matching
PRODUCT_TEMPLATES["Timber Merchant"] = PRODUCT_TEMPLATES["Timber & Wood Trading"];
PRODUCT_TEMPLATES["Timber & Wood"] = PRODUCT_TEMPLATES["Timber & Wood Trading"];
PRODUCT_TEMPLATES["Wood Merchant"] = PRODUCT_TEMPLATES["Timber & Wood Trading"];
PRODUCT_TEMPLATES["Timber Store"] = PRODUCT_TEMPLATES["Timber & Wood Trading"];
PRODUCT_TEMPLATES["Kirana & General"] = PRODUCT_TEMPLATES["Groceries"];
PRODUCT_TEMPLATES["Grocery"] = PRODUCT_TEMPLATES["Groceries"];
PRODUCT_TEMPLATES["General Store"] = PRODUCT_TEMPLATES["Groceries"];
PRODUCT_TEMPLATES["Organic Store"] = PRODUCT_TEMPLATES["Groceries"];
PRODUCT_TEMPLATES["Dairy & Bakery"] = PRODUCT_TEMPLATES["Groceries"];
PRODUCT_TEMPLATES["Fruit & Vegetables"] = PRODUCT_TEMPLATES["Vegetables & Fruits"];
PRODUCT_TEMPLATES["Fruits & Vegetables"] = PRODUCT_TEMPLATES["Vegetables & Fruits"];
PRODUCT_TEMPLATES["Fruits and Vegetables"] = PRODUCT_TEMPLATES["Vegetables & Fruits"];
PRODUCT_TEMPLATES["Vegetables and Fruits"] = PRODUCT_TEMPLATES["Vegetables & Fruits"];
PRODUCT_TEMPLATES["Fresh Produce"] = PRODUCT_TEMPLATES["Vegetables & Fruits"];
PRODUCT_TEMPLATES["Meat and Seafood"] = PRODUCT_TEMPLATES["Meat & Seafood"];
PRODUCT_TEMPLATES["Seafood & Meat"] = PRODUCT_TEMPLATES["Meat & Seafood"];
PRODUCT_TEMPLATES["Streetfood"] = PRODUCT_TEMPLATES["Street Food"];
PRODUCT_TEMPLATES["Watch Repair"] = PRODUCT_TEMPLATES["Watch Repair's"];
PRODUCT_TEMPLATES["Watch Repairs"] = PRODUCT_TEMPLATES["Watch Repair's"];
PRODUCT_TEMPLATES["Stationary"] = PRODUCT_TEMPLATES["Stationery"];
PRODUCT_TEMPLATES["Dosa Point"] = PRODUCT_TEMPLATES["South Indian"];
PRODUCT_TEMPLATES["Tiffin Center"] = PRODUCT_TEMPLATES["South Indian"];
PRODUCT_TEMPLATES["South Indian Tiffins"] = PRODUCT_TEMPLATES["South Indian"];
PRODUCT_TEMPLATES["Kebab Store"] = PRODUCT_TEMPLATES["Kebab & Grill"];
PRODUCT_TEMPLATES["Kebab Center"] = PRODUCT_TEMPLATES["Kebab & Grill"];
PRODUCT_TEMPLATES["Kabab Store"] = PRODUCT_TEMPLATES["Kebab & Grill"];
PRODUCT_TEMPLATES["Kabab Center"] = PRODUCT_TEMPLATES["Kebab & Grill"];
PRODUCT_TEMPLATES["Grill & BBQ"] = PRODUCT_TEMPLATES["Kebab & Grill"];
PRODUCT_TEMPLATES["Tandoori Point"] = PRODUCT_TEMPLATES["Kebab & Grill"];
