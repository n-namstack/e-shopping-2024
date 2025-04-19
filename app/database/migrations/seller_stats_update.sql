-- Update seller_stats table to include all necessary data for analytics
ALTER TABLE seller_stats
ADD COLUMN IF NOT EXISTS pending_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_order_value DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_customers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_product_id UUID,
ADD COLUMN IF NOT EXISTS top_product_name TEXT,
ADD COLUMN IF NOT EXISTS top_product_sales DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS top_category TEXT,
ADD COLUMN IF NOT EXISTS top_category_sales DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS monthly_growth_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0.00;

-- Create trigger function to automatically update seller_stats when orders change
CREATE OR REPLACE FUNCTION update_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate stats for the shop
  WITH shop_stats AS (
    SELECT
      o.shop_id,
      SUM(o.total_amount) AS total_revenue,
      COUNT(o.id) AS total_orders,
      COUNT(CASE WHEN o.status = 'delivered' OR o.status = 'completed' THEN 1 END) AS completed_orders,
      COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) AS canceled_orders,
      COUNT(CASE WHEN o.status = 'pending' THEN 1 END) AS pending_orders,
      COUNT(CASE WHEN o.status = 'processing' THEN 1 END) AS processing_orders,
      COUNT(DISTINCT o.user_id) AS total_customers,
      CASE 
        WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount) / COUNT(o.id), 0)
        ELSE 0
      END AS average_order_value
    FROM orders o
    WHERE o.shop_id = COALESCE(NEW.shop_id, OLD.shop_id)
    GROUP BY o.shop_id
  ),
  product_stats AS (
    SELECT 
      p.id AS product_id,
      p.name AS product_name,
      SUM(oi.quantity * oi.unit_price) AS total_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.shop_id = COALESCE(NEW.shop_id, OLD.shop_id)
    GROUP BY p.id, p.name
    ORDER BY total_sales DESC
    LIMIT 1
  ),
  category_stats AS (
    SELECT 
      p.category,
      SUM(oi.quantity * oi.unit_price) AS total_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.shop_id = COALESCE(NEW.shop_id, OLD.shop_id) AND p.category IS NOT NULL
    GROUP BY p.category
    ORDER BY total_sales DESC
    LIMIT 1
  ),
  product_count AS (
    SELECT 
      COUNT(id) AS total_products
    FROM products
    WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id)
  ),
  ratings AS (
    SELECT 
      AVG(rating) AS average_rating
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    WHERE p.shop_id = COALESCE(NEW.shop_id, OLD.shop_id)
  )
  
  -- Insert or update the seller_stats record
  INSERT INTO seller_stats (
    shop_id, 
    total_revenue, 
    total_orders, 
    completed_orders, 
    canceled_orders, 
    pending_orders,
    processing_orders,
    total_products,
    average_order_value,
    total_customers,
    top_product_id,
    top_product_name,
    top_product_sales,
    top_category,
    top_category_sales,
    average_rating,
    last_updated,
    created_at
  )
  SELECT
    shop_stats.shop_id,
    shop_stats.total_revenue,
    shop_stats.total_orders,
    shop_stats.completed_orders,
    shop_stats.canceled_orders,
    shop_stats.pending_orders,
    shop_stats.processing_orders,
    product_count.total_products,
    shop_stats.average_order_value,
    shop_stats.total_customers,
    product_stats.product_id,
    product_stats.product_name,
    product_stats.total_sales,
    category_stats.category,
    category_stats.total_sales,
    ratings.average_rating,
    NOW(),
    COALESCE((SELECT created_at FROM seller_stats WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id)), NOW())
  FROM shop_stats
  CROSS JOIN product_count
  LEFT JOIN product_stats ON true
  LEFT JOIN category_stats ON true
  LEFT JOIN ratings ON true
  
  ON CONFLICT (shop_id) 
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_orders = EXCLUDED.total_orders,
    completed_orders = EXCLUDED.completed_orders,
    canceled_orders = EXCLUDED.canceled_orders,
    pending_orders = EXCLUDED.pending_orders,
    processing_orders = EXCLUDED.processing_orders,
    total_products = EXCLUDED.total_products,
    average_order_value = EXCLUDED.average_order_value,
    total_customers = EXCLUDED.total_customers,
    top_product_id = EXCLUDED.top_product_id,
    top_product_name = EXCLUDED.top_product_name,
    top_product_sales = EXCLUDED.top_product_sales,
    top_category = EXCLUDED.top_category,
    top_category_sales = EXCLUDED.top_category_sales,
    average_rating = EXCLUDED.average_rating,
    last_updated = NOW();
    
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for order changes
DROP TRIGGER IF EXISTS order_stats_trigger ON orders;
CREATE TRIGGER order_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION update_seller_stats();

-- Create trigger for product changes
DROP TRIGGER IF EXISTS product_stats_trigger ON products;
CREATE TRIGGER product_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_seller_stats(); 