-- SUPABASE FIX: Login & Profiles RLS Policies
-- Jalankan query ini di Supabase SQL Editor untuk memperbaiki masalah login

-- 1. Cek struktur profiles table (jalankan dulu untuk lihat exist atau tidak)
-- SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- 2. Drop existing RLS policies on profiles (jika ada)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON profiles;

-- 3. Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create new RLS policies for profiles
-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Policy: Admin can read all profiles
CREATE POLICY "Admin read all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM admin_users
    )
  );

-- Policy: Admin can update all profiles (for approval)
CREATE POLICY "Admin update all profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM admin_users
    )
  );

-- 6. Grant necessary permissions to anon role (public access for auth)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO anon;

-- 7. Grant permissions to authenticated role
GRANT ALL ON public.profiles TO authenticated;

-- 8. Verify admin_users exists and has proper structure
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read admin users" ON admin_users FOR SELECT USING (true);

-- 9. Insert your admin email (replace with your actual admin email)
-- DELETE FROM admin_users WHERE email = 'admin@example.com';
-- INSERT INTO admin_users (id, email) VALUES (
--   (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
--   'admin@example.com'
-- );

-- 10. Verify plantings table RLS is correct
ALTER TABLE plantings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own plantings" ON plantings;
DROP POLICY IF EXISTS "Users can insert own plantings" ON plantings;
DROP POLICY IF EXISTS "Users can update own plantings" ON plantings;

CREATE POLICY "Users can read own plantings" ON plantings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plantings" ON plantings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plantings" ON plantings
  FOR UPDATE USING (auth.uid() = user_id);

-- 11. Grant necessary permissions on plantings
GRANT ALL ON public.plantings TO authenticated;
GRANT SELECT ON public.plantings TO anon;

-- 12. Verify all tables have proper RLS
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
