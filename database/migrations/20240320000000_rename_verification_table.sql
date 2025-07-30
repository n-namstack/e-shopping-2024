-- Drop existing table if it exists
DROP TABLE IF EXISTS public.seller_verifications CASCADE;

-- Create the seller_verifications table
CREATE TABLE public.seller_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    national_id_url text,
    selfie_url text,
    business_type text,
    has_physical_store boolean DEFAULT false,
    physical_address text,
    additional_info text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    submitted_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create storage policies for verification documents if they don't exist
DO $$ 
BEGIN
    -- Check and create upload policy
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can upload their own verification documents'
    ) THEN
        CREATE POLICY "Users can upload their own verification documents"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;

    -- Check and create view policy
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can view their own verification documents'
    ) THEN
        CREATE POLICY "Users can view their own verification documents"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;

-- Update the shops table to reference seller verifications
DO $$ 
BEGIN
    -- Only add verification_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shops' 
        AND column_name = 'verification_id'
    ) THEN
        ALTER TABLE public.shops
        ADD COLUMN verification_id uuid REFERENCES public.seller_verifications(id);
    END IF;
END $$;

-- Create a function to update shop verification status
CREATE OR REPLACE FUNCTION update_shop_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    UPDATE public.shops
    SET verification_status = 'verified'
    WHERE owner_id = NEW.user_id;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.shops
    SET verification_status = 'unverified'
    WHERE owner_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update shop verification status
DROP TRIGGER IF EXISTS on_seller_verification_update ON public.seller_verifications;
CREATE TRIGGER on_seller_verification_update
AFTER UPDATE ON public.seller_verifications
FOR EACH ROW
EXECUTE FUNCTION update_shop_verification_status();

-- Note: After running this migration, you need to:
-- 1. Restart your Supabase project
-- 2. Restart your React Native app to ensure the changes are reflected 