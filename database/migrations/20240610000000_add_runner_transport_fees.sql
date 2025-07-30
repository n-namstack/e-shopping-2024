-- Migration to add runner_fee and transport_fee columns to products table for on-order products

-- Check if runner_fee column exists in products table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'runner_fee'
    ) THEN
        ALTER TABLE products ADD COLUMN runner_fee NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Check if transport_fee column exists in products table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'transport_fee'
    ) THEN
        ALTER TABLE products ADD COLUMN transport_fee NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Add lead_time_days column if it doesn't exist (this is already referenced but might not be in the schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'lead_time_days'
    ) THEN
        ALTER TABLE products ADD COLUMN lead_time_days INTEGER;
    END IF;
END
$$;

-- Add a function to ensure on-order products have appropriate fee fields populated
CREATE OR REPLACE FUNCTION validate_on_order_products()
RETURNS TRIGGER AS $$
BEGIN
    -- If the product is marked as on-order
    IF NEW.is_on_order = TRUE THEN
        -- Ensure it has either runner_fee or lead_time_days set
        IF NEW.runner_fee IS NULL AND NEW.lead_time_days IS NULL THEN
            RAISE EXCEPTION 'On-order products must have either runner_fee or lead_time_days set';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_on_order_products_trigger ON products;

-- Create trigger to validate on-order products
CREATE TRIGGER validate_on_order_products_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE validate_on_order_products(); 