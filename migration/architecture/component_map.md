# Component Map

**Document Version:** 1.1  
**Date:** December 2025

---

## Overview

This document maps the React component hierarchy and their relationships based on the actual codebase structure. Use this to understand how UI elements are organized and where to make changes.

---

## Directory Structure (Accurate)

```
/
├── components/                    # Main component directory (root level)
│   ├── icons/                     # Custom SVG icon components
│   │   ├── BookOpenIcon.tsx
│   │   ├── BotIcon.tsx
│   │   ├── CalendarIcon.tsx
│   │   ├── ChatIcon.tsx
│   │   ├── CheckIcon.tsx
│   │   ├── ChevronLeftIcon.tsx
│   │   ├── ChevronRightIcon.tsx
│   │   ├── CloseIcon.tsx
│   │   ├── EarIcon.tsx
│   │   ├── FireIcon.tsx
│   │   ├── LightbulbIcon.tsx
│   │   ├── MicrophoneIcon.tsx
│   │   ├── MusicNoteIcon.tsx
│   │   ├── PauseIcon.tsx
│   │   ├── PlayIcon.tsx
│   │   ├── PlaylistIcon.tsx
│   │   ├── RepeatIcon.tsx
│   │   ├── SendIcon.tsx
│   │   ├── SpeakerIcon.tsx
│   │   ├── SpinnerIcon.tsx
│   │   ├── StarIcon.tsx
│   │   ├── StopIcon.tsx
│   │   ├── TranslateIcon.tsx
│   │   └── WandIcon.tsx
│   │
│   ├── lesson/                    # Lesson step components
│   │   ├── DecodeStep/            # ✓ MODULAR (completed refactor)
│   │   │   ├── index.ts           # Barrel export
│   │   │   ├── index.tsx          # Alternative barrel
│   │   │   ├── DecodeStep.tsx     # Main composite component
│   │   │   ├── DecodeSentenceGrid.tsx  # Alternate grid layout
│   │   │   ├── TokenStackGrid.tsx # Token grid layout (RTL)
│   │   │   ├── TokenColumn.tsx    # Individual token display
│   │   │   ├── StepHeader.tsx     # Progress + audio controls
│   │   │   ├── ControlBar.tsx     # Navigation buttons
│   │   │   └── WordMarkingToggle.tsx # Word selection mode
│   │   │
│   │   └── LessonContainer.tsx    # Lesson wrapper component
│   │
│   ├── ui/                        # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── tabs.tsx
│   │   ├── toggle-group.tsx
│   │   └── toggle.tsx
│   │
│   ├── ActiveVocabulary.tsx       # Active vocabulary display
│   ├── AnalyticsDashboard.tsx     # Progress analytics view
│   ├── ChatView.tsx               # Live chat with AI
│   ├── DailyDoseView.tsx          # Daily learning view
│   ├── Dashboard.tsx              # Main dashboard
│   ├── FreeShadowingSession.tsx   # Free practice shadowing
│   ├── FreeShadowingSetup.tsx     # Shadowing configuration
│   ├── GamificationHeader.tsx     # XP/streak header display
│   ├── KaraokeView.tsx            # Karaoke learning step
│   ├── LessonView.tsx             # Main lesson orchestrator (~1000 lines)
│   ├── LevelSelector.tsx          # Level selection UI
│   ├── LevelView.tsx              # Level overview
│   ├── Methodology.tsx            # Methodology explanation
│   ├── PlaylistSetup.tsx          # Background playlist config
│   ├── PlaylistView.tsx           # Playlist playback view
│   ├── PracticeView.tsx           # Practice mode selection
│   ├── ShadowingView.tsx          # Shadowing step view
│   └── SRSPractice.tsx            # SRS review practice
│
├── contexts/                      # React Context providers
│   ├── GamificationContext.tsx    # XP, levels, streaks
│   └── VocabularyContext.tsx      # SRS vocabulary management
│
├── hooks/                         # Custom React hooks
│   ├── useDecodeAudio.ts          # Decode audio management
│   ├── useDecodeController.ts     # Decode step state management
│   ├── useLessonStepProgress.ts   # Progress persistence
│   ├── useProgress.ts             # Global progress tracking
│   └── useSentenceTokens.ts       # Token parsing utilities
│
├── lib/                           # Utility libraries
│   └── utils.ts                   # General utilities
│
├── services/                      # External service integrations
│   └── geminiService.ts           # Gemini API wrapper
│
├── src/                           # Additional source files
│   ├── components/
│   │   └── AuthView.tsx           # Authentication UI
│   ├── contexts/
│   │   └── AuthContext.tsx        # Auth state management
│   ├── lib/
│   │   ├── database.types.ts      # Supabase type definitions
│   │   ├── supabaseClient.ts      # Supabase client setup
│   │   └── supabaseQueries.ts     # Type-safe queries
│   └── utils/
│       └── migrateLocalStorage.ts # Data migration utility
│
├── types/                         # TypeScript type definitions
│   └── vocabulary.ts              # Vocabulary types
│
├── utils/                         # Shared utilities
│   └── audioUtils.ts              # Audio processing helpers
│
└── App.tsx                        # Root application component
```

