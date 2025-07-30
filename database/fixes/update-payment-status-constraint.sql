-- Update payment status constraint to include proof_rejected
-- Run this in your Supabase SQL editor

-- Drop existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Add new constraint with proof_rejected status
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('unpaid', 'paid', 'pending', 'deferred', 'proof_submitted', 'proof_rejected', 'failed'));

-- Verify the constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'orders_payment_status_check'; 