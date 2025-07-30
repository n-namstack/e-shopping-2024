-- Migration to add runner_fee and transport_fee columns to order_items table

-- Check if runner_fee column exists in order_items table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'runner_fee'
    ) THEN
        ALTER TABLE order_items ADD COLUMN runner_fee NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Check if transport_fee column exists in order_items table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'transport_fee'
    ) THEN
        ALTER TABLE order_items ADD COLUMN transport_fee NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Check if runner_fees_total column exists in orders table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'runner_fees_total'
    ) THEN
        ALTER TABLE orders ADD COLUMN runner_fees_total NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Check if transport_fees_total column exists in orders table, add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'transport_fees_total'
    ) THEN
        ALTER TABLE orders ADD COLUMN transport_fees_total NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Add transport_fees_paid flag to orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'transport_fees_paid'
    ) THEN
        ALTER TABLE orders ADD COLUMN transport_fees_paid BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Add has_on_order_items flag to orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'has_on_order_items'
    ) THEN
        ALTER TABLE orders ADD COLUMN has_on_order_items BOOLEAN DEFAULT FALSE;
    END IF;
END
$$; 