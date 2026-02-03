-- Fix tips table structure to ensure proper data persistence
-- Ensure tips table has correct columns and constraints

-- Check if tips table exists, if not create it
CREATE TABLE IF NOT EXISTS public.tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON public.tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_category ON public.tips(category);

-- Ensure RLS is enabled
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users read tips" ON public.tips;
DROP POLICY IF EXISTS "Admin insert tips" ON public.tips;
DROP POLICY IF EXISTS "Admin update tips" ON public.tips;
DROP POLICY IF EXISTS "Admin delete tips" ON public.tips;

-- Create new RLS policies
CREATE POLICY "Users read tips" ON public.tips
  FOR SELECT USING (true);

CREATE POLICY "Admin insert tips" ON public.tips
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.admin_users)
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "Admin update tips" ON public.tips
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.admin_users)
    OR created_by = auth.uid()
  );

CREATE POLICY "Admin delete tips" ON public.tips
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.admin_users)
    OR created_by = auth.uid()
  );

-- Grant permissions
GRANT SELECT ON public.tips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tips TO authenticated;
