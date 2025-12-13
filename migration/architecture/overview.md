# System Architecture Overview

**Document Version:** 1.1  
**Date:** December 2025

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      React 19 + TypeScript + Vite                    │   │
│  │                                                                      │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────────────┐│   │
│  │  │   Pages     │ │  Components  │ │       React Contexts           ││   │
│  │  │             │ │              │ │                                ││   │
│  │  │ - Dashboard │ │ - LessonView │ │ - AuthContext (Supabase)       ││   │
│  │  │ - LevelView │ │ - DecodeStep │ │ - VocabularyContext (SRS)      ││   │
│  │  │ - Lesson    │ │ - Karaoke    │ │ - GamificationContext (XP)     ││   │
│  │  │ - Analytics │ │ - SRSPractice│ │                                ││   │
│  │  │ - Practice  │ │ - Playlist   │ │                                ││   │
│  │  └─────────────┘ └──────────────┘ └────────────────────────────────┘│   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐│   │
│  │  │                        Custom Hooks                               ││   │
│  │  │  useDecodeController | useLessonStepProgress | useSentenceTokens ││   │
│  │  │  useDecodeAudio | useProgress                                     ││   │
│  │  └──────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│              ┌──────────────────────┼──────────────────────┐               │
│              │                      │                      │               │
│         API Calls              Browser APIs           Local Files          │
│              │                      │                      │               │
└──────────────┼──────────────────────┼──────────────────────┼───────────────┘
               │                      │                      │
               ▼                      ▼                      ▼
┌──────────────────────┐  ┌───────────────────┐  ┌────────────────────────────┐
│     SUPABASE         │  │    GEMINI API     │  │     PUBLIC ASSETS          │
│                      │  │                   │  │                            │
│ - PostgreSQL         │  │ - TTS Generation  │  │ - /public/audio/           │
│ - Auth (email/pass)  │  │ - Live API Chat   │  │ - /public/data/lessons/    │
│ - RLS Policies       │  │ - Text Generation │  │ - /public/data/toc.json    │
│ - Realtime (future)  │  │                   │  │                            │
└──────────────────────┘  └───────────────────┘  └────────────────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌───────────────────┐
│   Browser APIs       │  │  Audio Assets     │
│                      │  │                   │
│ - Web Audio API      │  │ - Pre-generated   │
│ - Speech Recognition │  │   .wav files      │
│ - AudioContext       │  │ - Cached TTS      │
└──────────────────────┘  └───────────────────┘
```

---

## Tech Stack Details

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework with hooks |
| TypeScript | Latest | Static typing |
| Vite | Latest | Build tool, dev server, HMR |
| Tailwind CSS | 3 | Utility-first styling |
| shadcn/ui | Latest | Accessible component library |
| Lucide React | Latest | Icons (via shadcn dependency) |

### Backend Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Database | Supabase PostgreSQL | All persistent data |
| Authentication | Supabase Auth | Email/password with verification |
| TTS | Google Gemini API | Farsi text-to-speech |
| Conversation AI | Gemini Live API | Real-time chat for Live Chat step |
| Text Generation | Gemini API | Dynamic hints, explanations |

### Client-Side APIs

| API | Purpose |
|-----|---------|
| Web Audio API | Audio playback and manipulation |
| Web Speech Recognition | Pronunciation feedback (shadowing) |
| AudioContext | Audio timing and synchronization |

---

## Database Schema (Complete)

### Tables Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE POSTGRESQL                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐     ┌──────────────────────────┐                  │
│  │    profiles     │     │    lesson_progress       │                  │
│  ├─────────────────┤     ├──────────────────────────┤                  │
│  │ id (PK, FK)     │     │ id (PK)                  │                  │
│  │ email           │     │ user_id (FK)             │                  │
│  │ display_name    │     │ lesson_id                │                  │
│  │ created_at      │     │ level_id                 │                  │
│  │ updated_at      │     │ sentence_index           │                  │
│  └─────────────────┘     │ completed_sentences      │                  │
│          │               │ xp                       │                  │
│          │               │ last_practice            │                  │
│          │               └──────────────────────────┘                  │
│          │                                                             │
│          │               ┌──────────────────────────┐                  │
│          │               │  lesson_step_progress    │                  │
│          │               ├──────────────────────────┤                  │
│          ▼               │ id (PK)                  │                  │
│  ┌─────────────────┐     │ user_id (FK)             │                  │
│  │ auth.users      │◄────│ lesson_id                │                  │
│  │ (Supabase)      │     │ decode_sentence_index    │                  │
│  └─────────────────┘     │ decode_answers (JSONB)   │                  │
│          │               │ decode_completed         │                  │
│          │               │ karaoke_completed        │                  │
│          │               │ lesson_completed         │                  │
│          │               │ created_at               │                  │
│          │               │ updated_at               │                  │
│          │               └──────────────────────────┘                  │
│          │                                                             │
│          │               ┌──────────────────────────┐                  │
│          │               │   vocabulary_cards       │                  │
│          │               ├──────────────────────────┤                  │
│          │               │ id (PK)                  │                  │
│          ├──────────────►│ user_id (FK)             │                  │
│          │               │ word (German)            │                  │
│          │               │ farsi_word               │                  │
│          │               │ latin_word               │                  │
│          │               │ context (JSONB)          │                  │
│          │               │ lesson_id                │                  │
│          │               │ state (new/learning/     │                  │
│          │               │        graduated)        │                  │
│          │               │ next_review              │                  │
│          │               │ interval                 │                  │
│          │               │ ease_factor              │                  │
│          │               │ repetitions              │                  │
│          │               │ review_counts (JSONB)    │                  │
│          │               └────────────┬─────────────┘                  │
│          │                            │                                │
│          │               ┌────────────▼─────────────┐                  │
│          │               │     srs_reviews          │                  │
│          │               ├──────────────────────────┤                  │
│          │               │ id (PK)                  │                  │
│          ├──────────────►│ card_id (FK)             │                  │
│          │               │ user_id (FK)             │                  │
│          │               │ reviewed_at              │                  │
│          │               │ difficulty               │                  │
│          │               │ success                  │                  │
│          │               │ interval                 │                  │
│          │               │ ease_factor              │                  │
│          │               └──────────────────────────┘                  │
│          │                                                             │
│          │               ┌──────────────────────────┐                  │
│          └──────────────►│   gamification_stats     │                  │
│                          ├──────────────────────────┤                  │
│                          │ user_id (PK, FK)         │                  │
│                          │ xp_total                 │                  │
│                          │ level                    │                  │
│                          │ streak                   │                  │
│                          │ last_login               │                  │
│                          │ xp_per_level (JSONB)     │                  │
│                          └──────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Tables Detail

#### lesson_step_progress (Per-Lesson Progress)
```sql
CREATE TABLE lesson_step_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lesson_id TEXT NOT NULL,
    decode_sentence_index INTEGER DEFAULT 0,  -- Current sentence in decode
    decode_answers JSONB DEFAULT '{}'::jsonb, -- Saved user answers
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
```

**Usage:** Auto-saves decode answers with 500ms debounce. Allows resuming at exact sentence.

#### vocabulary_cards (SRS Vocabulary)
```sql
CREATE TABLE vocabulary_cards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    word TEXT NOT NULL,              -- German translation
    farsi_word TEXT NOT NULL,        -- Persian script
    latin_word TEXT,                 -- Transliteration
    context JSONB NOT NULL,          -- Full sentence context
    lesson_id TEXT,                  -- Source lesson
    state TEXT DEFAULT 'new',        -- new/learning/graduated
    next_review TIMESTAMPTZ,         -- SM-2 scheduled review
    interval INT DEFAULT 0,          -- Days until next review
    ease_factor NUMERIC DEFAULT 2.5, -- SM-2 ease factor
    repetitions INT DEFAULT 0,
    review_counts JSONB              -- {easy:0, good:0, hard:0, again:0}
);
```

**Usage:** Words marked during Decode step. SM-2 algorithm manages spacing.

---

## Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data.

### Policy Pattern
```sql
CREATE POLICY "Users manage own [resource]" ON [table]
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Auto-Provisioning
On user signup, a database trigger automatically creates:
1. Profile record in `profiles`
2. Initial stats in `gamification_stats`

