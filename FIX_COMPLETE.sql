-- ==========================================
-- COMPLETE FIX - RUN THIS ALL AT ONCE
-- Copy seluruh file ini dan jalankan di Supabase SQL Editor
-- ==========================================

BEGIN;

-- 1. Reset profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Pengguna',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_approved ON public.profiles(is_approved);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', r.policyname);
  END LOOP;
END$$;

-- Create policies
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_signup" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (auth.uid() IN (SELECT id FROM public.admin_users));

GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;

-- 2. Insert/update all users from auth.users to profiles (with is_approved = true)
INSERT INTO public.profiles (id, email, name, role, is_approved)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'Pengguna'), 'user', true
FROM auth.users
WHERE email NOT IN (SELECT email FROM public.profiles)
ON CONFLICT (email) DO UPDATE
SET is_approved = true, name = EXCLUDED.name;

-- 3. Ensure admin user is approved
UPDATE public.profiles 
SET is_approved = true, role = 'admin'
WHERE email = 'admin@sikuwat.com';

-- 4. Verify plantings table exists
CREATE TABLE IF NOT EXISTS public.plantings (
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

-- 5. Reset plantings RLS policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plantings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.plantings;', r.policyname);
  END LOOP;
END$$;

-- Create new plantings policies (no is_approved check for SELECT)
CREATE POLICY "plantings_select_self" ON public.plantings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plantings_insert_self" ON public.plantings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plantings_update_self" ON public.plantings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plantings_delete_self" ON public.plantings FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "plantings_select_admin" ON public.plantings FOR SELECT USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "plantings_update_admin" ON public.plantings FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "plantings_delete_admin" ON public.plantings FOR DELETE USING (auth.uid() IN (SELECT id FROM public.admin_users));

GRANT ALL ON public.plantings TO authenticated;
GRANT SELECT ON public.plantings TO anon;

-- 6. Verify
SELECT 'Setup complete! Check results below:' as status;

SELECT COUNT(*) as profiles_count FROM public.profiles;
SELECT COUNT(*) as plantings_count FROM public.plantings;

SELECT email, role, is_approved FROM public.profiles ORDER BY created_at DESC LIMIT 10;

COMMIT;
