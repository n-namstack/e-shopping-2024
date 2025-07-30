-- Minimal dual roles support - just add the necessary columns
-- Run this in your Supabase SQL Editor

-- Add new columns for dual roles support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_roles JSONB DEFAULT '["buyer"]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_since TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS buyer_since TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing profiles to set available_roles based on current role
UPDATE profiles 
SET available_roles = CASE 
  WHEN role = 'seller' THEN '["buyer", "seller"]'
  ELSE '["buyer"]'
END
WHERE available_roles IS NULL;

-- Update seller_since for existing sellers
UPDATE profiles 
SET seller_since = created_at 
WHERE role = 'seller' AND seller_since IS NULL;

-- Update buyer_since for all profiles if not set
UPDATE profiles 
SET buyer_since = created_at 
WHERE buyer_since IS NULL;

-- Verify the changes
SELECT 'Profiles with dual roles:' as info, COUNT(*) as count 
FROM profiles 
WHERE available_roles ? 'seller' AND available_roles ? 'buyer';

SELECT 'Total profiles:' as info, COUNT(*) as count FROM profiles; 