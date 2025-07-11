-- Create a hybrid account deletion function (anonymize instead of delete)
-- This approach follows industry standards like Instagram, Amazon, etc.

CREATE OR REPLACE FUNCTION anonymize_user_account()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  anonymized_email TEXT;
  anonymized_name TEXT;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Create anonymized identifiers
  anonymized_email := 'deleted_user_' || substring(current_user_id::text, 1, 8) || '@deleted.local';
  anonymized_name := 'Deleted User';

  -- 1. Anonymize profile (keep record but remove personal info)
  UPDATE profiles SET
    firstname = 'Deleted',
    lastname = 'User',
    email = anonymized_email
  WHERE id = current_user_id;

  -- 2. Anonymize shops (keep for business continuity but remove personal info)
  UPDATE shops SET
    name = 'Shop by Deleted User'
  WHERE owner_id = current_user_id;

  -- 3. Keep products active but mark as from deleted seller
  -- This preserves order history and reviews for other users
  UPDATE products SET
    description = COALESCE(description, '') || ' (Original seller account deleted)'
  WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = current_user_id);

  -- 4. Anonymize reviews but keep them (important for other users)
  UPDATE product_reviews SET
    comment = '[Review from deleted user]'
  WHERE buyer_id = current_user_id;

  UPDATE shop_reviews SET
    comment = '[Review from deleted user]'
  WHERE buyer_id = current_user_id;

  -- 5. Delete personal messages (these are private)
  DELETE FROM private_messages 
  WHERE sender_id = current_user_id OR recipient_id = current_user_id;

  -- 6. Delete personal data that's not needed for business
  DELETE FROM product_comments WHERE user_id = current_user_id;
  DELETE FROM order_comments WHERE user_id = current_user_id;
  DELETE FROM wishlist WHERE user_id = current_user_id;
  DELETE FROM notifications WHERE user_id = current_user_id;
  DELETE FROM product_views WHERE user_id = current_user_id;
  DELETE FROM shop_followers WHERE user_id = current_user_id;

  -- 7. Keep orders and order_items (critical for business records and other users)
  -- These contain transaction history needed for:
  -- - Tax records
  -- - Dispute resolution  
  -- - Buyer order tracking
  -- - Legal compliance
  -- Orders remain unchanged for business continuity

  -- 8. Delete verification documents (personal data)
  DELETE FROM seller_verifications WHERE user_id = current_user_id;

  -- 9. Update seller stats to reflect deleted status (skip if table doesn't exist)
  -- This is optional - removing this section to avoid column errors

  -- 10. Delete conversations
  DELETE FROM conversations 
  WHERE participant1_id = current_user_id OR participant2_id = current_user_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Account successfully anonymized',
    'details', 'Personal information removed while preserving business records'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to call this function
GRANT EXECUTE ON FUNCTION anonymize_user_account() TO authenticated;

-- Also create a complete deletion function for cases where it's really needed
CREATE OR REPLACE FUNCTION completely_delete_user_account()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  shop_ids UUID[];
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user's shop IDs
  SELECT ARRAY_AGG(id) INTO shop_ids FROM shops WHERE owner_id = current_user_id;
  
  -- Complete deletion (use only if really necessary)
  
  -- Delete in proper order
  IF shop_ids IS NOT NULL THEN
    DELETE FROM shop_followers WHERE user_id = current_user_id OR shop_id = ANY(shop_ids);
    DELETE FROM products WHERE shop_id = ANY(shop_ids);
    DELETE FROM seller_stats WHERE shop_id = ANY(shop_ids);
  ELSE
    DELETE FROM shop_followers WHERE user_id = current_user_id;
  END IF;

  DELETE FROM product_reviews WHERE buyer_id = current_user_id;
  DELETE FROM shop_reviews WHERE buyer_id = current_user_id;
  DELETE FROM private_messages WHERE sender_id = current_user_id OR recipient_id = current_user_id;
  DELETE FROM product_comments WHERE user_id = current_user_id;
  DELETE FROM order_comments WHERE user_id = current_user_id;
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE buyer_id = current_user_id);
  DELETE FROM orders WHERE buyer_id = current_user_id;
  DELETE FROM shops WHERE owner_id = current_user_id;
  DELETE FROM wishlist WHERE user_id = current_user_id;
  DELETE FROM notifications WHERE user_id = current_user_id;
  DELETE FROM product_views WHERE user_id = current_user_id;
  DELETE FROM seller_verifications WHERE user_id = current_user_id;
  DELETE FROM conversations WHERE participant1_id = current_user_id OR participant2_id = current_user_id;
  DELETE FROM profiles WHERE id = current_user_id;

  RETURN json_build_object('success', true, 'message', 'Account completely deleted');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission (but this should be used sparingly)
GRANT EXECUTE ON FUNCTION completely_delete_user_account() TO authenticated; 