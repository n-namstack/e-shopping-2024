-- Debug script to check payment status issues
-- Run this in Supabase SQL Editor

-- 1. Check if payment_status column exists and its constraints
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'payment_status';

-- 2. Check payment status constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'orders_payment_status_check';

-- 3. Check recent orders and their payment status
SELECT 
    id,
    payment_status,
    payment_proof_url,
    payment_proof_uploaded_at,
    created_at,
    payment_method
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Test if we can manually update an order's payment status
-- (Don't run this unless you want to test - replace with actual order ID)
-- UPDATE orders 
-- SET payment_status = 'proof_submitted' 
-- WHERE id = 'your-order-id-here';

-- 5. Check if there are any RLS policies that might be blocking updates
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