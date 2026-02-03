-- Verify and fix tips table RLS policies
-- This script ensures tips are readable by everyone (anon and authenticated)

-- Check current policies
SELECT schemaname, tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'tips';

-- Drop all old policies first
DROP POLICY IF EXISTS "Users read tips" ON public.tips;
DROP POLICY IF EXISTS "Admin insert tips" ON public.tips;
DROP POLICY IF EXISTS "Admin update tips" ON public.tips;
DROP POLICY IF EXISTS "Admin delete tips" ON public.tips;
DROP POLICY IF EXISTS "Authenticated users insert tips" ON public.tips;

-- Create clean RLS policies for tips table
-- Policy 1: Everyone can read tips (SELECT for anon and authenticated)
CREATE POLICY "tips_select_public" ON public.tips
  FOR SELECT 
  USING (true);

-- Policy 2: Authenticated users can insert tips
CREATE POLICY "tips_insert_authenticated" ON public.tips
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Only admin or creator can update
CREATE POLICY "tips_update_own" ON public.tips
  FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM public.admin_users) OR created_by = auth.uid());

-- Policy 4: Only admin or creator can delete
CREATE POLICY "tips_delete_own" ON public.tips
  FOR DELETE 
  USING (auth.uid() IN (SELECT id FROM public.admin_users) OR created_by = auth.uid());

-- Verify RLS is enabled
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Test query to ensure it works
SELECT id, title, content, category, created_at 
FROM public.tips 
ORDER BY created_at DESC 
LIMIT 10;
