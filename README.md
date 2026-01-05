# Birkenbihl Farsi Trainer

A language learning app for German speakers to learn Farsi using the Birkenbihl decoding method.

## Features

- **8-Rule Decoding**: Word-for-word translation with transliteration, Ezafe markers, split verbs, and more
- **Learning Flow**: Decode → Karaoke → Shadowing → Live Chat
- **Progress Tracking**: Auto-save with resume, per-sentence decode answers stored in database
- **SRS Vocabulary**: Spaced repetition with cloze-test format
- **AI Integration**: Text-to-speech and conversation powered by Google Gemini

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth + PostgreSQL)
- Google Gemini API

## Setup

1. Install dependencies: `npm install`
2. Set environment variables:
   - `GEMINI_API_KEY` - Google Gemini API key
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase public key
3. Run: `npm run dev`

## Database

Run migrations in `supabase/migrations/` to set up tables for user profiles, lesson progress, vocabulary cards, and SRS reviews.
