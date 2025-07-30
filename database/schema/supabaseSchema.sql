-- Create profiles table for user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cellphone_no TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'buyer', -- 'buyer', 'seller', 'admin'
  profile_image TEXT,
  address JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  last_login TIMESTAMP WITH TIME ZONE,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to automatically set created_at and updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  logo TEXT,
  banner TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'suspended'
  address JSONB,
  contact_info JSONB NOT NULL,
  business_hours JSONB,
  categories JSONB,
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  verification_documents JSONB,
  verification_status TEXT DEFAULT 'not_submitted', -- 'not_submitted', 'submitted', 'verified', 'rejected'
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_shops
BEFORE UPDATE ON shops
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  main_image TEXT,
  additional_images JSONB, -- Array of image URLs
  video_url TEXT,
  condition TEXT NOT NULL, -- 'new', 'used'
  is_on_sale BOOLEAN DEFAULT FALSE,
  discount_percentage NUMERIC DEFAULT 0,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  in_stock BOOLEAN DEFAULT TRUE, -- true = in stock, false = on order
  est_arrival_days INTEGER, -- For on-order items
  colors JSONB, -- Available colors
  sizes JSONB, -- Available sizes
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_products
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  shop_id UUID NOT NULL REFERENCES shops(id),
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash', 'card', 'paytoday', 'ewallet'
  payment_details JSONB,
  shipping_address JSONB NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'deposit_pending', 'processing', 'shipped', 'delivered', 'canceled'
  delivery_method TEXT NOT NULL, -- 'delivery', 'pickup'
  delivery_fee NUMERIC DEFAULT 0,
  tracking_info JSONB,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT FALSE,
  final_payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  is_on_order BOOLEAN DEFAULT FALSE,
  product_status TEXT DEFAULT 'processing', -- 'processing', 'ordered', 'in_transit', 'received'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_order_items
BEFORE UPDATE ON order_items
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create product reviews table
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_product_reviews
BEFORE UPDATE ON product_reviews
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create shop reviews table
CREATE TABLE shop_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_shop_reviews
BEFORE UPDATE ON shop_reviews
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create shop followers table (for many-to-many relationship)
CREATE TABLE shop_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order', 'product', 'shop', 'system'
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB, -- Additional context data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seller_stats table to track revenue and other metrics
CREATE TABLE seller_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  total_revenue NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to initialize seller_stats when a new shop is created
CREATE OR REPLACE FUNCTION initialize_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO seller_stats (shop_id, total_revenue, total_orders, completed_orders, total_products)
  VALUES (NEW.id, 0, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize seller_stats when a new shop is created
CREATE TRIGGER create_seller_stats
AFTER INSERT ON shops
FOR EACH ROW
EXECUTE PROCEDURE initialize_seller_stats();

-- Create a function to update seller_stats when an order's payment_status changes to 'paid'
CREATE OR REPLACE FUNCTION update_seller_stats_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_status is changed to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Update the seller_stats table
    UPDATE seller_stats
    SET 
      total_revenue = total_revenue + NEW.total_amount,
      total_orders = total_orders + 1,
      last_updated = NOW()
    WHERE shop_id = NEW.shop_id;
  END IF;
  
  -- If order status is changed to 'delivered' or 'completed'
  IF (NEW.status = 'delivered' OR NEW.status = 'completed') AND 
     (OLD.status != 'delivered' AND OLD.status != 'completed') THEN
    -- Update completed orders count
    UPDATE seller_stats
    SET 
      completed_orders = completed_orders + 1,
      last_updated = NOW()
    WHERE shop_id = NEW.shop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update seller_stats when an order is updated
CREATE TRIGGER update_stats_on_order_update
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE update_seller_stats_on_payment();

-- Create a function to update seller_stats when a product is added or removed
CREATE OR REPLACE FUNCTION update_seller_stats_products()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Product added
    UPDATE seller_stats
    SET 
      total_products = total_products + 1,
      last_updated = NOW()
    WHERE shop_id = NEW.shop_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Product removed
    UPDATE seller_stats
    SET 
      total_products = total_products - 1,
      last_updated = NOW()
    WHERE shop_id = OLD.shop_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update seller_stats when products are added or deleted
CREATE TRIGGER update_stats_on_product_insert
AFTER INSERT ON products
FOR EACH ROW
EXECUTE PROCEDURE update_seller_stats_products();

CREATE TRIGGER update_stats_on_product_delete
AFTER DELETE ON products
FOR EACH ROW
EXECUTE PROCEDURE update_seller_stats_products();

-- RLS (Row Level Security) Policies

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Shops RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active shops"
ON shops FOR SELECT
USING (status = 'active');

CREATE POLICY "Owners can view their own shops"
ON shops FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their own shops"
ON shops FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert shops"
ON shops FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Products RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view all products"
ON products FOR SELECT
USING (true);

CREATE POLICY "Shop owners can insert products"
ON products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_id
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can update their products"
ON products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_id
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can delete their products"
ON products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_id
    AND shops.owner_id = auth.uid()
  )
);

-- Orders RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own orders"
ON orders FOR SELECT
USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view orders for their shops"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_id
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Buyers can insert orders"
ON orders FOR INSERT
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Sellers can update orders for their shops"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_id
    AND shops.owner_id = auth.uid()
  )
);

-- Order Items RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND orders.buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view order items for their shops"
ON order_items FOR SELECT
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

-- Setup storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'User Profile Images', true),
  ('shop_images', 'Shop Logos and Banners', true),
  ('product_images', 'Product Images', true),
  ('verification_documents', 'Seller Verification Documents', false);

-- Public storage policies
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Public can view shop images"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop_images');

CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

-- Private storage policies
CREATE POLICY "Only authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can upload shop images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop_images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification_documents' 
  AND auth.role() = 'authenticated'
);

-- Functions
-- Function to update product rating when a review is added
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET 
    rating = (
      SELECT AVG(rating)
      FROM product_reviews
      WHERE product_id = NEW.product_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = NEW.product_id
    )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for product review updates
CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE ON product_reviews
FOR EACH ROW
EXECUTE PROCEDURE update_product_rating();

-- Function to update shop rating when a review is added
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shops
  SET 
    rating = (
      SELECT AVG(rating)
      FROM shop_reviews
      WHERE shop_id = NEW.shop_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM shop_reviews
      WHERE shop_id = NEW.shop_id
    )
  WHERE id = NEW.shop_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for shop review updates
CREATE TRIGGER update_shop_rating_trigger
AFTER INSERT OR UPDATE ON shop_reviews
FOR EACH ROW
EXECUTE PROCEDURE update_shop_rating();

-- Create trigger to add user to profiles after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, firstname, lastname, username, cellphone_no, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'cellphone_no', ''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after a user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user(); 