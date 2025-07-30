-- Quick setup script - Run this in Supabase SQL Editor NOW
-- This will make the checkout work immediately

-- 1. Add payment proof columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMP WITH TIME ZONE;

-- 2. Fix RLS policies for payment tables (simple version)
DROP POLICY IF EXISTS "Allow payment record creation" ON payments;
DROP POLICY IF EXISTS "Allow platform transaction creation" ON platform_transactions;

CREATE POLICY "Allow authenticated payment creation" ON payments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated platform transactions" ON platform_transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Update payments table to allow 'pending' status if needed
-- Check what status values are allowed and add 'pending' if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'payments_status_check' 
        AND check_clause LIKE '%pending%'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
        ALTER TABLE payments ADD CONSTRAINT payments_status_check 
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
    END IF;
END $$; 