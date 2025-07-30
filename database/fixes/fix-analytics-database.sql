-- Fix Analytics Database Issues
-- This script creates missing tables and adds necessary columns for the analytics screen

-- 1. Create customer_messages table for tracking seller response rates
CREATE TABLE IF NOT EXISTS customer_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response_message TEXT,
  response_time_minutes INTEGER,
  is_responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for customer_messages
CREATE INDEX IF NOT EXISTS idx_customer_messages_shop_id ON customer_messages(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_id ON customer_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_is_responded ON customer_messages(is_responded);

-- Enable RLS for customer_messages
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_messages
CREATE POLICY "Shop owners can view messages for their shops" ON customer_messages
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "Customers can view their own messages" ON customer_messages
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert messages" ON customer_messages
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Shop owners can update messages for their shops" ON customer_messages
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- 2. Create product_categories table for category analytics
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at on product_categories
CREATE TRIGGER set_timestamp_product_categories
BEFORE UPDATE ON product_categories
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Insert default categories
INSERT INTO product_categories (name, description, icon) VALUES
  ('Electronics', 'Electronic devices and gadgets', 'hardware-chip-outline'),
  ('Clothing', 'Apparel and fashion items', 'shirt-outline'),
  ('Food & Beverages', 'Food items and drinks', 'restaurant-outline'),
  ('Books', 'Books and educational materials', 'book-outline'),
  ('Home & Garden', 'Home improvement and garden items', 'home-outline'),
  ('Beauty & Health', 'Beauty products and health items', 'sparkles-outline'),
  ('Sports & Recreation', 'Sports equipment and recreational items', 'fitness-outline'),
  ('Toys & Games', 'Toys and gaming items', 'game-controller-outline'),
  ('Automotive', 'Car parts and automotive accessories', 'car-outline'),
  ('Office Supplies', 'Office and business supplies', 'briefcase-outline')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS for product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_categories (public read)
CREATE POLICY "Anyone can view product categories" ON product_categories
  FOR SELECT USING (is_active = TRUE);

-- 3. Add missing columns to orders table for analytics
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'pending', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMP WITH TIME ZONE;

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);

-- 4. Add category_id to products table to link with product_categories
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

-- Update existing products to have category_id based on category text
UPDATE products 
SET category_id = (
  SELECT id FROM product_categories 
  WHERE product_categories.name = products.category 
  LIMIT 1
)
WHERE category_id IS NULL AND category IS NOT NULL;

-- 5. Enhance seller_stats table with additional columns for analytics
ALTER TABLE seller_stats
ADD COLUMN IF NOT EXISTS pending_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS canceled_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_order_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_customers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_success_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_growth_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_product_id UUID,
ADD COLUMN IF NOT EXISTS top_product_name TEXT,
ADD COLUMN IF NOT EXISTS top_product_sales NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_category TEXT,
ADD COLUMN IF NOT EXISTS top_category_sales NUMERIC DEFAULT 0;

-- 6. Create function to update comprehensive seller stats
CREATE OR REPLACE FUNCTION update_comprehensive_seller_stats(target_shop_id UUID)
RETURNS VOID AS $$
DECLARE
  stats_record RECORD;
  top_product_record RECORD;
  top_category_record RECORD;
BEGIN
  -- Calculate comprehensive statistics for the shop
  SELECT 
    COALESCE(SUM(total_amount), 0) as total_revenue,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'completed' OR status = 'delivered') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as canceled_orders,
    COUNT(DISTINCT buyer_id) as total_customers,
    CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_amount), 0) / COUNT(*) ELSE 0 END as average_order_value
  INTO stats_record
  FROM orders 
  WHERE shop_id = target_shop_id;

  -- Get top selling product
  SELECT 
    p.id,
    p.name,
    SUM(oi.quantity * oi.unit_price) as total_sales
  INTO top_product_record
  FROM products p
  JOIN order_items oi ON p.id = oi.product_id
  JOIN orders o ON oi.order_id = o.id
  WHERE o.shop_id = target_shop_id
  GROUP BY p.id, p.name
  ORDER BY total_sales DESC
  LIMIT 1;

  -- Get top selling category
  SELECT 
    pc.name,
    SUM(oi.quantity * oi.unit_price) as total_sales
  INTO top_category_record
  FROM product_categories pc
  JOIN products p ON pc.id = p.category_id
  JOIN order_items oi ON p.id = oi.product_id
  JOIN orders o ON oi.order_id = o.id
  WHERE o.shop_id = target_shop_id
  GROUP BY pc.name
  ORDER BY total_sales DESC
  LIMIT 1;

  -- Update or insert seller_stats
  INSERT INTO seller_stats (
    shop_id, total_revenue, total_orders, completed_orders, 
    pending_orders, processing_orders, canceled_orders,
    total_customers, average_order_value,
    top_product_id, top_product_name, top_product_sales,
    top_category, top_category_sales,
    last_updated
  ) VALUES (
    target_shop_id,
    stats_record.total_revenue,
    stats_record.total_orders,
    stats_record.completed_orders,
    stats_record.pending_orders,
    stats_record.processing_orders,
    stats_record.canceled_orders,
    stats_record.total_customers,
    stats_record.average_order_value,
    top_product_record.id,
    top_product_record.name,
    COALESCE(top_product_record.total_sales, 0),
    top_category_record.name,
    COALESCE(top_category_record.total_sales, 0),
    NOW()
  )
  ON CONFLICT (shop_id) 
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_orders = EXCLUDED.total_orders,
    completed_orders = EXCLUDED.completed_orders,
    pending_orders = EXCLUDED.pending_orders,
    processing_orders = EXCLUDED.processing_orders,
    canceled_orders = EXCLUDED.canceled_orders,
    total_customers = EXCLUDED.total_customers,
    average_order_value = EXCLUDED.average_order_value,
    top_product_id = EXCLUDED.top_product_id,
    top_product_name = EXCLUDED.top_product_name,
    top_product_sales = EXCLUDED.top_product_sales,
    top_category = EXCLUDED.top_category,
    top_category_sales = EXCLUDED.top_category_sales,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger function to automatically update stats when orders change
CREATE OR REPLACE FUNCTION trigger_update_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the affected shop
  PERFORM update_comprehensive_seller_stats(COALESCE(NEW.shop_id, OLD.shop_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic stats updates
DROP TRIGGER IF EXISTS auto_update_seller_stats_orders ON orders;
CREATE TRIGGER auto_update_seller_stats_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_seller_stats();

-- 8. Initialize stats for existing shops
DO $$
DECLARE
  shop_record RECORD;
BEGIN
  FOR shop_record IN SELECT id FROM shops
  LOOP
    PERFORM update_comprehensive_seller_stats(shop_record.id);
  END LOOP;
END $$;

-- 9. Add price column to order_items if it doesn't exist (for backwards compatibility)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS price NUMERIC;

-- Update price column where missing
UPDATE order_items 
SET price = unit_price 
WHERE price IS NULL;

COMMENT ON TABLE customer_messages IS 'Messages between customers and shop owners for response rate analytics';
COMMENT ON TABLE product_categories IS 'Product categories for analytics and organization';
COMMENT ON FUNCTION update_comprehensive_seller_stats IS 'Updates comprehensive seller statistics for analytics dashboard'; 