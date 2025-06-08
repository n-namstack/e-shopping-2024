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

-- Allow system to insert payment records (buyers and shop owners can create payments)
CREATE POLICY "Allow payment record creation" ON payments
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR 
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = payments.shop_id)
  );

-- Seller payouts policies  
CREATE POLICY "Shop owners can view their payouts" ON seller_payouts
  FOR SELECT USING (
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = seller_payouts.shop_id)
  );

-- Allow shop owners to create payout requests
CREATE POLICY "Shop owners can create payouts" ON seller_payouts
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = seller_payouts.shop_id)
  );

-- Platform transactions policies (admin only)
CREATE POLICY "Admin can view platform transactions" ON platform_transactions
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Allow system to create platform transaction records
CREATE POLICY "Allow platform transaction creation" ON platform_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin') OR
    auth.uid() IN (SELECT owner_id FROM shops WHERE id = platform_transactions.shop_id) OR
    auth.uid() IN (SELECT buyer_id FROM orders WHERE id = platform_transactions.order_id)
  );

-- 6. Functions for payment processing
CREATE OR REPLACE FUNCTION process_order_payment(order_uuid UUID)
RETURNS JSON 
LANGUAGE plpgsql
AS $$
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
$$;

-- 7. Function to create seller payout
CREATE OR REPLACE FUNCTION create_seller_payout(
  shop_uuid UUID,
  payout_amount NUMERIC,
  order_ids UUID[]
)
RETURNS JSON 
LANGUAGE plpgsql
AS $$
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
$$;

-- 8. Function to get seller earnings summary
CREATE OR REPLACE FUNCTION get_seller_earnings(
  shop_uuid UUID,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON 
LANGUAGE plpgsql
AS $$
DECLARE
  total_revenue NUMERIC := 0;
  total_platform_fees NUMERIC := 0;
  net_earnings NUMERIC := 0;
  total_orders INTEGER := 0;
  pending_payouts NUMERIC := 0;
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := DATE_TRUNC('month', NOW());
  END IF;
  
  IF end_date IS NULL THEN
    end_date := NOW();
  END IF;
  
  -- Calculate earnings from payments table
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(platform_fee), 0),
    COALESCE(SUM(seller_amount), 0),
    COUNT(*)
  INTO total_revenue, total_platform_fees, net_earnings, total_orders
  FROM payments 
  WHERE shop_id = shop_uuid 
    AND status = 'completed'
    AND created_at BETWEEN start_date AND end_date;
  
  -- Calculate pending payouts
  SELECT COALESCE(SUM(amount), 0)
  INTO pending_payouts
  FROM seller_payouts
  WHERE shop_id = shop_uuid 
    AND status IN ('pending', 'processing');
  
  RETURN json_build_object(
    'shop_id', shop_uuid,
    'period_start', start_date,
    'period_end', end_date,
    'total_revenue', total_revenue,
    'platform_fees', total_platform_fees,
    'net_earnings', net_earnings,
    'total_orders', total_orders,
    'pending_payouts', pending_payouts,
    'available_for_payout', net_earnings - pending_payouts
  );
END;
$$;

-- 9. Function to process bulk seller payouts (weekly/monthly)
CREATE OR REPLACE FUNCTION process_bulk_seller_payouts()
RETURNS JSON 
LANGUAGE plpgsql
AS $$
DECLARE
  shop_record RECORD;
  payout_amount NUMERIC;
  eligible_orders UUID[];
  payout_result JSON;
  results JSON[] := '{}';
  total_payouts INTEGER := 0;
BEGIN
  -- Loop through all shops with pending payments
  FOR shop_record IN 
    SELECT DISTINCT s.id, s.name, s.owner_id
    FROM shops s
    INNER JOIN payments p ON p.shop_id = s.id
    WHERE p.status = 'completed'
      AND p.id NOT IN (
        SELECT UNNEST(
          ARRAY(
            SELECT jsonb_array_elements_text(orders_included)::UUID
            FROM seller_payouts sp
            WHERE sp.shop_id = s.id 
              AND sp.status IN ('pending', 'processing', 'completed')
          )
        )
      )
  LOOP
    -- Get eligible orders for payout
    SELECT 
      COALESCE(SUM(seller_amount), 0),
      ARRAY_AGG(order_id)
    INTO payout_amount, eligible_orders
    FROM payments
    WHERE shop_id = shop_record.id 
      AND status = 'completed'
      AND id NOT IN (
        SELECT UNNEST(
          ARRAY(
            SELECT jsonb_array_elements_text(orders_included)::UUID
            FROM seller_payouts sp
            WHERE sp.shop_id = shop_record.id 
              AND sp.status IN ('pending', 'processing', 'completed')
          )
        )
      );
    
    -- Only create payout if amount is above minimum threshold
    IF payout_amount >= 10.00 THEN
      SELECT create_seller_payout(shop_record.id, payout_amount, eligible_orders)
      INTO payout_result;
      
      results := results || payout_result;
      total_payouts := total_payouts + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total_payouts_created', total_payouts,
    'payouts', results
  );
END;
$$; 