-- Database Cleanup Script for Duplicate Profiles and Orphaned Data
-- Run this to fix the issues with duplicate profiles and data integrity

-- 1. Check for duplicate profiles by email
SELECT email, COUNT(*) as count 
FROM profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 2. Check for profiles without corresponding auth users
SELECT p.id, p.email 
FROM profiles p 
LEFT JOIN auth.users u ON p.id = u.id 
WHERE u.id IS NULL;

-- 3. Check for auth users without profiles
SELECT u.id, u.email 
FROM auth.users u 
LEFT JOIN profiles p ON u.id = p.id 
WHERE p.id IS NULL;

-- 4. Clean up duplicate profiles (keep the one with the most recent created_at)
WITH duplicates AS (
  SELECT id, email, 
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM profiles
)
DELETE FROM profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 5. Create missing profiles for auth users that don't have them
INSERT INTO profiles (id, email, firstname, lastname, username, cellphone_no, role, is_verified, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'firstname', ''),
  COALESCE(u.raw_user_meta_data->>'lastname', ''),
  COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'cellphone_no', ''),
  COALESCE(u.raw_user_meta_data->>'role', 'buyer'),
  CASE WHEN COALESCE(u.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN TRUE ELSE FALSE END,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 6. Update the trigger function to handle potential duplicates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if profile doesn't already exist
  INSERT INTO public.profiles (id, email, role, firstname, lastname, username, cellphone_no, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'cellphone_no', ''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (id) DO UPDATE SET
    firstname = COALESCE(EXCLUDED.firstname, profiles.firstname),
    lastname = COALESCE(EXCLUDED.lastname, profiles.lastname),
    username = COALESCE(EXCLUDED.username, profiles.username),
    cellphone_no = COALESCE(EXCLUDED.cellphone_no, profiles.cellphone_no),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add unique constraint on email if it doesn't exist (this might fail if duplicates exist)
-- Run the cleanup above first, then run this:
-- ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- 8. Check the results
SELECT 'Profiles count' as check_type, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Auth users count' as check_type, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles without auth' as check_type, COUNT(*) as count FROM profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE u.id IS NULL
UNION ALL
SELECT 'Auth without profiles' as check_type, COUNT(*) as count FROM auth.users u LEFT JOIN profiles p ON u.id = p.id WHERE p.id IS NULL; 