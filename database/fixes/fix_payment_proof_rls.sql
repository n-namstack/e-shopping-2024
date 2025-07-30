-- Fix RLS policy to allow buyers to update payment proof fields
-- Run this in Supabase SQL Editor

-- Add RLS policy to allow buyers to update payment proof fields on their own orders
CREATE POLICY "Buyers can update payment proof" ON orders
FOR UPDATE USING (
    auth.uid() = buyer_id
) WITH CHECK (
    auth.uid() = buyer_id
);

-- Verify the new policy was created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'orders' 
AND cmd = 'UPDATE'; 