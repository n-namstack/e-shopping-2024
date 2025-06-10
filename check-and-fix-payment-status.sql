-- Check and fix payment status for orders
-- Run this in your Supabase SQL editor to diagnose and fix payment status issues

-- 1. First, let's see what payment statuses we currently have
SELECT 
  payment_status, 
  COUNT(*) as count,
  status as order_status
FROM orders 
GROUP BY payment_status, status
ORDER BY payment_status, status;

-- 2. Check specific orders to see their current status
SELECT 
  id,
  SUBSTRING(id::text, 1, 8) as short_id,
  status as order_status,
  payment_status,
  payment_method,
  payment_timing,
  total_amount,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Update orders that should be marked as paid
-- (Orders that are delivered/completed but still show as unpaid/pending)
UPDATE orders 
SET payment_status = 'paid'
WHERE status IN ('delivered', 'completed') 
  AND payment_status IN ('unpaid', 'pending')
  AND payment_method != 'pay_later';

-- 4. Ensure pay_later orders have deferred status
UPDATE orders 
SET payment_status = 'deferred'
WHERE payment_method = 'pay_later' 
  AND payment_status != 'deferred';

-- 5. Set default payment_timing for existing orders
UPDATE orders 
SET payment_timing = 'now'
WHERE payment_timing IS NULL 
  AND payment_method != 'pay_later';

UPDATE orders 
SET payment_timing = 'later'
WHERE payment_method = 'pay_later' 
  AND payment_timing IS NULL;

-- 6. Check results after update
SELECT 
  payment_status, 
  payment_timing,
  COUNT(*) as count
FROM orders 
GROUP BY payment_status, payment_timing
ORDER BY payment_status, payment_timing;

-- 7. Show recent orders with their updated statuses
SELECT 
  SUBSTRING(id::text, 1, 8) as order_id,
  status as order_status,
  payment_status,
  payment_method,
  payment_timing,
  total_amount,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10; 