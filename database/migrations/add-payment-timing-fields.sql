-- Add payment timing and deferred payment support to orders table
-- Run this in your Supabase SQL editor

-- Add new columns for payment timing and deferred payment status
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_timing TEXT DEFAULT 'now' CHECK (payment_timing IN ('now', 'later')),
ADD COLUMN IF NOT EXISTS payment_deferred BOOLEAN DEFAULT FALSE;

-- Update payment_status constraint to include 'deferred' status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('unpaid', 'paid', 'pending', 'deferred', 'proof_submitted', 'failed'));

-- Add index for better query performance on payment timing
CREATE INDEX IF NOT EXISTS idx_orders_payment_timing ON orders(payment_timing);
CREATE INDEX IF NOT EXISTS idx_orders_payment_deferred ON orders(payment_deferred);

-- Update orders to have proper payment_status values if any exist
UPDATE orders 
SET payment_status = 'unpaid' 
WHERE payment_status IS NULL;

-- Create a function to handle pay later order notifications
CREATE OR REPLACE FUNCTION notify_pay_later_order_ready(order_uuid UUID)
RETURNS JSON AS $$
DECLARE
  order_record orders%ROWTYPE;
  buyer_record profiles%ROWTYPE;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = order_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Get buyer details
  SELECT * INTO buyer_record FROM profiles WHERE id = order_record.buyer_id;
  
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
    'buyer_email', buyer_record.email,
    'message', 'Payment required notification sent'
  );
END;
$$ LANGUAGE plpgsql;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at); 