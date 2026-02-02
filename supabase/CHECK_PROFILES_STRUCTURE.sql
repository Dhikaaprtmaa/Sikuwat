-- Test script: Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_name = 'profiles'
ORDER BY 
  ordinal_position;

-- Check if is_approved column exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'profiles' 
  AND column_name = 'is_approved'
) as is_approved_exists;
