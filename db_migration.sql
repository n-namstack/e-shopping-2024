-- Create function for setting updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS wishlist (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL, product_id UUID NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), UNIQUE(user_id, product_id));

-- Add database tables for chat functionality

-- Create product comments table for public discussions on products
CREATE TABLE product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp_product_comments
BEFORE UPDATE ON product_comments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create order comments table for buyer-seller communication on specific orders
CREATE TABLE order_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp_order_comments
BEFORE UPDATE ON order_comments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create private messages table for direct messaging between users
CREATE TABLE private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp_private_messages
BEFORE UPDATE ON private_messages
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create conversation table to group private messages
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID NOT NULL REFERENCES profiles(id),
  participant2_id UUID NOT NULL REFERENCES profiles(id),
  last_message_text TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp_conversations
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create function to upsert conversation when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  p1_id UUID;
  p2_id UUID;
BEGIN
  -- Ensure consistent ordering of participants
  IF NEW.sender_id < NEW.recipient_id THEN
    p1_id := NEW.sender_id;
    p2_id := NEW.recipient_id;
  ELSE
    p1_id := NEW.recipient_id;
    p2_id := NEW.sender_id;
  END IF;

  -- Insert or update the conversation
  INSERT INTO conversations (
    participant1_id, 
    participant2_id, 
    last_message_text, 
    last_message_time,
    unread_count
  )
  VALUES (
    p1_id,
    p2_id,
    NEW.message,
    NOW(),
    CASE WHEN NEW.sender_id = p1_id THEN 1 ELSE 0 END
  )
  ON CONFLICT (participant1_id, participant2_id) 
  DO UPDATE SET
    last_message_text = NEW.message,
    last_message_time = NOW(),
    unread_count = CASE 
      WHEN NEW.sender_id = conversations.participant1_id THEN conversations.unread_count + 1
      ELSE conversations.unread_count
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation when a new message is sent
CREATE TRIGGER update_conversation_trigger
AFTER INSERT ON private_messages
FOR EACH ROW
EXECUTE PROCEDURE update_conversation_on_message();

-- RLS policies for product comments
ALTER TABLE product_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product comments"
ON product_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert product comments"
ON product_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON product_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON product_comments FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for order comments
ALTER TABLE order_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view comments on their orders"
ON order_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND orders.buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view comments on their shop orders"
ON order_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = orders.shop_id
      AND shops.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Authenticated users can insert order comments if they are buyer or seller"
ON order_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.buyer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = orders.shop_id
        AND shops.owner_id = auth.uid()
      )
    )
  )
);

-- RLS policies for private messages
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received"
ON private_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
ON private_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- RLS policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
