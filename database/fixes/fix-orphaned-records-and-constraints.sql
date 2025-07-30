-- Script to clean up orphaned records and restore foreign key constraints
-- This handles the case where records reference non-existent foreign keys

-- Step 1: Identify and clean up orphaned records

-- 1.1 Check for orphaned payments first (payments referencing orders that will be deleted)
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        -- Check for payments referencing orders that reference non-existent shops
        SELECT COUNT(*) INTO orphaned_count
        FROM payments pay 
        LEFT JOIN orders o ON pay.order_id = o.id
        LEFT JOIN shops s ON o.shop_id = s.id 
        WHERE o.id IS NOT NULL AND s.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE 'Found % orphaned payments referencing orders with non-existent shops', orphaned_count;
            
            -- Delete orphaned payments
            DELETE FROM payments 
            WHERE id IN (
                SELECT pay.id 
                FROM payments pay 
                LEFT JOIN orders o ON pay.order_id = o.id
                LEFT JOIN shops s ON o.shop_id = s.id 
                WHERE o.id IS NOT NULL AND s.id IS NULL
            );
            
            RAISE NOTICE 'Deleted % orphaned payments', orphaned_count;
        ELSE
            RAISE NOTICE 'No orphaned payments found';
        END IF;
        
        -- Also check for payments referencing completely non-existent orders
        SELECT COUNT(*) INTO orphaned_count
        FROM payments pay 
        LEFT JOIN orders o ON pay.order_id = o.id 
        WHERE o.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE 'Found % payments referencing non-existent orders', orphaned_count;
            
            DELETE FROM payments 
            WHERE id IN (
                SELECT pay.id 
                FROM payments pay 
                LEFT JOIN orders o ON pay.order_id = o.id 
                WHERE o.id IS NULL
            );
            
            RAISE NOTICE 'Deleted % payments with missing orders', orphaned_count;
        END IF;
    ELSE
        RAISE NOTICE 'No payments table found';
    END IF;
END
$$;

-- 1.2 Check for orphaned orders (orders referencing non-existent shops)
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM orders o 
    LEFT JOIN shops s ON o.shop_id = s.id 
    WHERE s.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned orders referencing non-existent shops', orphaned_count;
        
        -- Log the orphaned orders before deletion
        RAISE NOTICE 'Orphaned order IDs: %', (
            SELECT STRING_AGG(o.id::text, ', ')
            FROM orders o 
            LEFT JOIN shops s ON o.shop_id = s.id 
            WHERE s.id IS NULL
        );
        
        -- Delete orphaned orders
        DELETE FROM orders 
        WHERE id IN (
            SELECT o.id 
            FROM orders o 
            LEFT JOIN shops s ON o.shop_id = s.id 
            WHERE s.id IS NULL
        );
        
        RAISE NOTICE 'Deleted % orphaned orders', orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned orders found';
    END IF;
END
$$;

-- 1.3 Check for orphaned orders (orders referencing non-existent buyers)
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM orders o 
    LEFT JOIN profiles p ON o.buyer_id = p.id 
    WHERE p.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned orders referencing non-existent buyers', orphaned_count;
        
        -- Delete orphaned orders
        DELETE FROM orders 
        WHERE id IN (
            SELECT o.id 
            FROM orders o 
            LEFT JOIN profiles p ON o.buyer_id = p.id 
            WHERE p.id IS NULL
        );
        
        RAISE NOTICE 'Deleted % orphaned orders', orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned orders with missing buyers found';
    END IF;
END
$$;

-- 1.4 Check for orphaned order_items
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') THEN
        SELECT COUNT(*) INTO orphaned_count
        FROM order_items oi 
        LEFT JOIN orders o ON oi.order_id = o.id 
        WHERE o.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE 'Found % orphaned order_items referencing non-existent orders', orphaned_count;
            
            DELETE FROM order_items 
            WHERE id IN (
                SELECT oi.id 
                FROM order_items oi 
                LEFT JOIN orders o ON oi.order_id = o.id 
                WHERE o.id IS NULL
            );
            
            RAISE NOTICE 'Deleted % orphaned order_items', orphaned_count;
        ELSE
            RAISE NOTICE 'No orphaned order_items found';
        END IF;
    END IF;
