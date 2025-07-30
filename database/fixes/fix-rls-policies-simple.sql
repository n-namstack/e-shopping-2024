-- Simple fix for RLS policies - allows all authenticated users to insert
-- Run this in your Supabase SQL editor

-- Drop existing policies if they exist (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow payment record creation" ON payments;
DROP POLICY IF EXISTS "Allow platform transaction creation" ON platform_transactions;
DROP POLICY IF EXISTS "Allow seller payout creation" ON seller_payouts;

-- Create simple policies that allow all authenticated users to insert
-- (You can make these more restrictive later)

-- Allow all authenticated users to insert payments
CREATE POLICY "Allow authenticated payment creation" ON payments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow all authenticated users to insert platform transactions  
CREATE POLICY "Allow authenticated platform transactions" ON platform_transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow all authenticated users to insert seller payouts
CREATE POLICY "Allow authenticated seller payouts" ON seller_payouts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also add UPDATE policies in case they're needed
CREATE POLICY "Allow authenticated payment updates" ON payments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated platform transaction updates" ON platform_transactions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated seller payout updates" ON seller_payouts
  FOR UPDATE USING (auth.uid() IS NOT NULL); 