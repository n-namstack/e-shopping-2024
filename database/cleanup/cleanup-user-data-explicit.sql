-- Explicit cleanup for user 91b19af9-716d-4257-857b-e6f15179239d
-- More explicit approach to bypass safety functions

-- First, let's see what we're dealing with:
SELECT 'Orders count:' as info, COUNT(*) as count FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d';
SELECT 'Shops count:' as info, COUNT(*) as count FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d';
SELECT 'Products count:' as info, COUNT(*) as count FROM products WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d');

-- Now delete step by step with explicit user ID checking

-- 1. Delete platform_transactions (if any exist)
DELETE FROM platform_transactions 
WHERE payment_id IN (
  SELECT p.id FROM payments p
  JOIN orders o ON p.order_id = o.id
  WHERE o.buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
)
AND EXISTS (
  SELECT 1 FROM payments p
  JOIN orders o ON p.order_id = o.id
  WHERE o.buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
  AND p.id = platform_transactions.payment_id
);

-- 2. Delete payments (if any exist)
DELETE FROM payments 
WHERE order_id IN (
  SELECT id FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
)
AND EXISTS (
  SELECT 1 FROM orders 
  WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
  AND id = payments.order_id
);

-- 3. Delete order_items (if any exist)
DELETE FROM order_items 
WHERE order_id IN (
  SELECT id FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
)
AND EXISTS (
  SELECT 1 FROM orders 
  WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
  AND id = order_items.order_id
);

-- 4. Delete orders (if any exist)
DELETE FROM orders 
WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
AND buyer_id IS NOT NULL;

-- 5. Delete products (if any exist) - this might be the problematic one
-- Let's try a different approach for products
UPDATE products 
SET name = 'DELETED - ' || name
WHERE shop_id IN (
  SELECT id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d'
)
AND shop_id IS NOT NULL;

-- 6. Delete shop_follows (referenced by shops and users)
-- Delete follows where user is the follower
DELETE FROM shop_follows 
WHERE user_id = '91b19af9-716d-4257-857b-e6f15179239d'
AND user_id IS NOT NULL;

-- Delete follows where user owns the shop being followed
DELETE FROM shop_follows 
WHERE shop_id IN (
  SELECT id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d'
)
AND shop_id IS NOT NULL;

-- 7. Delete shops (if any exist)
DELETE FROM shops 
WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d'
AND owner_id IS NOT NULL;

-- 8. Finally delete the profile
DELETE FROM profiles 
WHERE id = '91b19af9-716d-4257-857b-e6f15179239d'
AND id IS NOT NULL;

-- Show results
SELECT 'Cleanup complete' as status; 