-- Add sales columns to products table
ALTER TABLE products ADD COLUMN is_on_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN discount_percentage DECIMAL(5, 2);
ALTER TABLE products ADD COLUMN original_price DECIMAL(10, 2);

-- Add comment to explain the schema change
COMMENT ON COLUMN products.is_on_sale IS 'Indicates if the product is currently on sale';
COMMENT ON COLUMN products.discount_percentage IS 'Percentage discount for products on sale (e.g., 10.00 means 10%)';
COMMENT ON COLUMN products.original_price IS 'Original price before the discount';
