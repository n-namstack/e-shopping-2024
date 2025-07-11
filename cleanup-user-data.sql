-- Clean up all data for user 91b19af9-716d-4257-857b-e6f15179239d
-- Run this before manually deleting the Auth user

-- Get shop IDs for this user
WITH user_shops AS (
  SELECT id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d'
)

-- Delete in proper order to avoid foreign key constraint errors

-- 1. Delete shop followers
DELETE FROM shop_followers 
WHERE user_id = '91b19af9-716d-4257-857b-e6f15179239d'
   OR shop_id IN (SELECT id FROM user_shops);

-- 2. Delete from other tables that might reference this user
DELETE FROM notifications WHERE user_id = '91b19af9-716d-4257-857b-e6f15179239d';
DELETE FROM wishlist WHERE user_id = '91b19af9-716d-4257-857b-e6f15179239d';
DELETE FROM product_views WHERE user_id = '91b19af9-716d-4257-857b-e6f15179239d';

-- 3. Delete orders (if any)
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'
);
DELETE FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d';

-- 4. Delete products and seller stats
DELETE FROM products WHERE shop_id IN (
  SELECT id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d'
);
DELETE FROM seller_stats WHERE shop_id IN (
  SELECT id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d'
);

-- 5. Delete shops
DELETE FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d';

-- 6. Finally delete the profile
DELETE FROM profiles WHERE id = '91b19af9-716d-4257-857b-e6f15179239d';

-- After running this, you should be able to delete the Auth user manually 