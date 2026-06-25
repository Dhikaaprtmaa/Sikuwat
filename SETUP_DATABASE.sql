-- ==========================================
-- COMPLETE DATABASE SETUP SCRIPT
-- Jalankan SEMUANYA di Supabase SQL Editor
-- ==========================================

-- Step 1: Drop all RLS policies on profiles if table exists
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_signup" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- Step 2: Drop all RLS policies on plantings if table exists
DROP POLICY IF EXISTS "plantings_select_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_insert_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_delete_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_select_admin" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_admin" ON public.plantings;
DROP POLICY IF EXISTS "plantings_delete_admin" ON public.plantings;

-- Step 3: Drop admin_users table if exists
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- Step 4: Drop tables
DROP TABLE IF EXISTS public.plantings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 5: Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Pengguna',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_approved ON public.profiles(is_approved);

-- Step 7: Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create profiles RLS policies
CREATE POLICY "profiles_select_self" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_signup" ON public.profiles 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_self" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Step 9: Create admin_users table
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 10: Create plantings table
CREATE TABLE public.plantings (
  id TEXT PRIMARY KEY,
  seed_type TEXT NOT NULL,
  seed_count INTEGER NOT NULL,
  planting_date DATE NOT NULL,
  harvest_date DATE,
  harvest_yield DECIMAL(10,2),
  sales_amount DECIMAL(10,2),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Pengguna',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 11: Create indexes on plantings
CREATE INDEX idx_plantings_user_id ON public.plantings(user_id);
CREATE INDEX idx_plantings_harvest_date ON public.plantings(harvest_date);
CREATE INDEX idx_plantings_created_at ON public.plantings(created_at);

-- Step 12: Enable RLS on plantings
ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;

-- Step 13: Create plantings RLS policies
CREATE POLICY "plantings_select_self" ON public.plantings 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plantings_insert_self" ON public.plantings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plantings_update_self" ON public.plantings 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "plantings_delete_self" ON public.plantings 
  FOR DELETE USING (auth.uid() = user_id);

-- Step 14: Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;

GRANT ALL ON public.plantings TO authenticated;
GRANT SELECT ON public.plantings TO anon;

GRANT ALL ON public.admin_users TO authenticated;
GRANT SELECT ON public.admin_users TO anon;

-- Step 15: Insert all auth users into profiles
INSERT INTO public.profiles (id, email, name, role, is_approved)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Pengguna'), 
  'user', 
  true
FROM auth.users
WHERE email NOT IN (SELECT email FROM public.profiles)
ON CONFLICT DO NOTHING;

-- Step 16: Set admin user
INSERT INTO public.admin_users (id, email)
SELECT id, email FROM auth.users WHERE email = 'admin@sikuwat.com'
ON CONFLICT DO NOTHING;

UPDATE public.profiles 
SET role = 'admin', is_approved = true
WHERE email = 'admin@sikuwat.com';

-- Step 17: Verify setup
SELECT 'SETUP COMPLETE! Hasil:' as info;
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as total_plantings FROM public.plantings;
SELECT COUNT(*) as total_admins FROM public.admin_users;

SELECT '--- Daftar User ---' as users;
SELECT id, email, name, role, is_approved, created_at FROM public.profiles ORDER BY created_at DESC;

SELECT '--- Admin Users ---' as admins;
SELECT id, email FROM public.admin_users;