```sql
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (new.id, new.email);
  INSERT INTO gamification_stats (user_id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION FLOW                                │
└────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │  User Opens App     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  AuthContext checks │
                         │  Supabase session   │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            No Session                      Session Exists
                    │                               │
                    ▼                               ▼
         ┌─────────────────────┐      ┌─────────────────────┐
         │   AuthView.tsx      │      │     Dashboard       │
         │   (Login/Signup)    │      │  (Authenticated)    │
         └──────────┬──────────┘      └─────────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
      Login               Signup
          │                   │
          ▼                   ▼
   ┌──────────────┐   ┌──────────────────┐
   │  Supabase    │   │  Supabase Auth   │
   │  signIn()    │   │  signUp()        │
   └──────┬───────┘   │  + email verify  │
          │           └────────┬─────────┘
          │                    │
          ▼                    ▼
   ┌──────────────────────────────────────┐
   │     Session Created                  │
   │     AuthContext updates              │
   │     RLS policies now apply           │
   └──────────────────────────────────────┘
```

---

## Learning Session Data Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        LEARNING SESSION FLOW                                │
└────────────────────────────────────────────────────────────────────────────┘

User selects lesson
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          LessonView.tsx                                  │
│                                                                         │
│  1. Load Progress ──────────────────────────────────────────────────┐  │
│     │                                                                │  │
│     ▼                                                                │  │
│  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  useLessonStepProgress hook                                   │  │  │
│  │  - Query lesson_step_progress table                           │  │  │
│  │  - Restore decode_answers from JSONB                          │  │  │
│  │  - Resume at decode_sentence_index                            │  │  │
│  └───────────────────────────────────────────────────────────────┘  │  │
│                                                                      │  │
│  2. Learning Steps ◄─────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────────┐    │
│  │  DECODE  │ →  │ KARAOKE  │ →  │ SHADOWING │ →  │  LIVE CHAT   │    │
│  │          │    │          │    │           │    │              │    │
│  │ Fill in  │    │ Listen & │    │ Repeat    │    │ Converse     │    │
│  │ German   │    │ highlight│    │ aloud     │    │ with AI      │    │
│  └────┬─────┘    └────┬─────┘    └─────┬─────┘    └──────────────┘    │
│       │               │                │                               │
│       │               │                │                               │
│       ▼               ▼                ▼                               │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Progress Persistence                        │  │
│  │                                                                  │  │
│  │  - Auto-save decode answers (500ms debounce)                    │  │
│  │  - Update decode_sentence_index on navigation                   │  │
│  │  - Mark step_completed flags                                    │  │
│  │  - Award XP via GamificationContext                             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                               │                                        │
└───────────────────────────────┼────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Supabase            │
                    │   lesson_step_progress│
                    │   gamification_stats  │
                    └───────────────────────┘
