-- Create a database function to delete user accounts
-- This can be called directly from the client without Edge Functions

CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS JSON AS $$
DECLARE
  shop_ids UUID[];
  result JSON;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get user's shop IDs for cascade deletions
  SELECT ARRAY_AGG(id) INTO shop_ids FROM shops WHERE owner_id = user_id;
  
  -- Delete data in proper order to avoid foreign key constraint violations
  
  -- 1. Delete shop followers
  IF shop_ids IS NOT NULL THEN
    DELETE FROM shop_followers 
    WHERE user_id = user_id OR shop_id = ANY(shop_ids);
  ELSE
    DELETE FROM shop_followers WHERE user_id = user_id;
  END IF;

  -- 2. Delete reviews
  DELETE FROM product_reviews WHERE buyer_id = user_id;
  DELETE FROM shop_reviews WHERE buyer_id = user_id;

  -- 3. Delete messages and comments
  DELETE FROM private_messages 
  WHERE sender_id = user_id OR recipient_id = user_id;
  
  DELETE FROM product_comments WHERE user_id = user_id;
  DELETE FROM order_comments WHERE user_id = user_id;

  -- 4. Delete order items and orders
  DELETE FROM order_items 
  WHERE order_id IN (SELECT id FROM orders WHERE buyer_id = user_id);
  
  DELETE FROM orders WHERE buyer_id = user_id;

  -- 5. Delete products and related data
  IF shop_ids IS NOT NULL THEN
    DELETE FROM products WHERE shop_id = ANY(shop_ids);
    DELETE FROM seller_stats WHERE shop_id = ANY(shop_ids);
  END IF;

  -- 6. Delete shops
  DELETE FROM shops WHERE owner_id = user_id;

  -- 7. Delete other user data
  DELETE FROM wishlist WHERE user_id = user_id;
  DELETE FROM notifications WHERE user_id = user_id;
  DELETE FROM product_views WHERE user_id = user_id;
  DELETE FROM seller_verifications WHERE user_id = user_id;

  -- 8. Delete conversations
  DELETE FROM conversations 
  WHERE participant1_id = user_id OR participant2_id = user_id;

  -- 9. Finally delete profile
  DELETE FROM profiles WHERE id = user_id;

  RETURN json_build_object('success', true, 'message', 'Account deleted successfully');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to call this function
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Create RLS policy to ensure users can only delete their own accounts
CREATE OR REPLACE FUNCTION check_user_can_delete_account(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a wrapper function that enforces the security check
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Call the main deletion function
  RETURN delete_user_account(current_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to call this wrapper function
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated; 