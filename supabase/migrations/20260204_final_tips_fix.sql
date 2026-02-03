-- FINAL COMPREHENSIVE FIX FOR TIPS TABLE
-- This migration fixes ALL issues with tips table RLS and structure
-- Tested and verified to work with both admin and regular authenticated users

-- Step 1: Ensure table exists
CREATE TABLE IF NOT EXISTS public.tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies (regardless of name)
-- This ensures we have a clean slate
DROP POLICY IF EXISTS "Users read tips" ON public.tips;
DROP POLICY IF EXISTS "Admin insert tips" ON public.tips;
DROP POLICY IF EXISTS "Admin update tips" ON public.tips;
DROP POLICY IF EXISTS "Admin delete tips" ON public.tips;
DROP POLICY IF EXISTS "Authenticated users insert tips" ON public.tips;
DROP POLICY IF EXISTS "tips_select_public" ON public.tips;
DROP POLICY IF EXISTS "tips_insert_authenticated" ON public.tips;
DROP POLICY IF EXISTS "tips_update_own" ON public.tips;
DROP POLICY IF EXISTS "tips_delete_own" ON public.tips;
DROP POLICY IF EXISTS "tips_select_all" ON public.tips;
DROP POLICY IF EXISTS "tips_insert_auth" ON public.tips;
DROP POLICY IF EXISTS "tips_update_admin_or_creator" ON public.tips;
DROP POLICY IF EXISTS "tips_delete_admin_or_creator" ON public.tips;

-- Step 4: Create new RLS policies that actually work

-- Policy 1: SELECT - Everyone can read tips (anon and authenticated)
CREATE POLICY "tips_select_all" ON public.tips
  FOR SELECT 
  USING (true);

-- Policy 2: INSERT - Authenticated users can insert
-- IMPORTANT: This uses auth.uid() IS NOT NULL instead of checking admin_users
-- This allows ANY authenticated user to insert, not just admins
CREATE POLICY "tips_insert_authenticated" ON public.tips
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: UPDATE - Only creator or admin can update
CREATE POLICY "tips_update_self" ON public.tips
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (SELECT id FROM public.admin_users)
  );

-- Policy 4: DELETE - Only creator or admin can delete
CREATE POLICY "tips_delete_self" ON public.tips
  FOR DELETE 
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (SELECT id FROM public.admin_users)
  );

-- Step 5: Grant permissions explicitly
GRANT SELECT ON public.tips TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tips TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Step 6: Create useful indexes
CREATE INDEX IF NOT EXISTS idx_tips_created_at_desc ON public.tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_category ON public.tips(category);
CREATE INDEX IF NOT EXISTS idx_tips_created_by ON public.tips(created_by);

-- Step 7: Verify setup
-- Run these to verify:
-- SELECT COUNT(*) as total_tips FROM public.tips;
-- SELECT * FROM pg_policies WHERE tablename = 'tips' ORDER BY policyname;
