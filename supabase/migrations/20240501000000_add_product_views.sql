-- Check if views_count column exists in products table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'views_count'
    ) THEN
        ALTER TABLE products ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
END
$$;

-- Create product_views table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS to product_views table
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    -- Drop all existing policies for product_views
    DROP POLICY IF EXISTS "Users can insert their own product views" ON product_views;
    DROP POLICY IF EXISTS "Users can view their own product views" ON product_views;
    DROP POLICY IF EXISTS "Shop owners can view product views for their products" ON product_views;
    DROP POLICY IF EXISTS "All authenticated users can insert product views" ON product_views;
    DROP POLICY IF EXISTS "All authenticated users can view product views" ON product_views;
END
$$;

-- Add new RLS policies for product_views
CREATE POLICY "All authenticated users can insert product views"
ON product_views FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can view product views"
ON product_views FOR SELECT
USING (auth.role() = 'authenticated');

-- Add a function to update product views count
CREATE OR REPLACE FUNCTION update_product_views_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the views_count column in the products table
  UPDATE products
  SET views_count = views_count + 1
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update product views count when a view is recorded
DROP TRIGGER IF EXISTS update_product_views_count_trigger ON product_views;
CREATE TRIGGER update_product_views_count_trigger
AFTER INSERT ON product_views
FOR EACH ROW
EXECUTE PROCEDURE update_product_views_count(); 