-- Seed admin user for Sikuwat
-- Adds admin role to auth.user (if exists), creates a profiles entry, and inserts into admin_users
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  -- Ensure the user exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@sikuwat.com') THEN

    -- Set role in auth.users.user_metadata to 'admin'
    UPDATE auth.users
    SET user_metadata = (
      CASE
        WHEN user_metadata IS NULL THEN ('{"role":"admin"}')::jsonb
        ELSE (user_metadata::jsonb || ('{"role":"admin"}')::jsonb)
      END
    )
    WHERE email = 'admin@sikuwat.com';

    -- Insert or update profile in public.profiles
    INSERT INTO public.profiles (id, email, name, role, is_approved, created_at)
    SELECT id, email, 'SIKUWAT Admin', 'admin', true, NOW()
    FROM auth.users
    WHERE email = 'admin@sikuwat.com'
    ON CONFLICT (id) DO UPDATE
      SET role = EXCLUDED.role,
          is_approved = EXCLUDED.is_approved,
          email = EXCLUDED.email;

    -- Insert into admin_users if not present (references auth.users(id))
    INSERT INTO public.admin_users (id, email, created_at)
    SELECT id, email, NOW()
    FROM auth.users
    WHERE email = 'admin@sikuwat.com'
    ON CONFLICT (email) DO NOTHING;

  ELSE
    RAISE NOTICE 'No auth.user found with email admin@sikuwat.com - create the auth user first (via Supabase Auth or the /auth/signup endpoint).';
  END IF;
END
$$;

-- End of migration
