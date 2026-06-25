-- SIKUWAT DATABASE SETUP - RUN ALL AT ONCE
-- Copy semua isi file ini dan jalankan di Supabase SQL Editor

BEGIN;

-- ==========================================
-- 1. ADMIN_USERS TABLE
-- ==========================================
DROP TABLE IF EXISTS public.admin_users CASCADE;

CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_id ON public.admin_users(id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read admin users" ON public.admin_users;
CREATE POLICY "Anyone read admin users" ON public.admin_users
  FOR SELECT USING (true);

GRANT SELECT ON public.admin_users TO authenticated, anon;

-- ==========================================
-- 2. PLANTINGS TABLE
-- ==========================================
DROP TABLE IF EXISTS public.plantings CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_plantings_user_id ON public.plantings(user_id);
CREATE INDEX IF NOT EXISTS idx_plantings_created_at ON public.plantings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plantings_harvest_date ON public.plantings(harvest_date);

ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plantings_select_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_insert_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_delete_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_select_admin" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_admin" ON public.plantings;
DROP POLICY IF EXISTS "plantings_delete_admin" ON public.plantings;

CREATE POLICY "plantings_select_self" ON public.plantings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plantings_insert_self" ON public.plantings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

CREATE POLICY "plantings_update_self" ON public.plantings
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

CREATE POLICY "plantings_delete_self" ON public.plantings
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

CREATE POLICY "plantings_select_admin" ON public.plantings
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.admin_users));

CREATE POLICY "plantings_update_admin" ON public.plantings
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.admin_users));

CREATE POLICY "plantings_delete_admin" ON public.plantings
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.admin_users));

GRANT ALL ON public.plantings TO authenticated;
GRANT SELECT ON public.plantings TO anon;

-- ==========================================
-- 3. PROFILES TABLE
-- ==========================================
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role_approved ON public.profiles(role, is_approved);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_signup" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_signup" ON public.profiles
  FOR INSERT WITH CHECK (true);

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

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.admin_users));

GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;

-- ==========================================
-- 4. ALTER EXISTING TABLES IF NEEDED
-- ==========================================
-- Jika plantings sudah ada, tambahkan kolom yang mungkin hilang:
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plantings') THEN
    ALTER TABLE public.plantings ALTER COLUMN user_name SET DEFAULT 'Pengguna';
  END IF;
END $$;

-- ==========================================
-- 5. VERIFY SETUP
-- ==========================================
SELECT 'Tables created successfully!' as status;

SELECT schemaname, tablename, policyname 
  FROM pg_policies 
  WHERE tablename IN ('profiles', 'plantings', 'admin_users')
  ORDER BY tablename, policyname;

COMMIT;
