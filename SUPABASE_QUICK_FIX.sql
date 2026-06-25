-- SOLUSI PRIORITAS: Login Permission Error
-- Error: "permission denied for table users"
--
-- PENYEBAB UTAMA:
-- 1. RLS policy pada profiles table terlalu ketat
-- 2. User tidak ter-authenticate saat query
-- 3. Anon role tidak punya permission
--
-- SOLUSI:

-- ===== LANGKAH 1: Disable RLS temporary untuk test =====
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE plantings DISABLE ROW LEVEL SECURITY;

-- Verify (should work now for login)
-- Jika bisa login sekarang, masalahnya RLS
-- Jika tetap error, masalahnya di tempat lain

-- ===== LANGKAH 2: Jika RLS harus ON, buat policy minimal =====
-- Untuk profile table - yang paling permissive
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON profiles;

-- Create VERY PERMISSIVE policies (for debugging)
CREATE POLICY "allow_all_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON profiles FOR UPDATE USING (true);

-- ===== LANGKAH 3: Jika sudah login, enable proper RLS =====
-- Baru setelah berhasil login, jalankan script SUPABASE_FIX_LOGIN_PROFILES.sql

-- ===== LANGKAH 4: Check if admin_users table exists =====
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== LANGKAH 5: Test dengan user real =====
-- Cek user yang ada
SELECT id, email FROM auth.users;

-- Cek apakah ada profile
SELECT id, email, name FROM profiles;

-- ===== LANGKAH 6: Buat test user profile jika tidak ada =====
-- INSERT INTO profiles (id, email, name, role, is_approved) 
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'user@example.com'),
--   'user@example.com',
--   'Test User',
--   'user',
--   false
-- );

-- ===== LANGKAH 7: Jika perlu debug lebih lanjut =====
-- Lihat real-time logs
-- SELECT * FROM auth.audit_log_entries ORDER BY created_at DESC LIMIT 20;
