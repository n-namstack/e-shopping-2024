-- Quick fix for the specific user having profile issues
-- Run this in Supabase SQL Editor

-- Step 1: Check if the user exists in auth.users but not in profiles
DO $$
DECLARE
    user_in_auth BOOLEAN;
    user_in_profiles BOOLEAN;
    user_email TEXT;
BEGIN
    -- Check if user exists in auth.users
    SELECT EXISTS(
        SELECT 1 FROM auth.users 
        WHERE id = 'f01424a2-8e44-46f2-bf2b-cada187e776c'
    ) INTO user_in_auth;
    
    -- Check if user exists in profiles
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = 'f01424a2-8e44-46f2-bf2b-cada187e776c'
    ) INTO user_in_profiles;
    
    -- Get email for the user
    SELECT email INTO user_email
    FROM auth.users 
    WHERE id = 'f01424a2-8e44-46f2-bf2b-cada187e776c';
    
    RAISE NOTICE 'User in auth.users: %', user_in_auth;
    RAISE NOTICE 'User in profiles: %', user_in_profiles;
    RAISE NOTICE 'User email: %', user_email;
    
    -- If user exists in auth but not in profiles, create the profile
    IF user_in_auth AND NOT user_in_profiles THEN
        RAISE NOTICE 'Creating missing profile for user...';
        
        INSERT INTO profiles (
            id,
            firstname,
            lastname, 
            username,
            email,
            cellphone_no,
            role,
            is_verified,
            created_at
        )
        SELECT 
            au.id,
            COALESCE(au.raw_user_meta_data->>'firstname', 'User') as firstname,
            COALESCE(au.raw_user_meta_data->>'lastname', 'User') as lastname,
            COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) as username,
            au.email,
            COALESCE(au.raw_user_meta_data->>'cellphone_no', '0000000000') as cellphone_no,
            'buyer' as role,
            true as is_verified,
            au.created_at
        FROM auth.users au
        WHERE au.id = 'f01424a2-8e44-46f2-bf2b-cada187e776c';
        
        RAISE NOTICE 'Profile created successfully!';
    ELSE
        RAISE NOTICE 'Profile already exists or user not found in auth';
    END IF;
END
$$;

-- Step 2: Verify the profile was created
SELECT 
    id,
    firstname,
    lastname,
    email,
    role,
    is_verified
FROM profiles 
WHERE id = 'f01424a2-8e44-46f2-bf2b-cada187e776c';

-- Step 3: Clean up any orphaned product_views for this user
DELETE FROM product_views 
WHERE user_id = 'f01424a2-8e44-46f2-bf2b-cada187e776c'
AND user_id NOT IN (SELECT id FROM profiles);

-- Step 4: Final confirmation
DO $$
BEGIN
    RAISE NOTICE 'Database fix completed! The product view error should be resolved.';
END
$$; 