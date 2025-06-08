-- Fix RLS policies for payment tables
-- Run this in your Supabase SQL editor

-- Allow system to insert payment records (buyers and shop owners can create payments)
CREATE POLICY "Allow payment record creation" ON payments
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR 
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = payments.shop_id)
  );

-- Allow shop owners to create payout requests
CREATE POLICY "Shop owners can create payouts" ON seller_payouts
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = seller_payouts.shop_id)
  );

-- Allow system to create platform transaction records
CREATE POLICY "Allow platform transaction creation" ON platform_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin') OR
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = platform_transactions.shop_id) OR
    auth.uid() IN (SELECT buyer_id FROM orders WHERE id = platform_transactions.order_id)
  ); 