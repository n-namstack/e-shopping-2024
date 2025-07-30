BEGIN;
-- Create policy for public read access to shop-images
CREATE POLICY "Public Access to shop-images" ON storage.objects FOR SELECT USING (bucket_id = 'shop-images');
-- Create policy for authenticated users to upload to shop-images
CREATE POLICY "Allow authenticated uploads to shop-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shop-images' AND auth.role() = 'authenticated');
-- Create policy for authenticated users to update their shop-images
CREATE POLICY "Allow authenticated updates to shop-images" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'shop-images' AND auth.role() = 'authenticated');
