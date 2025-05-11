-- Remove runner_fee and transport_fee columns and add delivery_fee column
ALTER TABLE products 
  DROP COLUMN IF EXISTS runner_fee,
  DROP COLUMN IF EXISTS transport_fee,
  ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 0.00;

-- Add comment to explain the schema change
COMMENT ON COLUMN products.delivery_fee IS 'Single delivery fee for the product replacing separate runner and transport fees';

-- If we need to update any existing records (optional)
-- UPDATE products SET delivery_fee = COALESCE(runner_fee, 0) + COALESCE(transport_fee, 0) WHERE is_on_order = true;
