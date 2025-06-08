-- Check storage bucket status and recent payment proof uploads
-- Run this in Supabase SQL Editor to debug

-- 1. Check if payment-proofs bucket exists
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'payment-proofs';

-- 2. Check recent payment proof files
SELECT name, bucket_id, size, content_type, created_at, updated_at
FROM storage.objects 
WHERE bucket_id = 'payment-proofs'
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check recent orders with payment proofs
SELECT id, payment_proof_url, payment_proof_uploaded_at, payment_status, created_at
FROM orders 
WHERE payment_proof_url IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check recent order comments (chat messages)
SELECT oc.id, oc.order_id, oc.message, oc.created_at, o.payment_proof_url
FROM order_comments oc
JOIN orders o ON o.id = oc.order_id
WHERE oc.message LIKE '%Payment proof%'
ORDER BY oc.created_at DESC 
LIMIT 5;

-- 5. Check storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'; 