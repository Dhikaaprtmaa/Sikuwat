-- Add is_approved column to profiles table for account approval system
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN profiles.is_approved IS 'User account approval status - must be true for users to login';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
