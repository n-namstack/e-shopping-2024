-- Get complete database structure and foreign key constraints

-- 1. Get all tables
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Get all foreign key constraints
SELECT
    tc.table_name as table_name,
    kcu.column_name as column_name,
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

-- 3. Get specific data for our user to see what needs to be cleaned
SELECT 'User Profile:' as type, id, firstname, lastname, email FROM profiles WHERE id = '91b19af9-716d-4257-857b-e6f15179239d';
SELECT 'User Shops:' as type, id, name, owner_id FROM shops WHERE owner_id = '91b19af9-716d-4257-857b-e6f15179239d';
SELECT 'User Orders:' as type, id, buyer_id, shop_id FROM orders WHERE buyer_id = '91b19af9-716d-4257-857b-e6f15179239d'; 