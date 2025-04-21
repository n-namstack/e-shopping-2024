-- Fix missing WHERE clauses in DELETE operations

-- Fix shop_follows deletion policies
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON shop_follows;
CREATE POLICY "Enable delete for users based on user_id" 
ON shop_follows 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix product_views deletion policies
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON product_views;
CREATE POLICY "Enable delete for users based on user_id" 
ON product_views 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix product_likes deletion policies
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON product_likes;
CREATE POLICY "Enable delete for users based on user_id" 
ON product_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create a function to safely update product data
CREATE OR REPLACE FUNCTION safe_update_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure we're not doing any operations without WHERE clauses
  IF TG_OP = 'DELETE' AND TG_LEVEL = 'STATEMENT' THEN
    RAISE EXCEPTION 'DELETE operations require a WHERE clause';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to ensure safe product updates
DROP TRIGGER IF EXISTS ensure_safe_product_update ON products;
CREATE TRIGGER ensure_safe_product_update
BEFORE DELETE ON products
FOR EACH STATEMENT
EXECUTE FUNCTION safe_update_product();

-- Create helper functions for shop follows
CREATE OR REPLACE FUNCTION toggle_shop_follow(shop_id_param UUID, user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if follow exists
  IF EXISTS (
    SELECT 1 FROM shop_follows 
    WHERE shop_id = shop_id_param AND user_id = user_id_param
  ) THEN
    -- Unfollow
    DELETE FROM shop_follows 
    WHERE shop_id = shop_id_param AND user_id = user_id_param;
  ELSE
    -- Follow
    INSERT INTO shop_follows (shop_id, user_id)
    VALUES (shop_id_param, user_id_param);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 