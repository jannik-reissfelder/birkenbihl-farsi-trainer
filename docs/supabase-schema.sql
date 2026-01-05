-- ================================================================
-- BIRKENBIHL FARSI TRAINER - SUPABASE DATABASE SCHEMA
-- ================================================================
-- Run this SQL in your Supabase SQL Editor (Database → SQL Editor)
-- This creates all tables with Row Level Security for multi-user support
-- 
-- NOTE: This is the base schema. For conversation memory feature,
-- also run: supabase/migrations/20260103_add_free_speaking_sessions.sql
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. USER PROFILES
-- ================================================================
-- Extends Supabase auth.users with additional profile data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. LESSON PROGRESS
-- ================================================================
-- Tracks user progress through lessons (replaces localStorage progress)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  sentence_index INT DEFAULT 0,
  completed_sentences JSONB DEFAULT '[]'::jsonb,
  xp INT DEFAULT 0,
  last_practice TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ================================================================
-- 3. VOCABULARY CARDS
-- ================================================================
-- Stores user's marked vocabulary with SRS scheduling
CREATE TABLE IF NOT EXISTS public.vocabulary_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  farsi_word TEXT NOT NULL,
  latin_word TEXT,
  context JSONB NOT NULL,
  lesson_id TEXT,
  level_id TEXT,
  state TEXT DEFAULT 'new' CHECK (state IN ('new', 'learning', 'graduated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed TIMESTAMPTZ,
  next_review TIMESTAMPTZ,
  repetitions INT DEFAULT 0,
  consecutive_successes INT DEFAULT 0,
  interval INT DEFAULT 0,
  ease_factor NUMERIC DEFAULT 2.5,
  review_counts JSONB DEFAULT '{"easy":0,"good":0,"hard":0,"again":0}'::jsonb
);

-- ================================================================
-- 4. SRS REVIEW HISTORY
-- ================================================================
-- Tracks every SRS review for analytics
CREATE TABLE IF NOT EXISTS public.srs_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES public.vocabulary_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('again', 'hard', 'good', 'easy')),
  success BOOLEAN NOT NULL,
  interval INT,
  ease_factor NUMERIC
);

-- ================================================================
-- 5. GAMIFICATION STATS
-- ================================================================
-- Stores XP, levels, streaks (replaces localStorage gamification)
CREATE TABLE IF NOT EXISTS public.gamification_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_total INT DEFAULT 0,
  level INT DEFAULT 1,
  streak INT DEFAULT 0,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  xp_per_level JSONB DEFAULT '{"1":0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ================================================================
-- This ensures users can ONLY access their own data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srs_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_stats ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES - PROFILES
-- ================================================================
CREATE POLICY "Users can read own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ================================================================
-- RLS POLICIES - LESSON PROGRESS
-- ================================================================
CREATE POLICY "Users manage own progress" 
  ON public.lesson_progress FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- RLS POLICIES - VOCABULARY CARDS
-- ================================================================
CREATE POLICY "Users manage own vocabulary" 
  ON public.vocabulary_cards FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- RLS POLICIES - SRS REVIEWS
-- ================================================================
CREATE POLICY "Users manage own reviews" 
  ON public.srs_reviews FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- RLS POLICIES - GAMIFICATION STATS
-- ================================================================
CREATE POLICY "Users manage own stats" 
  ON public.gamification_stats FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- AUTO-CREATE PROFILE & STATS ON SIGNUP
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Initialize gamification stats
  INSERT INTO public.gamification_stats (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ================================================================
-- PERFORMANCE INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_vocab_user ON public.vocabulary_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_next_review ON public.vocabulary_cards(user_id, next_review) 
  WHERE state != 'graduated';
CREATE INDEX IF NOT EXISTS idx_vocab_state ON public.vocabulary_cards(user_id, state);

CREATE INDEX IF NOT EXISTS idx_srs_reviews_card ON public.srs_reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_srs_reviews_user ON public.srs_reviews(user_id);

-- ================================================================
-- COMPLETE! 
-- ================================================================
-- Your database is now ready for multi-user authentication
-- Next steps:
-- 1. Copy your Supabase URL and anon key
-- 2. Add them to your environment variables as:
--    - VITE_SUPABASE_URL
--    - VITE_SUPABASE_ANON_KEY
-- ================================================================
