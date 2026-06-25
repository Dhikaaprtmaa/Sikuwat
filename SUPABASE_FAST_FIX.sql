-- SUPABASE FAST FIX
-- Jalankan seluruh query ini di Supabase SQL Editor.
-- Pastikan memilih semua baris dan klik Run Selected.
-- Ini memperbaiki policy RLS untuk profiles dan plantings, lalu menambahkan admin_users.

BEGIN;

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
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert during signup" ON public.profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

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
DROP POLICY IF EXISTS "Users can delete own plantings" ON public.plantings;
DROP POLICY IF EXISTS "Admin read all plantings" ON public.plantings;
DROP POLICY IF EXISTS "Admin update all plantings" ON public.plantings;
DROP POLICY IF EXISTS "Admin delete all plantings" ON public.plantings;
DROP POLICY IF EXISTS "Admin delete any plantings" ON public.plantings;
DROP POLICY IF EXISTS "plantings_select_all" ON public.plantings;
DROP POLICY IF EXISTS "plantings_insert_all" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_all" ON public.plantings;
DROP POLICY IF EXISTS "plantings_select_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_insert_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_self" ON public.plantings;

CREATE POLICY "plantings_select_self" ON public.plantings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plantings_insert_self" ON public.plantings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plantings_update_self" ON public.plantings
  FOR UPDATE USING (auth.uid() = user_id);

-- 3b. Pastikan user_name mendapat default bila kolom tidak dikirim
ALTER TABLE public.plantings ALTER COLUMN user_name SET DEFAULT 'Pengguna';

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

COMMIT;
