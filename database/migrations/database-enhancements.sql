-- Additional tables for better payment tracking

-- 1. Payments table to track all payment transactions
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  shop_id UUID NOT NULL REFERENCES shops(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Payment amounts
  total_amount NUMERIC NOT NULL,
  seller_amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment details
  payment_method TEXT,
  payment_provider TEXT, -- stripe, paypal, etc.
  payment_provider_id TEXT, -- external payment ID
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Seller payouts table to track when sellers get paid
CREATE TABLE seller_payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id),
  
  -- Payout details
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  payout_method TEXT, -- bank_transfer, paypal, stripe, etc.
  
  -- External references
  payout_provider TEXT,
  payout_provider_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Metadata
  orders_included JSONB, -- Array of order IDs included in this payout
  fees_deducted NUMERIC DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Platform transactions table for tracking platform revenue
CREATE TABLE platform_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('commission', 'fee', 'refund', 'chargeback')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- References
  order_id UUID REFERENCES orders(id),
  shop_id UUID REFERENCES shops(id),
  payment_id UUID REFERENCES payments(id),
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add indexes for better performance
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_shop_id ON payments(shop_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE INDEX idx_seller_payouts_shop_id ON seller_payouts(shop_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts(status);
CREATE INDEX idx_seller_payouts_created_at ON seller_payouts(created_at);

CREATE INDEX idx_platform_transactions_type ON platform_transactions(type);
CREATE INDEX idx_platform_transactions_order_id ON platform_transactions(order_id);
CREATE INDEX idx_platform_transactions_created_at ON platform_transactions(created_at);

-- 5. Add RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their payment records" ON payments
  FOR SELECT USING (
    auth.uid() = buyer_id OR 
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = payments.shop_id)
  );

-- Seller payouts policies  
CREATE POLICY "Shop owners can view their payouts" ON seller_payouts
  FOR SELECT USING (
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = seller_payouts.shop_id)
  );

-- Platform transactions policies (admin only)
CREATE POLICY "Admin can view platform transactions" ON platform_transactions
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 6. Functions for payment processing
CREATE OR REPLACE FUNCTION process_order_payment(order_uuid UUID)
RETURNS JSON AS $$
DECLARE
  order_record orders%ROWTYPE;
  platform_fee_rate NUMERIC := 0.05; -- 5%
  platform_fee NUMERIC;
  seller_amount NUMERIC;
  payment_id UUID;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = order_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Calculate fees
  platform_fee := order_record.total_amount * platform_fee_rate;
  seller_amount := order_record.total_amount - platform_fee;
  
  -- Create payment record
  INSERT INTO payments (
    order_id, shop_id, buyer_id, total_amount, 
    seller_amount, platform_fee, status
  ) VALUES (
    order_uuid, order_record.shop_id, order_record.buyer_id,
    order_record.total_amount, seller_amount, platform_fee, 'completed'
  ) RETURNING id INTO payment_id;
  
  -- Create platform transaction record
  INSERT INTO platform_transactions (
    type, amount, order_id, shop_id, payment_id, description
  ) VALUES (
    'commission', platform_fee, order_uuid, order_record.shop_id, 
    payment_id, 'Platform commission from order'
  );
  
  -- Update order payment status
  UPDATE orders 
  SET payment_status = 'paid', payment_date = NOW()
  WHERE id = order_uuid;
  
  RETURN json_build_object(
    'success', true,
    'payment_id', payment_id,
    'total_amount', order_record.total_amount,
    'seller_amount', seller_amount,
    'platform_fee', platform_fee
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Function to create seller payout
CREATE OR REPLACE FUNCTION create_seller_payout(
  shop_uuid UUID,
  payout_amount NUMERIC,
  order_ids UUID[]
)
RETURNS JSON AS $$
DECLARE
  payout_id UUID;
BEGIN
  -- Create payout record
  INSERT INTO seller_payouts (
    shop_id, amount, orders_included, status
  ) VALUES (
    shop_uuid, payout_amount, to_jsonb(order_ids), 'pending'
  ) RETURNING id INTO payout_id;
  
  RETURN json_build_object(
    'success', true,
    'payout_id', payout_id,
    'amount', payout_amount,
    'orders_count', array_length(order_ids, 1)
  );
END;
$$ LANGUAGE plpgsql; 