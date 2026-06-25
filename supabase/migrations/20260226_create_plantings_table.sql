-- Create plantings table (run this SECOND)
CREATE TABLE IF NOT EXISTS public.plantings (
  id TEXT PRIMARY KEY,
  seed_type TEXT NOT NULL,
  seed_count INTEGER NOT NULL,
  planting_date DATE NOT NULL,
  target_harvest_date DATE,
  harvest_date DATE,
  harvest_yield DECIMAL(10,2),
  sales_amount DECIMAL(10,2),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Pengguna',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plantings_user_id ON public.plantings(user_id);
CREATE INDEX IF NOT EXISTS idx_plantings_target_harvest_date ON public.plantings(target_harvest_date);
CREATE INDEX IF NOT EXISTS idx_plantings_created_at ON public.plantings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plantings_harvest_date ON public.plantings(harvest_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "plantings_select_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_insert_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_delete_self" ON public.plantings;
DROP POLICY IF EXISTS "plantings_select_admin" ON public.plantings;
DROP POLICY IF EXISTS "plantings_update_admin" ON public.plantings;
DROP POLICY IF EXISTS "plantings_delete_admin" ON public.plantings;

-- RLS Policies for plantings
-- User can SELECT their own plantings (no is_approved check for SELECT)
CREATE POLICY "plantings_select_self" ON public.plantings
  FOR SELECT USING (auth.uid() = user_id);

-- User can INSERT plantings only if approved
CREATE POLICY "plantings_insert_self" ON public.plantings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

-- User can UPDATE their own plantings only if approved
CREATE POLICY "plantings_update_self" ON public.plantings
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

-- User can DELETE their own plantings only if approved
CREATE POLICY "plantings_delete_self" ON public.plantings
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_approved = true
    )
  );

-- Admin can SELECT all plantings
CREATE POLICY "plantings_select_admin" ON public.plantings
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Admin can UPDATE all plantings
CREATE POLICY "plantings_update_admin" ON public.plantings
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Admin can DELETE all plantings
CREATE POLICY "plantings_delete_admin" ON public.plantings
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Grant permissions
GRANT ALL ON public.plantings TO authenticated;
GRANT SELECT ON public.plantings TO anon;
