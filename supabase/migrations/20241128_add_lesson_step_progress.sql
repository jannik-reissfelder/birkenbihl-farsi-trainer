-- Create lesson_step_progress table to track granular progress within lessons
CREATE TABLE IF NOT EXISTS lesson_step_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    decode_sentence_index INTEGER DEFAULT 0,
    decode_answers JSONB DEFAULT '{}'::jsonb,
    decode_completed BOOLEAN DEFAULT FALSE,
    decode_completed_at TIMESTAMPTZ,
    karaoke_completed BOOLEAN DEFAULT FALSE,
    karaoke_completed_at TIMESTAMPTZ,
    lesson_completed BOOLEAN DEFAULT FALSE,
    lesson_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE lesson_step_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own progress
CREATE POLICY "Users can view own progress" ON lesson_step_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON lesson_step_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress" ON lesson_step_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress" ON lesson_step_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lesson_step_progress_user_id ON lesson_step_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_step_progress_lesson_completed ON lesson_step_progress(user_id, lesson_completed);
