-- SUPABASE DIAGNOSTIC QUERY
-- Jalankan query ini satu per satu untuk diagnosis masalah

-- 1. CEK STRUKTUR TABEL PLANTINGS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'plantings'
ORDER BY ordinal_position;

-- 2. CEK RLS POLICY AKTIF PADA PLANTINGS
SELECT * FROM pg_policies WHERE tablename = 'plantings' ORDER BY policyname;

-- 3. CEK AUTENTIKASI USER
SELECT auth.uid() as current_user_id;

-- 4. HITUNG TOTAL PLANTINGS DI DATABASE
SELECT COUNT(*) as total_plantings FROM public.plantings;

-- 5. HITUNG PLANTINGS BELUM DIPANEN (harvest_date IS NULL)
SELECT COUNT(*) as plantings_to_harvest FROM public.plantings WHERE harvest_date IS NULL;

-- 6. LIHAT DETAIL PLANTINGS YANG ADA
SELECT id, user_id, seed_type, seed_count, planting_date, harvest_date, user_name, created_at
FROM public.plantings
ORDER BY created_at DESC
LIMIT 10;

-- 7. CEK APAKAH HARVEST_DATE COLUMN NULLABLE
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'plantings' AND column_name = 'harvest_date';

-- 8. CEK apakah ada data dengan harvest_date null
SELECT id, user_id, harvest_date FROM public.plantings WHERE harvest_date IS NULL LIMIT 5;

-- 9. TEST RLS - lihat apakah current user bisa select dari plantings mereka sendiri
SELECT id, user_id, seed_type FROM public.plantings WHERE user_id = auth.uid() LIMIT 5;

-- 10. Lihat semua INDEX pada plantings
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'plantings';
