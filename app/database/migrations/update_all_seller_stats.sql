-- Script to update statistics for all existing shops
DO $$
DECLARE
  shop_record RECORD;
BEGIN
  -- Loop through all shops
  FOR shop_record IN SELECT id FROM shops ORDER BY id
  LOOP
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
      WHERE o.shop_id = shop_record.id
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
      WHERE o.shop_id = shop_record.id
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
      WHERE o.shop_id = shop_record.id AND p.category IS NOT NULL
      GROUP BY p.category
      ORDER BY total_sales DESC
      LIMIT 1
    ),
    product_count AS (
      SELECT 
        COUNT(id) AS total_products
      FROM products
      WHERE shop_id = shop_record.id
    ),
    ratings AS (
      SELECT 
        AVG(rating) AS average_rating
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE p.shop_id = shop_record.id
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
      COALESCE(shop_stats.shop_id, shop_record.id),
      COALESCE(shop_stats.total_revenue, 0),
      COALESCE(shop_stats.total_orders, 0),
      COALESCE(shop_stats.completed_orders, 0),
      COALESCE(shop_stats.canceled_orders, 0),
      COALESCE(shop_stats.pending_orders, 0),
      COALESCE(shop_stats.processing_orders, 0),
      COALESCE(product_count.total_products, 0),
      COALESCE(shop_stats.average_order_value, 0),
      COALESCE(shop_stats.total_customers, 0),
      product_stats.product_id,
      product_stats.product_name,
      COALESCE(product_stats.total_sales, 0),
      category_stats.category,
      COALESCE(category_stats.total_sales, 0),
      COALESCE(ratings.average_rating, 0),
      NOW(),
      COALESCE((SELECT created_at FROM seller_stats WHERE shop_id = shop_record.id), NOW())
    FROM (SELECT shop_record.id) s
    LEFT JOIN shop_stats ON shop_stats.shop_id = shop_record.id
    LEFT JOIN product_count ON true
    LEFT JOIN product_stats ON true
    LEFT JOIN category_stats ON true
    LEFT JOIN ratings ON true
    
    ON CONFLICT (shop_id) 
    DO UPDATE SET
      total_revenue = COALESCE(EXCLUDED.total_revenue, 0),
      total_orders = COALESCE(EXCLUDED.total_orders, 0),
      completed_orders = COALESCE(EXCLUDED.completed_orders, 0),
      canceled_orders = COALESCE(EXCLUDED.canceled_orders, 0),
      pending_orders = COALESCE(EXCLUDED.pending_orders, 0),
      processing_orders = COALESCE(EXCLUDED.processing_orders, 0),
      total_products = COALESCE(EXCLUDED.total_products, 0),
      average_order_value = COALESCE(EXCLUDED.average_order_value, 0),
      total_customers = COALESCE(EXCLUDED.total_customers, 0),
      top_product_id = EXCLUDED.top_product_id,
      top_product_name = EXCLUDED.top_product_name,
      top_product_sales = COALESCE(EXCLUDED.top_product_sales, 0),
      top_category = EXCLUDED.top_category,
      top_category_sales = COALESCE(EXCLUDED.top_category_sales, 0),
      average_rating = COALESCE(EXCLUDED.average_rating, 0),
      last_updated = NOW();
      
  END LOOP;
  
  RAISE NOTICE 'Statistics updated for all shops';
END;
$$ LANGUAGE plpgsql; 