```

---

## SRS Vocabulary Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          SRS VOCABULARY FLOW                                │
└────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │    Decode Step      │
                         │  User marks words   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  VocabularyContext  │
                         │     addCard()       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       vocabulary_cards        │
                    │  - farsi_word                 │
                    │  - latin_word                 │
                    │  - word (German)              │
                    │  - context (sentence)         │
                    │  - state: 'new'               │
                    │  - next_review: NOW()         │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       SRSPractice.tsx         │
                    │    (Review due cards)         │
                    └───────────────┬───────────────┘
                                    │
                           User rates response
                    ┌───────┬───────┼───────┬───────┐
                    │       │       │       │       │
                 Again    Hard    Good    Easy    Skip
                    │       │       │       │       │
                    ▼       ▼       ▼       ▼       │
                    ┌───────────────────────────────┐
                    │       SM-2 Algorithm          │
                    │  Calculate new interval       │
                    │  Update ease_factor           │
                    │  Set next_review date         │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │        srs_reviews            │
                    │   (Review history log)        │
                    └───────────────────────────────┘
```

---

## External API Integration

### Google Gemini API

**Service file:** `services/geminiService.ts`

**Configuration:**
- API key: `GEMINI_API_KEY` environment variable
- Accessed via Replit secrets

**Endpoints used:**
1. **Text-to-Speech:** Generate Farsi audio for sentences
2. **Live API:** Real-time bidirectional conversation
3. **Text Generation:** Dynamic hints, feedback

**Caching Strategy:**
- TTS responses cached in-memory
- Pre-fetch next sentences during karaoke

### Supabase

**Client setup:** `src/lib/supabaseClient.ts`

**Configuration:**
- `VITE_SUPABASE_URL` - Project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key

**Type definitions:** `src/lib/database.types.ts`

---

## File-Based Data

### Lesson Content

**Location:** `public/data/lessons/`

```
public/data/
├── lessons/
│   ├── a1-l1.json      # Level A1, Lesson 1
│   ├── a1-l2.json      # ...
│   ├── a2-l1-yesterday.json
│   └── ...
├── table-of-contents.json  # Lesson index
└── all-sentences.json      # Combined corpus
```

**Lesson JSON Structure:**
```json
{
  "id": "a1-l1",
  "title": "Lektion 1",
  "level": "A1",
  "sentences": [
    {
      "id": "s1",
      "farsi": "سلام",
      "german": "Hallo",
      "tokens": [...]
    }
  ]
}
```

### Pre-generated Audio

**Location:** `public/audio/a2-l*/`

WAV files for lessons with pre-recorded audio:
```
public/audio/a2-l1/
├── audio_1.wav
├── audio_2.wav
└── ...
```

---

## Deployment

### Current: Replit

- Dev server: port 5000
- Environment variables in Replit Secrets
- Automatic HTTPS via Replit proxy

### Production: Vercel (Recommended)

- Optimized for Vite builds
- Environment variables in Vercel dashboard
- Edge functions for API routes (optional)

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API access |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key |

---

## Performance Considerations

### Database
- Type-safe queries via Supabase client
- Selective column selection
- Indexes on user_id and lesson_id columns
- Progress auto-save with 500ms debounce

### Audio
- TTS responses cached in memory
- Pre-fetching for next sentences
- Pre-generated WAV files for common lessons

### Bundle
- shadcn/ui tree-shaken
- Vite code splitting
- Future: lazy loading for heavy components

---

## Related Documents

- [Component Map](./component_map.md) - Detailed component hierarchy
- [Lean Strategy](../lean_strategy/doc.md) - Refactoring roadmap
- [Birkenbihl Method](../methodology/birkenbihl_method.md) - Educational foundation
- [Feature Checklist](../onboarding/feature_checklist.md) - Development protocols
- [Supabase Schema](../../docs/supabase-schema.sql) - Complete SQL schema

---

*Update this document when adding new services, tables, or changing architecture significantly.*
