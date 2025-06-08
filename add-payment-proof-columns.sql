-- Add payment proof columns to orders table
-- Run this in your Supabase SQL editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for payment proofs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for payment-proofs bucket
CREATE POLICY "Users can upload payment proofs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view payment proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'payment-proofs' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid() IN (
      SELECT owner_id FROM shops 
      WHERE id IN (
        SELECT shop_id FROM orders 
        WHERE payment_proof_url LIKE '%' || name || '%'
      )
    )
  )
); 