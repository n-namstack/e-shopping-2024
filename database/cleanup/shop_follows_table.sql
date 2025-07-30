-- Shop follows table for tracking which shops users follow
CREATE TABLE shop_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  shop_id UUID REFERENCES shops(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

-- Enable RLS
ALTER TABLE shop_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own follows"
ON shop_follows FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own follows"
ON shop_follows FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
ON shop_follows FOR DELETE
USING (auth.uid() = user_id); 