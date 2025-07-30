-- Setup storage bucket for payment proofs
-- Run this in Supabase SQL Editor

-- 1. Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow payment proof uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow payment proof viewing" ON storage.objects;

-- 3. Create RLS policies for the payment-proofs bucket

-- Allow authenticated users to upload payment proofs
CREATE POLICY "Allow payment proof uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs' AND 
  auth.uid() IS NOT NULL
);

-- Allow users to view payment proofs if they are:
-- 1. The buyer who uploaded the proof
-- 2. The seller of the shop where the order was placed
-- 3. An admin
CREATE POLICY "Allow payment proof viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'payment-proofs' AND (
    -- Allow the uploader to view their own proof
    auth.uid()::text = (storage.foldername(name))[1] OR
    
    -- Allow seller to view proof for their shop orders
    auth.uid() IN (
      SELECT s.owner_id 
      FROM shops s
      INNER JOIN orders o ON o.shop_id = s.id
      WHERE o.payment_proof_url LIKE '%' || name || '%'
    ) OR
    
    -- Allow buyer to view their own order proof  
    auth.uid() IN (
      SELECT o.buyer_id
      FROM orders o
      WHERE o.payment_proof_url LIKE '%' || name || '%'
    ) OR
    
    -- Allow admins to view all proofs
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
);

-- 4. Allow users to delete their own payment proofs (optional)
CREATE POLICY "Allow payment proof deletion" ON storage.objects
FOR DELETE USING (
  bucket_id = 'payment-proofs' AND 
  auth.uid() IS NOT NULL AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
); 