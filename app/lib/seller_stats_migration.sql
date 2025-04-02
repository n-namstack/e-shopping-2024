-- Create seller_stats table to track revenue and other metrics
CREATE TABLE IF NOT EXISTS seller_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  total_revenue NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to initialize seller_stats when a new shop is created
CREATE OR REPLACE FUNCTION initialize_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO seller_stats (shop_id, total_revenue, total_orders, completed_orders, total_products)
  VALUES (NEW.id, 0, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize seller_stats when a new shop is created
DROP TRIGGER IF EXISTS create_seller_stats ON shops;
CREATE TRIGGER create_seller_stats
AFTER INSERT ON shops
FOR EACH ROW
EXECUTE PROCEDURE initialize_seller_stats();

-- Create a function to update seller_stats when an order's payment_status changes to 'paid'
CREATE OR REPLACE FUNCTION update_seller_stats_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_status is changed to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Update the seller_stats table
    UPDATE seller_stats
    SET 
      total_revenue = total_revenue + NEW.total_amount,
      total_orders = total_orders + 1,
      last_updated = NOW()
    WHERE shop_id = NEW.shop_id;
  END IF;
  
  -- If order status is changed to 'delivered' or 'completed'
  IF (NEW.status = 'delivered' OR NEW.status = 'completed') AND 
     (OLD.status != 'delivered' AND OLD.status != 'completed') THEN
    -- Update completed orders count
    UPDATE seller_stats
    SET 
      completed_orders = completed_orders + 1,
      last_updated = NOW()
    WHERE shop_id = NEW.shop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update seller_stats when an order is updated
DROP TRIGGER IF EXISTS update_stats_on_order_update ON orders;
CREATE TRIGGER update_stats_on_order_update
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE update_seller_stats_on_payment();

-- Create a function to update seller_stats when a product is added or removed
CREATE OR REPLACE FUNCTION update_seller_stats_products()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Product added
    UPDATE seller_stats
    SET 
      total_products = total_products + 1,
      last_updated = NOW()
    WHERE shop_id = NEW.shop_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Product removed
    UPDATE seller_stats
    SET 
      total_products = total_products - 1,
      last_updated = NOW()
    WHERE shop_id = OLD.shop_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update seller_stats when products are added or deleted
DROP TRIGGER IF EXISTS update_stats_on_product_insert ON products;
CREATE TRIGGER update_stats_on_product_insert
AFTER INSERT ON products
FOR EACH ROW
EXECUTE PROCEDURE update_seller_stats_products();

DROP TRIGGER IF EXISTS update_stats_on_product_delete ON products;
CREATE TRIGGER update_stats_on_product_delete
AFTER DELETE ON products
FOR EACH ROW
EXECUTE PROCEDURE update_seller_stats_products();

-- Initialize seller_stats for existing shops
INSERT INTO seller_stats (shop_id, total_revenue, total_orders, completed_orders, total_products)
SELECT 
  s.id, 
  0, 
  COUNT(DISTINCT o.id), 
  COUNT(DISTINCT CASE WHEN o.status IN ('delivered', 'completed') THEN o.id END),
  COUNT(DISTINCT p.id)
FROM shops s
LEFT JOIN orders o ON s.id = o.shop_id
LEFT JOIN products p ON s.id = p.shop_id
WHERE NOT EXISTS (SELECT 1 FROM seller_stats ss WHERE ss.shop_id = s.id)
GROUP BY s.id;

-- Update total_revenue for existing shops from paid orders
WITH paid_revenue AS (
  SELECT 
    shop_id, 
    SUM(total_amount) as revenue
  FROM orders
  WHERE payment_status = 'paid'
  GROUP BY shop_id
)
UPDATE seller_stats ss
SET total_revenue = pr.revenue
FROM paid_revenue pr
WHERE ss.shop_id = pr.shop_id AND pr.revenue > 0; 