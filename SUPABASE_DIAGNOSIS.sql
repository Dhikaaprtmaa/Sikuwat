-- SUPABASE DIAGNOSIS & FIX (Step by Step)
-- Jalankan query ini satu per satu di Supabase SQL Editor

-- STEP 1: Check if profiles table exists and has data
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- STEP 2: Check table structure
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'profiles';

-- STEP 3: Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- STEP 4: Check all RLS policies on profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- STEP 5: Check example user in auth.users
SELECT id, email, created_at FROM auth.users LIMIT 1;

-- STEP 6: Check if that user has a profile
-- (Replace UUID with actual user ID from STEP 5)
-- SELECT * FROM profiles WHERE id = 'PUT_UUID_HERE';

-- STEP 7: Check plantings table structure
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'plantings';

-- STEP 8: Check RLS policies on plantings
SELECT * FROM pg_policies WHERE tablename = 'plantings';

-- ============================================
-- RECOMMENDED FAST FIX (Langsung Jalankan)
-- ============================================

-- Jika ingin cepat, jalankan blok ini di Supabase SQL Editor.
-- Ini hanya mengganti policy dan admin_user, tidak menghapus tabel data.

-- 1. Pastikan admin_users ada dan dapat dibaca
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone read admin users" ON public.admin_users;
CREATE POLICY "Anyone read admin users" ON public.admin_users
  FOR SELECT USING (true);

-- 2. Perbaiki policy profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_self" ON public.profiles
  FOR DELETE USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- 3. Perbaiki policy plantings
ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own plantings" ON public.plantings;
DROP POLICY IF EXISTS "Users can insert own plantings" ON public.plantings;
DROP POLICY IF EXISTS "Users can update own plantings" ON public.plantings;
DROP POLICY IF EXISTS "plantings_select_all" ON public.plantings;
DROP POLICY IF EXISTS "plantings_insert_all" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_all" ON public.plantings;

CREATE POLICY "plantings_select_self" ON public.plantings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plantings_insert_self" ON public.plantings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plantings_update_self" ON public.plantings
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Grant yang diperlukan
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.plantings TO authenticated;
GRANT SELECT ON public.plantings TO anon;

-- 5. Pastikan admin email terdaftar sebagai admin di admin_users
INSERT INTO public.admin_users (id, email)
SELECT id, email FROM auth.users WHERE email = 'admin@sikuwat.com'
ON CONFLICT DO NOTHING;

-- 6. Verifikasi policy
SELECT schemaname, tablename, policyname, permissive, roles, qual
  FROM pg_policies
  WHERE tablename IN ('profiles', 'plantings', 'admin_users')
  ORDER BY tablename, policyname;

-- 7. Cek profil user setelah login (ganti UUID_USER dengan id user)
-- SELECT * FROM public.profiles WHERE id = 'UUID_USER';
-- SELECT * FROM public.plantings WHERE user_id = 'UUID_USER';
