-- Sikuwat Database Schema
-- Migration file created by Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admin Users Table (untuk track siapa admin)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_id ON admin_users(id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Market Prices Table
CREATE TABLE IF NOT EXISTS market_prices (
  id TEXT PRIMARY KEY,
  commodity TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tips & Tricks Table
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles Table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  url TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plantings Table
CREATE TABLE IF NOT EXISTS plantings (
  id TEXT PRIMARY KEY,
  seed_type TEXT NOT NULL,
  seed_count INTEGER NOT NULL,
  planting_date DATE NOT NULL,
  harvest_date DATE,
  harvest_yield DECIMAL(10,2),
  sales_amount DECIMAL(10,2),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_tips_category ON tips(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plantings_user_id ON plantings(user_id);
CREATE INDEX IF NOT EXISTS idx_plantings_created_at ON plantings(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Anyone can read admin users" ON admin_users
  FOR SELECT USING (true);

-- RLS Policies for market_prices
CREATE POLICY "Users read market prices" ON market_prices
  FOR SELECT USING (true);

CREATE POLICY "Admin insert market prices" ON market_prices
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admin update market prices" ON market_prices
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admin delete market prices" ON market_prices
  FOR DELETE USING (auth.uid() IN (SELECT id FROM admin_users));

-- RLS Policies for tips
CREATE POLICY "Users read tips" ON tips
  FOR SELECT USING (true);

CREATE POLICY "Admin insert tips" ON tips
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admin update tips" ON tips
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admin delete tips" ON tips
  FOR DELETE USING (auth.uid() IN (SELECT id FROM admin_users));

-- RLS Policies for articles
CREATE POLICY "Users read articles" ON articles
  FOR SELECT USING (true);

CREATE POLICY "Admin insert articles" ON articles
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admin update articles" ON articles
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admin delete articles" ON articles
  FOR DELETE USING (auth.uid() IN (SELECT id FROM admin_users));

-- RLS Policies for plantings
-- Users can read their own plantings
CREATE POLICY "Users read own plantings" ON plantings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert plantings
CREATE POLICY "Users insert plantings" ON plantings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own plantings
CREATE POLICY "Users update own plantings" ON plantings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own plantings
CREATE POLICY "Users delete own plantings" ON plantings
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can read ALL plantings
CREATE POLICY "Admin read all plantings" ON plantings
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- Admin can update any plantings
CREATE POLICY "Admin update all plantings" ON plantings
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM admin_users));

-- Admin can delete any plantings
CREATE POLICY "Admin delete all plantings" ON plantings
  FOR DELETE USING (auth.uid() IN (SELECT id FROM admin_users));
    )
  );

-- Admin can delete any plantings
CREATE POLICY "Admin delete any plantings" ON plantings
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE user_metadata->>'role' = 'admin' OR user_metadata->>'is_admin' = 'true'
    )
  );