---

## Component Hierarchy

```
App.tsx
├── AuthProvider (src/contexts/AuthContext)
├── GamificationProvider (contexts/GamificationContext)
├── VocabularyProvider (contexts/VocabularyContext)
│
└── Router/Views
    │
    ├── Dashboard.tsx
    │   ├── GamificationHeader
    │   ├── LevelSelector
    │   └── Quick Actions
    │
    ├── LevelView.tsx
    │   └── Lesson Cards
    │
    ├── LessonView.tsx (MAIN ORCHESTRATOR ~1000 lines)
    │   │
    │   ├── [step === 'decode']
    │   │   └── DecodeStep (components/lesson/DecodeStep/)
    │   │       ├── StepHeader
    │   │       │   ├── Audio controls
    │   │       │   └── Sentence progress
    │   │       ├── TokenStackGrid (dir="rtl")
    │   │       │   └── TokenColumn (× N tokens)
    │   │       ├── WordMarkingToggle (integrated)
    │   │       └── ControlBar
    │   │
    │   ├── [step === 'karaoke']
    │   │   └── Inline karaoke logic (TODO: extract to KaraokeStep)
    │   │
    │   ├── [step === 'shadowing']
    │   │   └── ShadowingView
    │   │
    │   └── [step === 'liveChat']
    │       └── ChatView
    │
    ├── KaraokeView.tsx (standalone karaoke practice)
    │
    ├── SRSPractice.tsx
    │   └── Vocabulary card review
    │
    ├── AnalyticsDashboard.tsx
    │   ├── Vocabulary distribution
    │   ├── Weekly progress
    │   └── Learning tips
    │
    ├── FreeShadowingSession.tsx
    │   └── Free practice mode
    │
    ├── PlaylistView.tsx
    │   └── Background listening
    │
    └── PracticeView.tsx
        └── Practice mode selection
```

---

## Key Component Details

### LessonView.tsx (Orchestrator)

**Location:** `components/LessonView.tsx`  
**Size:** ~1000 lines (target: ~300 after full extraction)

**Current Responsibilities:**
- Step state management (decode/karaoke/shadowing/chat)
- Audio lifecycle and playback
- Progress persistence via `useLessonStepProgress`
- Karaoke word highlighting and sync
- Help dialog state
- Exit/save handling

**Extraction Status:**
| Component | Status |
|-----------|--------|
| DecodeStep | ✓ Extracted |
| KaraokeStep | ❌ Inline (priority extraction) |
| ShadowingStep | ❌ Inline |
| ChatStep | Partially via ChatView |

### DecodeStep (Modular - COMPLETE)

**Location:** `components/lesson/DecodeStep/`

**Sub-components:**
| File | Purpose |
|------|---------|
| `DecodeStep.tsx` | Main composite component |
| `TokenStackGrid.tsx` | RTL grid layout with word marking |
| `TokenColumn.tsx` | Single token (Farsi/Latin/German input) |
| `StepHeader.tsx` | Title, progress indicator, audio button |
| `ControlBar.tsx` | Previous/Check/Next navigation |
| `WordMarkingToggle.tsx` | Multi-word selection mode toggle |
| `DecodeSentenceGrid.tsx` | Alternative sentence grid layout |

