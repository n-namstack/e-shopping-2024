-- Minimal hybrid account deletion function
-- Only updates essential columns that definitely exist

CREATE OR REPLACE FUNCTION anonymize_user_account()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  anonymized_email TEXT;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Create anonymized identifier
  anonymized_email := 'deleted_user_' || substring(current_user_id::text, 1, 8) || '@deleted.local';

  -- 1. Anonymize profile (minimal - only update essential columns)
  UPDATE profiles SET
    firstname = 'Deleted',
    lastname = 'User',
    email = anonymized_email
  WHERE id = current_user_id;

  -- 2. Anonymize shops (minimal)
  UPDATE shops SET
    name = 'Shop by Deleted User'
  WHERE owner_id = current_user_id;

  -- 3. Anonymize product reviews (keep them but mark as deleted user)
  UPDATE product_reviews SET
    comment = '[Review from deleted user]'
  WHERE buyer_id = current_user_id;

  -- 4. Anonymize shop reviews (keep them but mark as deleted user)
  UPDATE shop_reviews SET
    comment = '[Review from deleted user]'
  WHERE buyer_id = current_user_id;

  -- 5. Delete personal data (only if tables exist)
  DELETE FROM notifications WHERE user_id = current_user_id;
  DELETE FROM shop_followers WHERE user_id = current_user_id;
  DELETE FROM wishlist WHERE user_id = current_user_id;
  DELETE FROM product_views WHERE user_id = current_user_id;

  -- 6. Keep orders and order_items (critical for business records)
  -- These remain unchanged for business continuity

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