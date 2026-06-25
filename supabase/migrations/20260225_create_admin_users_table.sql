-- Create admin_users table (run this FIRST)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_id ON public.admin_users(id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone read admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Anyone can read admin users" ON public.admin_users;

-- RLS Policies for admin_users
CREATE POLICY "Anyone read admin users" ON public.admin_users
  FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON public.admin_users TO authenticated, anon;
