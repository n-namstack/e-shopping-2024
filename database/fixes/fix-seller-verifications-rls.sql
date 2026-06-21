-- Fix missing RLS policies for seller_verifications table
-- Run this in Supabase SQL Editor → New query → Run

-- 1. Make sure RLS is enabled
ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own verification"   ON seller_verifications;
DROP POLICY IF EXISTS "Users can submit verification"     ON seller_verifications;
DROP POLICY IF EXISTS "Users can update own verification" ON seller_verifications;
DROP POLICY IF EXISTS "Admins can view all verifications" ON seller_verifications;
DROP POLICY IF EXISTS "Admins can update verifications"   ON seller_verifications;

-- 3. SELECT: users see their own record; admins see all
CREATE POLICY "Users can view own verification"
  ON seller_verifications FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 4. INSERT: authenticated users can submit their own verification
CREATE POLICY "Users can submit verification"
  ON seller_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. UPDATE: users can re-submit (update their own pending record); admins can approve/reject any
CREATE POLICY "Users can update own verification"
  ON seller_verifications FOR UPDATE
  USING (
    (auth.uid() = user_id AND status IN ('pending', 'rejected'))
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    (auth.uid() = user_id AND status IN ('pending', 'rejected'))
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 6. DELETE: admins only
CREATE POLICY "Admins can delete verifications"
  ON seller_verifications FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