END
$$;

-- 1.5 Check for orphaned order_items referencing non-existent products
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM order_items oi 
    LEFT JOIN products p ON oi.product_id = p.id 
    WHERE p.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned order_items referencing non-existent products', orphaned_count;
        
        DELETE FROM order_items 
        WHERE id IN (
            SELECT oi.id 
            FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE p.id IS NULL
        );
        
        RAISE NOTICE 'Deleted % orphaned order_items', orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned order_items with missing products found';
    END IF;
END
$$;

-- 1.6 Check for orphaned products referencing non-existent shops
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM products p 
    LEFT JOIN shops s ON p.shop_id = s.id 
    WHERE s.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned products referencing non-existent shops', orphaned_count;
        
        DELETE FROM products 
        WHERE id IN (
            SELECT p.id 
            FROM products p 
            LEFT JOIN shops s ON p.shop_id = s.id 
            WHERE s.id IS NULL
        );
        
        RAISE NOTICE 'Deleted % orphaned products', orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned products found';
    END IF;
END
$$;

-- 1.7 Check for orphaned shops referencing non-existent owners
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM shops s 
    LEFT JOIN profiles p ON s.owner_id = p.id 
    WHERE p.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned shops referencing non-existent owners', orphaned_count;
        
        DELETE FROM shops 
        WHERE id IN (
            SELECT s.id 
            FROM shops s 
            LEFT JOIN profiles p ON s.owner_id = p.id 
            WHERE p.id IS NULL
        );
        
        RAISE NOTICE 'Deleted % orphaned shops', orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned shops found';
    END IF;
END
$$;

-- 1.8 Check for orphaned product_views
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_views') THEN
        -- Check for product_views with non-existent users
        SELECT COUNT(*) INTO orphaned_count
        FROM product_views pv 
        LEFT JOIN profiles p ON pv.user_id = p.id 
        WHERE p.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE 'Found % orphaned product_views referencing non-existent users', orphaned_count;
            
            DELETE FROM product_views 
            WHERE id IN (
                SELECT pv.id 
                FROM product_views pv 
                LEFT JOIN profiles p ON pv.user_id = p.id 
                WHERE p.id IS NULL
            );
            
            RAISE NOTICE 'Deleted % orphaned product_views', orphaned_count;
        END IF;
        
        -- Check for product_views with non-existent products
        SELECT COUNT(*) INTO orphaned_count
        FROM product_views pv 
        LEFT JOIN products p ON pv.product_id = p.id 
        WHERE p.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE 'Found % orphaned product_views referencing non-existent products', orphaned_count;
            
            DELETE FROM product_views 
            WHERE id IN (
                SELECT pv.id 
                FROM product_views pv 
                LEFT JOIN products p ON pv.product_id = p.id 
                WHERE p.id IS NULL
            );
            
            RAISE NOTICE 'Deleted % orphaned product_views', orphaned_count;
        END IF;
    END IF;
END
$$;

-- Step 2: Now safely restore foreign key constraints

-- 2.1 Fix profiles table foreign key constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
    
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed profiles foreign key constraint';
END
$$;

-- 2.2 Fix shops table foreign key constraints
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'shops_owner_id_fkey' 
        AND table_name = 'shops'
    ) THEN
        ALTER TABLE shops DROP CONSTRAINT shops_owner_id_fkey;
    END IF;
    
    ALTER TABLE shops 
    ADD CONSTRAINT shops_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed shops foreign key constraint';
END
$$;

-- 2.3 Fix products table foreign key constraints
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_shop_id_fkey' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products DROP CONSTRAINT products_shop_id_fkey;
    END IF;
    
    ALTER TABLE products 
    ADD CONSTRAINT products_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed products foreign key constraint';
END
$$;

