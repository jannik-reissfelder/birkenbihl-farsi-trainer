-- ================================================================
-- FREE SPEAKING SESSIONS - CONVERSATION MEMORY
-- ================================================================
-- Migration: Add conversation memory for free speaking mode
-- Date: 2026-01-03
-- ================================================================

-- Create free_speaking_sessions table
CREATE TABLE IF NOT EXISTS public.free_speaking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  summary TEXT,
  topics_discussed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.free_speaking_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only access their own sessions
CREATE POLICY "Users manage own free speaking sessions" 
  ON public.free_speaking_sessions FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance index for querying recent sessions
CREATE INDEX IF NOT EXISTS idx_free_speaking_user_ended 
  ON public.free_speaking_sessions(user_id, ended_at DESC);

-- ================================================================
-- COMPLETE!
-- ================================================================
-- This table will store conversation summaries for free speaking mode
-- to provide continuity across daily practice sessions.
-- ================================================================
