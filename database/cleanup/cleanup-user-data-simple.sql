-- Simple cleanup for user 91b19af9-716d-4257-857b-e6f15179239d
-- Only touches core tables that definitely exist

-- 1. Delete platform_transactions first (referenced by payments)
DELETE FROM platform_transactions WHERE payment_id IN (
  SELECT p.id FROM payments p
  JOIN orders o ON p.order_id = o.id
  WHERE o.buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
);

-- 2. Delete payments (referenced by orders)
DELETE FROM payments WHERE order_id IN (
  SELECT id FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
);

-- 3. Delete order items
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
);

-- 4. Delete orders
DELETE FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d';

-- 5. Delete products owned by this user's shops
DELETE FROM products WHERE shop_id IN (
  SELECT id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d'
);

-- 6. Delete shops owned by this user
DELETE FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d';

-- 7. Finally delete the profile
DELETE FROM profiles WHERE id = '91b19af9-716d-4257-857b-e6f15179239d';

-- After running this, you should be able to delete the Auth user manually 