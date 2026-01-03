# Birkenbihl Farsi Trainer

## Overview
The Birkenbihl Farsi Trainer is a language learning application designed for German speakers to learn Farsi using the scientifically-backed Birkenbihl decoding method. The application focuses on structured exposure, active recall, and a unique 8-rule decoding methodology to facilitate language acquisition. Its core purpose is to provide an effective, interactive platform for Farsi learning, incorporating features like word-for-word translation, audio-visual synchronisation, pronunciation practice, and AI-driven conversation. The project aims to offer a robust, multi-user learning experience with a strong emphasis on long-term vocabulary retention and an integrated passive-to-active learning cycle.

## User Preferences
- Core methodology (8 rules + learning flow) is non-negotiable
- Open to architectural changes that improve efficiency
- German-speaking target audience
- Focus on long-term vocabulary retention through SRS
- Integration of passive learning → active production cycle

## System Architecture
The application is built with a modern web stack: React 19, TypeScript, and Vite for the frontend, styled with Tailwind CSS v3 and shadcn/ui. State management uses React Context and hooks, with data persisting in a Supabase PostgreSQL database, secured by Row Level Security (RLS). Authentication is handled via Supabase Auth, supporting email/password and email verification. AI functionalities, including Text-to-Speech (TTS), Live API for conversation, and text generation, are powered by Google Gemini API. Audio processing leverages the Web Audio API and Web Speech Recognition API.

Key features include:
- **Core Learning Methodology**: Implements the 8 Birkenbihl decoding rules (Transliteration, Token Alignment, 'râ' Placeholder, Ezafe Decoding, Gender-Neutral Pronouns, Split Complex Verbs, Zero-Subject Completion, Affixal Suffix Marking) and a learning flow of Decode, Karaoke, Shadowing, and Live Chat.
- **Multi-User Platform**: Secure user authentication, per-user data isolation, and automatic synchronization of progress across devices.
- **Granular Lesson Step Progress**: The `lesson_step_progress` table tracks per-lesson progress with decode sentence index, decode answers (JSONB), and step completion status (decode/karaoke/lesson completed). Auto-saves decode answers on 500ms debounce and restores on resume.
- **Progress Tracking & Gamification**: Database-backed tracking of lesson completion, XP levels, and learning streaks with visual indicators.
- **Analytics Dashboard**: Provides insights into vocabulary distribution, struggling words, weekly progress, and contextual learning tips.
- **Multiple Practice Modes**: Structured lessons, free shadowing, background playlists, and live AI conversation.
- **SRS Vocabulary System**: Contextual Spaced Repetition System (SRS) with cloze-test format for vocabulary collection and review, adhering to the SM-2 algorithm.
- **Decode Audio Playback**: On-demand TTS audio in the Decode step with smart pre-fetching and caching.
- **UI/UX**: Modern, accessible interface leveraging shadcn/ui for consistent design, mobile responsiveness, and gradient card designs.
- **Technical Implementations**: Type-safe database queries via Supabase, a data migration utility for existing local storage data, and Vercel-optimized deployment.

## Recent Changes (January 2026)
- **Free Speaking Mode Bug Fix**: Fixed React state timing issue in ChatView where free speaking mode was incorrectly using lesson-based system prompts
  - Added explicit `explicitMode` parameter to `startLiveChat()` function to bypass async state updates
  - Free speaking mode now correctly generates daily conversational Farsi prompts without lesson content leakage
  - Added debug logging to track chatMode state and system instruction generation
- **Workflow System Enhancement**: Created `/close-feature-branch` workflow for professional PR completion with documentation updates

## Previous Changes (December 2025)
- **Shadcn Component Refactor (COMPLETE)**: Created modular DecodeStep components using shadcn/ui:
  - `TokenColumn.tsx`: Stacked Farsi/Latin/German input with shadcn Button for word marking
  - `TokenStackGrid.tsx`: CSS Grid with RTL column flow using shadcn Card
  - `StepHeader.tsx`: Sentence progress, audio controls with shadcn Button
  - `ControlBar.tsx`: Navigation with shadcn Button variants
  - `WordMarkingToggle.tsx`: Updated to use shadcn ToggleGroup and Button; now integrated into DecodeStep
  - `DecodeStep.tsx`: Composite component integrating all decode UI including WordMarkingToggle
  - `index.ts`: Barrel export for all DecodeStep components
- **useDecodeController Hook**: New hook (`hooks/useDecodeController.ts`) consolidating decode step state management including answer validation, word marking, auto-save with debounce cleanup, and resume functionality
- **Resume Bug Fix**: Added `sanitizeDecodeAnswers()` in useSentenceTokens hook and `validateSentenceIndex()` utility to prevent out-of-bounds errors when resuming lesson progress; handles edge case of 0 sentences
- **RTL Layout Redesign**: TokenStackGrid uses CSS Grid with `dir="rtl"` for proper right-to-left flow; 4-row grid per token (Farsi → Latin → German input → Correction)
- **Multi-word Selection with Shift-click**: WordMarkingToggle supports Shift-click range selection for contiguous words; tracks last clicked index for range anchor; includes mode toggle (Einzelwort/Mehrere Wörter)
- **De-marking Feature**: Users can click marked words to remove them from SRS practice (toggle behavior)
- **removeCardByWords()**: VocabularyContext function to remove cards by German/Farsi word pair
- **useSentenceTokens Hook**: Token normalization with unique IDs fixes index alignment issues in SRS word selection
- **LessonView Integration**: DecodeStep component fully integrated with all props including onAddCard for multi-word vocabulary marking

## External Dependencies
- **Database**: Supabase PostgreSQL (for user profiles, lesson progress, vocabulary cards, SRS reviews, gamification stats)
- **Authentication**: Supabase Auth
- **AI Services**: Google Gemini API (for TTS, Live API, and text generation)
- **UI Components**: shadcn/ui