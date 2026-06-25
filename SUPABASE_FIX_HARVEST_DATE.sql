-- FIX EXISTING DATA
-- Jalankan script ini untuk set harvest_date existing records ke NULL
-- Sehingga bisa muncul di InputPanen

UPDATE public.plantings
SET harvest_date = NULL
WHERE harvest_date IS NOT NULL
  AND id LIKE 'planting_%'
  AND created_at > NOW() - INTERVAL '7 days';

-- Verify hasilnya
SELECT COUNT(*) as plantings_now_unharvested 
FROM public.plantings 
WHERE harvest_date IS NULL;

SELECT id, seed_type, harvest_date 
FROM public.plantings 
ORDER BY created_at DESC 
LIMIT 5;