**Features:**
- RTL layout with `dir="rtl"`
- Shift-click for range word selection
- Integrated word marking (no separate panel)
- Auto-save with 500ms debounce

### Context Providers

#### VocabularyContext

**Location:** `contexts/VocabularyContext.tsx`

**Key Functions:**
```typescript
{
  cards: VocabularyCard[];
  addCard: (card: Omit<VocabularyCard, 'id'>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  removeCardByWords: (german: string, farsi: string) => Promise<void>;
  getDueCards: () => VocabularyCard[];
  recordReview: (cardId: string, quality: number) => Promise<void>;
}
```

#### GamificationContext

**Location:** `contexts/GamificationContext.tsx`

**Key Functions:**
```typescript
{
  xp: number;
  level: number;
  streak: number;
  addXP: (amount: number) => Promise<void>;
  updateStreak: () => Promise<void>;
}
```

#### AuthContext

**Location:** `src/contexts/AuthContext.tsx`

**Provides:** Supabase auth session and user state

### Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useDecodeController` | `hooks/useDecodeController.ts` | Decode step state (answers, validation, marking) |
| `useDecodeAudio` | `hooks/useDecodeAudio.ts` | TTS audio for decode step |
| `useLessonStepProgress` | `hooks/useLessonStepProgress.ts` | Progress persistence to Supabase |
| `useProgress` | `hooks/useProgress.ts` | Global lesson progress tracking |
| `useSentenceTokens` | `hooks/useSentenceTokens.ts` | Token parsing with unique IDs |

---

## UI Components (shadcn)

### Currently Installed

| Component | File | Usage |
|-----------|------|-------|
| Badge | `ui/badge.tsx` | Labels, status indicators |
| Breadcrumb | `ui/breadcrumb.tsx` | Navigation trails |
| Button | `ui/button.tsx` | All clickable actions |
| Card | `ui/card.tsx` | Token containers, panels |
| Progress | `ui/progress.tsx` | Progress bars |
| Separator | `ui/separator.tsx` | Visual dividers |
| Tabs | `ui/tabs.tsx` | Tab navigation |
| Toggle | `ui/toggle.tsx` | Boolean toggles |
| ToggleGroup | `ui/toggle-group.tsx` | Multi-option toggles |

### Recommended Additions (from lean_strategy)

| Component | Use Case |
|-----------|----------|
| Dialog | Exit confirmation, modals |
| Toast | Save notifications |
| Sheet | Side panel help |
| Input | Standardized text inputs |
| Tooltip | Help hints |

---

## Custom Icons

**Location:** `components/icons/`

All custom SVG icons - consider migrating to Lucide React (see lean_strategy/doc.md).

---

## Data Files

### Lesson Content

**Location:** `public/data/lessons/`

JSON files containing lesson content:
- `a1-l*.json` - Level A1 lessons
- `a2-l*.json` - Level A2 lessons

### Audio Files

**Location:** `public/audio/`

Pre-generated audio files organized by lesson:
- `a2-l1/` through `a2-l8/` with `audio_*.wav` files

### Table of Contents

**Location:** `public/data/table-of-contents.json`

Lesson metadata and ordering.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interaction                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React Component Layer                        │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   LessonView     │  │   SRSPractice    │  │   Dashboard   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────────┘  │
│           │                     │                                │
│           ▼                     ▼                                │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    Custom Hooks                               ││
│  │  useDecodeController  useLessonStepProgress  useProgress     ││
│  └────────────────────────────────┬─────────────────────────────┘│
│                                   │                              │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    React Contexts                             ││
│  │    VocabularyContext    GamificationContext    AuthContext   ││
│  └────────────────────────────────┬─────────────────────────────┘│
└───────────────────────────────────┼──────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │    Supabase     │  │   Gemini API     │  │   Web Audio     │ │
│  │  (PostgreSQL)   │  │   (TTS/Chat)     │  │   (Playback)    │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Documents

- [System Overview](./overview.md) - Tech stack and external services
- [Lean Strategy](../lean_strategy/doc.md) - Refactoring priorities and roadmap
- [Feature Checklist](../onboarding/feature_checklist.md) - Adding new components
- [Birkenbihl Method](../methodology/birkenbihl_method.md) - Educational methodology

---

*Update this map when adding, reorganizing, or removing components.*
