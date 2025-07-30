-- Safe script to sync auth.users with profiles table
-- This checks actual column structure and adapts accordingly

-- Step 1: Check profiles table structure
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Profiles table columns:';
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %: %', col_record.column_name, col_record.data_type;
    END LOOP;
END
$$;

-- Step 2: Check for auth users without profiles
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL 
    AND au.email_confirmed_at IS NOT NULL;
    
    RAISE NOTICE 'Found % authenticated users without profiles', missing_count;
    
    IF missing_count > 0 THEN
        RAISE NOTICE 'Missing profile user IDs: %', (
            SELECT STRING_AGG(au.id::text, ', ')
            FROM auth.users au
            LEFT JOIN profiles p ON au.id = p.id
            WHERE p.id IS NULL 
            AND au.email_confirmed_at IS NOT NULL
            LIMIT 5
        );
    END IF;
END
$$;

-- Step 3: Create profiles with only existing columns
DO $$
DECLARE
    has_updated_at BOOLEAN;
    has_address BOOLEAN;
    has_profile_image BOOLEAN;
    has_status BOOLEAN;
    has_last_login BOOLEAN;
    has_preferences BOOLEAN;
BEGIN
    -- Check which columns exist
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'updated_at'
    ) INTO has_updated_at;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'address'
    ) INTO has_address;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'profile_image'
    ) INTO has_profile_image;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'status'
    ) INTO has_status;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'last_login'
    ) INTO has_last_login;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'preferences'
    ) INTO has_preferences;
    
    RAISE NOTICE 'Column availability: updated_at=%, address=%, profile_image=%, status=%, last_login=%, preferences=%', 
        has_updated_at, has_address, has_profile_image, has_status, has_last_login, has_preferences;

    -- Insert with basic columns that should always exist
    IF has_updated_at THEN
        INSERT INTO profiles (
            id, firstname, lastname, username, email, cellphone_no, role, is_verified, created_at, updated_at
        )
        SELECT 
            au.id,
            COALESCE(au.raw_user_meta_data->>'firstname', SPLIT_PART(au.email, '@', 1)),
            COALESCE(au.raw_user_meta_data->>'lastname', 'User'),
            COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
            au.email,
            COALESCE(au.raw_user_meta_data->>'cellphone_no', '0000000000'),
            COALESCE(au.raw_user_meta_data->>'role', 'buyer'),
            CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END,
            au.created_at,
            NOW()
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.id
        WHERE p.id IS NULL 
        AND au.email_confirmed_at IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
    ELSE
        INSERT INTO profiles (
            id, firstname, lastname, username, email, cellphone_no, role, is_verified, created_at
        )
        SELECT 
            au.id,
            COALESCE(au.raw_user_meta_data->>'firstname', SPLIT_PART(au.email, '@', 1)),
            COALESCE(au.raw_user_meta_data->>'lastname', 'User'),
            COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
            au.email,
            COALESCE(au.raw_user_meta_data->>'cellphone_no', '0000000000'),
            COALESCE(au.raw_user_meta_data->>'role', 'buyer'),
            CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END,
            au.created_at
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.id
        WHERE p.id IS NULL 
        AND au.email_confirmed_at IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Profiles sync completed';
END
$$;

-- Step 4: Check results
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

-- Step 5: Clean up orphaned product_views
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
            RAISE NOTICE 'Found % orphaned product_views', orphaned_count;
            
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

-- Step 6: Verify the specific user from logs
DO $$
DECLARE
    user_exists BOOLEAN;
    profile_info RECORD;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = 'f01424a2-8e44-46f2-bf2b-cada187e776c'
    ) INTO user_exists;
    
    IF user_exists THEN
        SELECT firstname, lastname, email, role INTO profile_info
        FROM profiles 
        WHERE id = 'f01424a2-8e44-46f2-bf2b-cada187e776c';
        
        RAISE NOTICE 'User f01424a2-8e44-46f2-bf2b-cada187e776c profile exists ✓';
        RAISE NOTICE 'Profile: % % (%) - %', profile_info.firstname, profile_info.lastname, profile_info.role, profile_info.email;
    ELSE
        RAISE NOTICE 'User f01424a2-8e44-46f2-bf2b-cada187e776c profile missing ✗';
    END IF;
END
$$; 