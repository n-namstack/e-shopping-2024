-- Super minimal account deletion function
-- Only updates profiles and shops - no other tables

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

  -- 1. Anonymize profile (only update core columns)
  UPDATE profiles SET
    firstname = 'Deleted',
    lastname = 'User',
    email = anonymized_email
  WHERE id = current_user_id;

  -- 2. Anonymize shops (only update core columns)
  UPDATE shops SET
    name = 'Shop by Deleted User'
  WHERE owner_id = current_user_id;

  -- That's it! Keep it simple and only touch tables we know exist
  -- Orders and other business data remain unchanged for business continuity

  RETURN json_build_object(
    'success', true, 
    'message', 'Account successfully anonymized',
    'details', 'Profile and shop information anonymized'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to call this function
GRANT EXECUTE ON FUNCTION anonymize_user_account() TO authenticated; 