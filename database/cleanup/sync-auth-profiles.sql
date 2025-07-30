-- Script to sync auth.users with profiles table
-- This fixes the issue where authenticated users don't have corresponding profile records

-- Step 1: Check for auth users without profiles
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL 
    AND au.email_confirmed_at IS NOT NULL; -- Only confirmed users
    
    RAISE NOTICE 'Found % authenticated users without profiles', missing_count;
    
    IF missing_count > 0 THEN
        -- Log the missing user IDs
        RAISE NOTICE 'Missing profile user IDs: %', (
            SELECT STRING_AGG(au.id::text, ', ')
            FROM auth.users au
            LEFT JOIN profiles p ON au.id = p.id
            WHERE p.id IS NULL 
            AND au.email_confirmed_at IS NOT NULL
            LIMIT 10  -- Limit output for readability
        );
    END IF;
END
$$;

-- Step 2: Create profiles for auth users that don't have them
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
    COALESCE(au.raw_user_meta_data->>'firstname', SPLIT_PART(au.email, '@', 1)) as firstname,
    COALESCE(au.raw_user_meta_data->>'lastname', 'User') as lastname,
    COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) as username,
    au.email,
    COALESCE(au.raw_user_meta_data->>'cellphone_no', '0000000000') as cellphone_no,
    COALESCE(au.raw_user_meta_data->>'role', 'buyer') as role,
    CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END as is_verified,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL 
AND au.email_confirmed_at IS NOT NULL  -- Only create profiles for confirmed users
ON CONFLICT (id) DO NOTHING;  -- In case some profiles exist

-- Step 3: Check results
DO $$
DECLARE
    sync_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sync_count
    FROM auth.users au
    INNER JOIN profiles p ON au.id = p.id
    WHERE au.email_confirmed_at IS NOT NULL;
    
    RAISE NOTICE 'Total synced profiles: %', sync_count;
END
$$;

-- Step 4: Clean up any orphaned product_views with invalid user_ids
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_views') THEN
        SELECT COUNT(*) INTO orphaned_count
        FROM product_views pv 
        LEFT JOIN profiles p ON pv.user_id = p.id 
        WHERE p.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE 'Found % orphaned product_views with invalid user_ids', orphaned_count;
            
            DELETE FROM product_views 
            WHERE id IN (
                SELECT pv.id 
                FROM product_views pv 
                LEFT JOIN profiles p ON pv.user_id = p.id 
                WHERE p.id IS NULL
            );
            
            RAISE NOTICE 'Deleted % orphaned product_views', orphaned_count;
        ELSE
            RAISE NOTICE 'No orphaned product_views found';
        END IF;
    END IF;
END
$$;

-- Step 5: Verify specific user from the logs
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = 'f01424a2-8e44-46f2-bf2b-cada187e776c'
    ) INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE 'User f01424a2-8e44-46f2-bf2b-cada187e776c profile exists ✓';
    ELSE
        RAISE NOTICE 'User f01424a2-8e44-46f2-bf2b-cada187e776c profile missing ✗';
    END IF;
END
$$; 