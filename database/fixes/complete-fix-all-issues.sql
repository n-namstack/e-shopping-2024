-- COMPLETE FIX FOR ALL ISSUES
-- This script fixes duplicate profiles, adds dual roles support, and creates necessary functions

-- ========== STEP 1: FIX DUPLICATE PROFILES ==========

-- 1. Check for duplicate profiles by email
SELECT 'Duplicate profiles by email:' as check_type;
SELECT email, COUNT(*) as count 
FROM profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 2. Clean up duplicate profiles (keep the one with the most recent created_at)
WITH duplicates AS (
  SELECT id, email, 
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM profiles
)
DELETE FROM profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 3. Create missing profiles for auth users that don't have them
INSERT INTO profiles (id, email, firstname, lastname, username, cellphone_no, role, is_verified, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'firstname', SPLIT_PART(COALESCE(u.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
  COALESCE(u.raw_user_meta_data->>'lastname', SPLIT_PART(COALESCE(u.raw_user_meta_data->>'full_name', ''), ' ', 2), ''),
  COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'cellphone_no', ''),
  COALESCE(u.raw_user_meta_data->>'role', 'buyer'),
  CASE WHEN COALESCE(u.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN TRUE ELSE FALSE END,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- ========== STEP 2: ADD DUAL ROLES SUPPORT ==========

-- Add new columns for dual roles support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_roles JSONB DEFAULT '["buyer"]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_since TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS buyer_since TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing profiles to set available_roles based on current role
UPDATE profiles 
SET available_roles = CASE 
  WHEN role = 'seller' THEN '["buyer", "seller"]'
  ELSE '["buyer"]'
END
WHERE available_roles IS NULL OR available_roles = '["buyer"]';

-- Update seller_since for existing sellers
UPDATE profiles 
SET seller_since = created_at 
WHERE role = 'seller' AND seller_since IS NULL;

-- Update buyer_since for all profiles if not set
UPDATE profiles 
SET buyer_since = created_at 
WHERE buyer_since IS NULL;

-- ========== STEP 3: CREATE DUAL ROLES FUNCTIONS ==========

-- Create a function to add a new role to user's available roles
CREATE OR REPLACE FUNCTION add_user_role(user_id UUID, new_role TEXT)
RETURNS JSONB AS $$
DECLARE
  current_roles JSONB;
  updated_roles JSONB;
BEGIN
  -- Get current available roles
  SELECT available_roles INTO current_roles 
  FROM profiles 
  WHERE id = user_id;
  
  -- If role doesn't exist, add it
  IF NOT (current_roles ? new_role) THEN
    updated_roles = current_roles || jsonb_build_array(new_role);
    
    -- Update the profile
    UPDATE profiles 
    SET 
      available_roles = updated_roles,
      seller_since = CASE 
        WHEN new_role = 'seller' THEN NOW() 
        ELSE seller_since 
      END
    WHERE id = user_id;
    
    RETURN updated_roles;
  END IF;
  
  RETURN current_roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to switch user's active role
CREATE OR REPLACE FUNCTION switch_user_role(user_id UUID, target_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_roles JSONB;
BEGIN
  -- Get current available roles
  SELECT available_roles INTO current_roles 
  FROM profiles 
  WHERE id = user_id;
  
  -- Check if user has this role available
  IF current_roles ? target_role THEN
    -- Update active role
    UPDATE profiles 
    SET role = target_role
    WHERE id = user_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION switch_user_role(UUID, TEXT) TO authenticated;

-- ========== STEP 4: UPDATE TRIGGER FUNCTION ==========

-- Update the trigger function to handle dual roles and prevent duplicates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if profile doesn't already exist
  INSERT INTO public.profiles (id, email, role, firstname, lastname, username, cellphone_no, is_verified, available_roles, buyer_since, seller_since)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'firstname', SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
    COALESCE(NEW.raw_user_meta_data->>'lastname', SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2), ''),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'cellphone_no', ''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN TRUE ELSE FALSE END,
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'seller' THEN '["buyer", "seller"]' ELSE '["buyer"]' END,
    NOW(),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'seller' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    firstname = COALESCE(EXCLUDED.firstname, profiles.firstname),
    lastname = COALESCE(EXCLUDED.lastname, profiles.lastname),
    username = COALESCE(EXCLUDED.username, profiles.username),
    cellphone_no = COALESCE(EXCLUDED.cellphone_no, profiles.cellphone_no),
    role = COALESCE(EXCLUDED.role, profiles.role),
    available_roles = COALESCE(EXCLUDED.available_roles, profiles.available_roles),
    seller_since = COALESCE(EXCLUDED.seller_since, profiles.seller_since),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== STEP 5: VERIFY RESULTS ==========

-- Check final counts and status
SELECT 'FINAL VERIFICATION:' as status;

SELECT 'Profiles count' as metric, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Auth users count' as metric, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles without auth' as metric, COUNT(*) as count FROM profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE u.id IS NULL
UNION ALL
SELECT 'Auth without profiles' as metric, COUNT(*) as count FROM auth.users u LEFT JOIN profiles p ON u.id = p.id WHERE p.id IS NULL
UNION ALL
SELECT 'Sellers count' as metric, COUNT(*) as count FROM profiles WHERE role = 'seller'
UNION ALL
SELECT 'Buyers count' as metric, COUNT(*) as count FROM profiles WHERE role = 'buyer'
UNION ALL
SELECT 'Dual role users' as metric, COUNT(*) as count FROM profiles WHERE available_roles ? 'seller' AND available_roles ? 'buyer';

-- Check if functions exist
SELECT 'Functions created:' as status;
SELECT proname as function_name 
FROM pg_proc 
WHERE proname IN ('add_user_role', 'switch_user_role');

-- Test the functions (this should work if everything is set up correctly)
SELECT 'Functions test:' as status;
SELECT 'add_user_role exists' as test, 
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_role') THEN 'PASS' ELSE 'FAIL' END as result
UNION ALL
SELECT 'switch_user_role exists' as test,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'switch_user_role') THEN 'PASS' ELSE 'FAIL' END as result; 