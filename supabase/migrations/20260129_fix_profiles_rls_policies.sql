-- FIX: RLS Policies untuk Profiles Table
-- Problem: Admin tidak bisa akses pending users karena RLS policy terlalu ketat

-- LANGKAH 1: Create profiles table jika belum ada
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LANGKAH 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role_approved ON public.profiles(role, is_approved);

-- LANGKAH 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- LANGKAH 4: Drop policies lama yang mungkin conflict
DROP POLICY IF EXISTS "Users can view own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert on signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow any authenticated user to insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- LANGKAH 5: Create NEW RLS policies yang benar

-- SELECT: Users dapat melihat profile mereka sendiri
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- SELECT: Admins dapat melihat SEMUA profiles (untuk approval system)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR
    auth.uid() = id
  );

-- INSERT: Allow untuk signup (user insert profile mereka sendiri)
-- Menggunakan WITH CHECK (true) karena saat signup, auth.uid() mungkin sudah tersedia dari context
CREATE POLICY "Allow insert for signup"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- UPDATE: Users dapat update profile mereka sendiri
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- UPDATE: Admins dapat update semua profiles (untuk approval)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- DELETE: Admins dapat delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- LANGKAH 6: Set existing admin profiles to approved
UPDATE public.profiles 
SET is_approved = true 
WHERE role = 'admin' AND is_approved IS NULL;

-- LANGKAH 7: Verify
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- LANGKAH 8: Debug info
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_count,
  COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_count
FROM public.profiles;
