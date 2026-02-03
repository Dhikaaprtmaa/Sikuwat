-- Debug script: Check tips data and schema

-- 1. Check tips table structure
\d public.tips

-- 2. Check all data in tips table
SELECT id, title, content, category, created_by, created_at 
FROM public.tips 
ORDER BY created_at DESC;

-- 3. Count tips
SELECT COUNT(*) as total_tips FROM public.tips;

-- 4. Check RLS policies on tips
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'tips'
ORDER BY policyname;

-- 5. Test SELECT with service role (should return all)
-- Run this as service role user
SELECT id, title, content FROM public.tips LIMIT 10;

-- 6. Check admin_users (to verify RLS admin check)
SELECT id, email FROM public.admin_users;

-- 7. Verify RLS is actually enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tips';