-- 2.4 Fix orders table foreign key constraints
DO $$
BEGIN
    -- Fix buyer_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_buyer_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_buyer_id_fkey;
    END IF;
    
    ALTER TABLE orders 
    ADD CONSTRAINT orders_buyer_id_fkey 
    FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Fix shop_id foreign key (this was causing the main error)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_shop_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_shop_id_fkey;
    END IF;
    
    ALTER TABLE orders 
    ADD CONSTRAINT orders_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed orders foreign key constraints';
END
$$;

-- 2.5 Fix order_items table foreign key constraints
DO $$
BEGIN
    -- Check if order_id column exists in order_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE order_items ADD COLUMN order_id UUID NOT NULL REFERENCES orders(id);
        RAISE NOTICE 'Added order_id column to order_items';
    ELSE
        -- Drop existing constraint if it exists and recreate it
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'order_items_order_id_fkey' 
            AND table_name = 'order_items'
        ) THEN
            ALTER TABLE order_items DROP CONSTRAINT order_items_order_id_fkey;
        END IF;
        
        ALTER TABLE order_items 
        ADD CONSTRAINT order_items_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
    
    -- Fix product_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_items_product_id_fkey' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
    END IF;
    
    ALTER TABLE order_items 
    ADD CONSTRAINT order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed order_items foreign key constraints';
END
$$;

-- 2.6 Fix product_views table foreign key constraints if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_views') THEN
        -- Drop existing constraints if they exist and recreate them
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'product_views_user_id_fkey' 
            AND table_name = 'product_views'
        ) THEN
            ALTER TABLE product_views DROP CONSTRAINT product_views_user_id_fkey;
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'product_views_product_id_fkey' 
            AND table_name = 'product_views'
        ) THEN
            ALTER TABLE product_views DROP CONSTRAINT product_views_product_id_fkey;
        END IF;
        
        -- Recreate product_views foreign key constraints
        ALTER TABLE product_views 
        ADD CONSTRAINT product_views_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        ALTER TABLE product_views 
        ADD CONSTRAINT product_views_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed product_views foreign key constraints';
    END IF;
END
$$;

-- 2.7 Fix review tables if they exist
DO $$
BEGIN
    -- Fix product_reviews
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_reviews') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'product_reviews_product_id_fkey' 
            AND table_name = 'product_reviews'
        ) THEN
            ALTER TABLE product_reviews DROP CONSTRAINT product_reviews_product_id_fkey;
        END IF;
        
        ALTER TABLE product_reviews 
        ADD CONSTRAINT product_reviews_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'product_reviews_buyer_id_fkey' 
            AND table_name = 'product_reviews'
        ) THEN
            ALTER TABLE product_reviews DROP CONSTRAINT product_reviews_buyer_id_fkey;
        END IF;
        
        ALTER TABLE product_reviews 
        ADD CONSTRAINT product_reviews_buyer_id_fkey 
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed product_reviews foreign key constraints';
    END IF;
    
    -- Fix shop_reviews
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_reviews') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'shop_reviews_shop_id_fkey' 
            AND table_name = 'shop_reviews'
        ) THEN
            ALTER TABLE shop_reviews DROP CONSTRAINT shop_reviews_shop_id_fkey;
        END IF;
        
        ALTER TABLE shop_reviews 
        ADD CONSTRAINT shop_reviews_shop_id_fkey 
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'shop_reviews_buyer_id_fkey' 
            AND table_name = 'shop_reviews'
        ) THEN
            ALTER TABLE shop_reviews DROP CONSTRAINT shop_reviews_buyer_id_fkey;
        END IF;
        
        ALTER TABLE shop_reviews 
        ADD CONSTRAINT shop_reviews_buyer_id_fkey 
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed shop_reviews foreign key constraints';
    END IF;
END
$$;

-- 2.8 Fix payments table foreign key constraints if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'payments_order_id_fkey' 
            AND table_name = 'payments'
        ) THEN
            ALTER TABLE payments DROP CONSTRAINT payments_order_id_fkey;
        END IF;
        
        ALTER TABLE payments 
        ADD CONSTRAINT payments_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed payments foreign key constraints';
    END IF;
END
$$;

-- Step 3: Final verification
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup and foreign key restoration completed successfully!';
END
$$;

-- Show summary of foreign key constraints
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name; 