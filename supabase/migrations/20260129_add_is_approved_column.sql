-- Add is_approved column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Set existing admin profiles to approved
UPDATE profiles 
SET is_approved = true 
WHERE role = 'admin';

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role_approved ON profiles(role, is_approved);
