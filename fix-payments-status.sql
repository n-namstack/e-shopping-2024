-- Simple fix for payments status constraint
-- Run this in Supabase SQL Editor

-- Remove the existing constraint and add a new one with proper status values
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'processing')); 