-- FIX: Tips RLS untuk memastikan admin bisa insert
-- Drop semua policy yang conflict di tips table

DROP POLICY IF EXISTS "allow_read_all" ON public.tips;
DROP POLICY IF EXISTS "allow_insert_auth" ON public.tips;
DROP POLICY IF EXISTS "allow_update_auth" ON public.tips;
DROP POLICY IF EXISTS "allow_delete_auth" ON public.tips;
DROP POLICY IF EXISTS "Admin insert tips" ON public.tips;
DROP POLICY IF EXISTS "Admin update tips" ON public.tips;
DROP POLICY IF EXISTS "Admin delete tips" ON public.tips;
DROP POLICY IF EXISTS "Users read tips" ON public.tips;

-- Recreate clean policies
-- 1. Anyone can READ tips
CREATE POLICY "Read tips - Public"
  ON public.tips FOR SELECT
  USING (true);

-- 2. Service Role (via edge function) dapat INSERT
-- Kita izinkan auth user dengan role admin dapat insert
CREATE POLICY "Insert tips - Admin"
  ON public.tips FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.admin_users)
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 3. Update tips - only admin or owner
CREATE POLICY "Update tips - Admin or Owner"
  ON public.tips FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.admin_users)
    OR
    created_by = auth.uid()
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Delete tips - only admin or owner
CREATE POLICY "Delete tips - Admin or Owner"
  ON public.tips FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM public.admin_users)
    OR
    created_by = auth.uid()
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Verify policies
SELECT 
  policyname, 
  cmd, 
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tips'
ORDER BY policyname;
