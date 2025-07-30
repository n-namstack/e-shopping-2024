-- Simplified migration for Pay Now/Pay Later functionality
-- Run this in your Supabase SQL editor

-- 1. Add payment timing and deferred payment columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_timing TEXT DEFAULT 'now' CHECK (payment_timing IN ('now', 'later')),
ADD COLUMN IF NOT EXISTS payment_deferred BOOLEAN DEFAULT FALSE;

-- 2. Update payment_status constraint to include 'deferred' status
-- First drop existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'orders_payment_status_check' 
               AND table_name = 'orders') THEN
        ALTER TABLE orders DROP CONSTRAINT orders_payment_status_check;
    END IF;
END $$;

-- Add new constraint with deferred status
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('unpaid', 'paid', 'pending', 'deferred', 'proof_submitted', 'failed'));

-- 3. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_timing ON orders(payment_timing);
CREATE INDEX IF NOT EXISTS idx_orders_payment_deferred ON orders(payment_deferred);

-- 4. Update existing orders to have proper payment_status values
UPDATE orders 
SET payment_status = 'unpaid' 
WHERE payment_status IS NULL;

-- 5. Add title column to notifications table (needed for pay later notifications)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Notification';

-- 6. Create a simple function to notify when pay later orders are ready
CREATE OR REPLACE FUNCTION notify_pay_later_order_ready(order_uuid UUID)
RETURNS JSON AS $$
DECLARE
  order_record orders%ROWTYPE;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = order_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Insert notification for buyer
  INSERT INTO notifications (
    user_id, 
    type, 
    title,
    message, 
    order_id,
    created_at
  ) VALUES (
    order_record.buyer_id,
    'payment_required',
    'Payment Required',
    'Your order #' || SUBSTRING(order_record.id::text, 1, 8) || ' is ready for delivery. Please complete payment to proceed.',
    order_record.id,
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'order_id', order_record.id,
    'message', 'Payment required notification sent'
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Add RLS policies for notifications if they don't exist
-- Note: Only add policies if the table doesn't already have RLS enabled with policies

DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'notifications' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Add user view policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications" ON notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  -- Add system create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'System can create notifications'
  ) THEN
    CREATE POLICY "System can create notifications" ON notifications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 8. Add indexes for notifications if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 9. Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('payment_timing', 'payment_deferred')
ORDER BY column_name; 