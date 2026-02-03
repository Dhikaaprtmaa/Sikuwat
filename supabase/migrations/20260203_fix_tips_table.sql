-- Fix tips table structure to ensure proper data persistence
-- Add missing created_by column if it doesn't exist

-- First, add created_by column if it doesn't exist
ALTER TABLE public.tips 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON public.tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_category ON public.tips(category);

-- Ensure RLS is enabled
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users read tips" ON public.tips;
DROP POLICY IF EXISTS "Admin insert tips" ON public.tips;
DROP POLICY IF EXISTS "Admin update tips" ON public.tips;
DROP POLICY IF EXISTS "Admin delete tips" ON public.tips;

-- Create new RLS policies (allow anon users to read, authenticated to insert)
CREATE POLICY "Users read tips" ON public.tips
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users insert tips" ON public.tips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

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

-- Grant permissions to ensure proper access
GRANT SELECT ON public.tips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tips TO authenticated;

