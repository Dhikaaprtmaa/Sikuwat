-- SUPABASE CLEAN POLICIES & VERIFY
-- Jalankan seluruh query ini di Supabase SQL Editor.
-- Ini akan menghapus semua policy lama pada profiles dan plantings,
-- kemudian membuat ulang policy yang benar dan menambahkan admin_users.

BEGIN;

-- 1. Pastikan admin_users ada
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_users;', r.policyname);
  END LOOP;
END$$;
CREATE POLICY "Anyone read admin users" ON public.admin_users
  FOR SELECT USING (true);

-- 2. Hapus semua policy lama pada profiles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', r.policyname);
  END LOOP;
END$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

-- 3. Hapus semua policy lama pada plantings
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plantings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.plantings;', r.policyname);
  END LOOP;
END$$;

ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plantings_select_self" ON public.plantings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plantings_insert_self" ON public.plantings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plantings_update_self" ON public.plantings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plantings_delete_self" ON public.plantings
  FOR DELETE USING (auth.uid() = user_id);

-- 3b. Pastikan user_name tidak null
ALTER TABLE public.plantings ALTER COLUMN user_name SET DEFAULT 'Pengguna';
UPDATE public.plantings SET user_name = 'Pengguna' WHERE user_name IS NULL;

-- 4. Grant yang diperlukan
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.plantings TO authenticated;
GRANT SELECT ON public.plantings TO anon;

-- 5. Tambahkan admin default
INSERT INTO public.admin_users (id, email)
SELECT id, email FROM auth.users WHERE email = 'admin@sikuwat.com'
ON CONFLICT DO NOTHING;

-- 6. Verifikasi
SELECT schemaname, tablename, policyname, permissive, roles, qual
  FROM pg_policies
  WHERE tablename IN ('profiles', 'plantings', 'admin_users')
  ORDER BY tablename, policyname;

-- 7. Cek apakah data sudah masuk di plantings
-- Ganti UUID_USER dengan id user yang login
-- SELECT * FROM public.plantings WHERE user_id = 'UUID_USER' ORDER BY created_at DESC LIMIT 20;
-- SELECT COUNT(*) FROM public.plantings WHERE user_id = 'UUID_USER';

COMMIT;
