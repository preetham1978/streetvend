-- StreetVend Admin Analytics Migration
-- Run this in your Supabase SQL Editor to set up the necessary views and functions.

-- 1. View: admin_platform_summary
CREATE OR REPLACE VIEW admin_platform_summary AS
WITH plan_counts AS (
    SELECT 
        COUNT(*) FILTER (WHERE plan = 'free') as free_plan_count,
        COUNT(*) FILTER (WHERE plan = 'starter') as starter_plan_count,
        COUNT(*) FILTER (WHERE plan = 'professional') as pro_plan_count,
        COUNT(*) FILTER (WHERE plan = 'enterprise') as enterprise_plan_count,
        COUNT(*) as total_vendors
    FROM vendors
),
activity AS (
    SELECT COUNT(DISTINCT vendor_id) as active_vendors_7d
    FROM orders
    WHERE created_at > NOW() - INTERVAL '7 days'
),
today_stats AS (
    SELECT 
        COUNT(*) as total_orders_today,
        COALESCE(SUM(total), 0) as total_revenue_today
    FROM orders
    WHERE created_at::date = CURRENT_DATE
),
signup_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_vendors_this_week,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '7 days' AND created_at > NOW() - INTERVAL '14 days') as new_vendors_last_week
    FROM vendors
)
SELECT 
    p.total_vendors,
    a.active_vendors_7d,
    p.free_plan_count,
    p.starter_plan_count,
    p.pro_plan_count,
    p.enterprise_plan_count,
    (299 * p.starter_plan_count + 599 * p.pro_plan_count + 999 * p.enterprise_plan_count) as mrr,
    t.total_orders_today,
    t.total_revenue_today,
    s.new_vendors_this_week,
    s.new_vendors_last_week
FROM plan_counts p, activity a, today_stats t, signup_stats s;

-- 2. View: admin_vendor_leaderboard
CREATE OR REPLACE VIEW admin_vendor_leaderboard AS
SELECT 
    v.id as vendor_id,
    v.owner_name as vendor_name,
    v.store_name,
    v.plan as plan_tier,
    COUNT(o.id) as total_orders_30d,
    SUM(o.total) as total_revenue_30d,
    AVG(o.total) as avg_order_value,
    MAX(o.created_at) as last_active_at
FROM vendors v
LEFT JOIN orders o ON v.id = o.vendor_id AND o.created_at > NOW() - INTERVAL '30 days'
GROUP BY v.id, v.owner_name, v.store_name, v.plan
ORDER BY total_revenue_30d DESC NULLS LAST;

-- 3. View: admin_churn_risk
CREATE OR REPLACE VIEW admin_churn_risk AS
SELECT 
    v.id as vendor_id,
    v.owner_name as vendor_name,
    v.plan as plan_tier,
    MAX(o.created_at) as last_login_at, -- Using last order as proxy for login/activity
    EXTRACT(DAY FROM (NOW() - MAX(o.created_at))) as days_inactive
FROM vendors v
JOIN orders o ON v.id = o.vendor_id
WHERE v.plan != 'free'
GROUP BY v.id, v.owner_name, v.plan
HAVING MAX(o.created_at) < NOW() - INTERVAL '5 days';

-- 4. View: admin_signup_trend
CREATE OR REPLACE VIEW admin_signup_trend AS
SELECT 
    created_at::date as date,
    COUNT(*) as new_vendors_count,
    jsonb_build_object(
        'free', COUNT(*) FILTER (WHERE plan = 'free'),
        'starter', COUNT(*) FILTER (WHERE plan = 'starter'),
        'professional', COUNT(*) FILTER (WHERE plan = 'professional'),
        'enterprise', COUNT(*) FILTER (WHERE plan = 'enterprise')
    ) as plan_breakdown
FROM vendors
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY created_at::date
ORDER BY date DESC;

-- 5. View: admin_feature_usage
-- TODO: Ensure feature_logs table exists. Creating a mock view for now.
-- Expected table: feature_logs (id, vendor_id, feature_name, created_at)
CREATE OR REPLACE VIEW admin_feature_usage AS
SELECT 
    COUNT(*) FILTER (WHERE feature_name = 'ai_chat') as ai_chat_queries_total,
    COUNT(*) FILTER (WHERE feature_name = 'voice_order') as voice_orders_total,
    COUNT(*) FILTER (WHERE feature_name = 'whatsapp_bill') as whatsapp_bills_sent_total,
    COUNT(*) FILTER (WHERE feature_name = 'smart_pricing') as smart_pricing_uses_total
FROM (
    -- This is a placeholder. Replace with your actual events/logs table.
    SELECT 'ai_chat' as feature_name, NOW() as created_at
    WHERE FALSE
) as mock_logs;

-- 6. View: admin_top_products
CREATE OR REPLACE VIEW admin_top_products AS
SELECT 
    p.name as product_name,
    p.id as canonical_product_id,
    COUNT(DISTINCT p.vendor_id) as vendor_count,
    SUM(oi.quantity) as total_quantity_sold,
    p.category
FROM products p
LEFT JOIN (
    -- Explode items array from orders
    -- This assumes orders.items is a jsonb array of objects
    SELECT vendor_id, jsonb_array_elements(items) as item
    FROM orders
) as oi_raw ON p.vendor_id = oi_raw.vendor_id AND p.id = (oi_raw.item->>'productId')
GROUP BY p.id, p.name, p.category
ORDER BY vendor_count DESC
LIMIT 20;

-- Row Level Security for Views
-- Note: Views don't support RLS directly in the same way tables do, 
-- but we can restrict access by creating them with SECURITY DEFINER and 
-- checking the user's role in the view definition or via policies on underlying tables.
-- Alternatively, if using PostgREST, we can use the following approach:

ALTER VIEW admin_platform_summary SET (security_invoker = on);
ALTER VIEW admin_vendor_leaderboard SET (security_invoker = on);
ALTER VIEW admin_churn_risk SET (security_invoker = on);
ALTER VIEW admin_signup_trend SET (security_invoker = on);
ALTER VIEW admin_feature_usage SET (security_invoker = on);
ALTER VIEW admin_top_products SET (security_invoker = on);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

-- Row Level Security for Tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 1. Vendors Policies
CREATE POLICY "Vendors can view their own record" ON vendors
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all vendors" ON vendors
    FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'superadmin'));

CREATE POLICY "Admins can update all vendors" ON vendors
    FOR UPDATE USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'superadmin'));

-- 2. Orders Policies
CREATE POLICY "Vendors can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = vendor_id);

CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'superadmin'));

-- 3. Products Policies
CREATE POLICY "Vendors can manage their own products" ON products
    FOR ALL USING (auth.uid() = vendor_id);

CREATE POLICY "Admins can view all products" ON products
    FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'superadmin'));

-- 4. Audit Log Policies
CREATE POLICY "Only admins can view audit logs" ON admin_audit_log
    FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'superadmin'));

CREATE POLICY "System and admins can insert audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (true); -- Usually restricted further in production

-- set_superadmin function
CREATE OR REPLACE FUNCTION set_superadmin(target_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"role": "superadmin"}'
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run this manually in Supabase SQL editor to set up the first superadmin:
-- SELECT set_superadmin('your-user-id-here');
