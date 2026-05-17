-- Add expo_push_token column to profiles table for push notifications
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
