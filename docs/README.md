# Birkenbihl Farsi Trainer - Developer Handover

**Document Version:** 1.1  
**Date:** December 2025

---

## Welcome

This migration folder contains comprehensive documentation for developers and architects joining the Birkenbihl Farsi Trainer project. Use this as your starting point for understanding the application's educational methodology, technical architecture, and development protocols.

**Start here, then follow the suggested reading order.**

---

## Document Index

### 1. Methodology (READ FIRST)
Understanding the educational foundation is **critical** before making any code changes.

| Document | Description | Priority |
|----------|-------------|----------|
| [Birkenbihl Method](./methodology/birkenbihl_method.md) | The 8 decoding rules and learning flow - **non-negotiable core** | 🔴 Required |

### 2. Architecture
Technical overview, database schema, and component relationships.

| Document | Description | Priority |
|----------|-------------|----------|
| [System Overview](./architecture/overview.md) | Tech stack, database schema, data flows, external services | 🔴 Required |
| [Component Map](./architecture/component_map.md) | React component hierarchy with accurate file paths | 🟡 Recommended |

### 3. Onboarding
Quick start guides and development protocols.

| Document | Description | Priority |
|----------|-------------|----------|
| [Quick Start Guide](./onboarding/quick_start.md) | Get the project running in 10 minutes | 🔴 Required |
| [Feature Checklist](./onboarding/feature_checklist.md) | Protocol for implementing new features | 🟡 Recommended |

### 4. Strategy
Long-term code improvement roadmaps.

| Document | Description | Priority |
|----------|-------------|----------|
| [Lean Code Strategy](./lean_strategy/doc.md) | Refactoring roadmap, code hotspots, architecture targets | 🟢 Reference |

### 5. Existing Documentation
Additional reference documents in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [docs/supabase-schema.sql](../docs/supabase-schema.sql) | Complete database schema with RLS policies |
| [docs/QUICK_START.md](../docs/QUICK_START.md) | Legacy quick start guide |
| [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) | Deployment instructions |

---

## Quick Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM CONTEXT                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    BIRKENBIHL FARSI TRAINER                       │ │
│  │                                                                   │ │
│  │   React 19 + TypeScript + Vite + Tailwind + shadcn/ui            │ │
│  │                                                                   │ │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │ │
│  │   │  Decode  │→ │ Karaoke  │→ │ Shadowing│→ │    Live Chat    │ │ │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │ │
│  │         ↓                                                        │ │
│  │   ┌──────────────────────────────────────────────────────────┐  │ │
│  │   │        SRS Vocabulary System (SM-2 Algorithm)            │  │ │
│  │   └──────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                     │                                   │
│              ┌──────────────────────┼──────────────────────┐           │
│              ▼                      ▼                      ▼           │
│  ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────┐│
│  │     SUPABASE        │  │   GEMINI API    │  │    BROWSER APIs     ││
│  │  - PostgreSQL       │  │  - TTS          │  │  - Web Audio        ││
│  │  - Auth + RLS       │  │  - Live Chat    │  │  - Speech Recognition│
│  │  - Real-time        │  │  - Generation   │  │  - AudioContext     ││
│  └─────────────────────┘  └─────────────────┘  └─────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Learning Flow (Non-Negotiable)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        BIRKENBIHL LEARNING FLOW                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │  DECODE  │ → │ KARAOKE  │ → │ SHADOWING │ →  │    LIVE CHAT     │  │
│  │          │    │          │    │           │    │                  │  │
│  │ Word-by- │    │ Listen & │    │ Repeat    │    │ Converse with    │  │
│  │ word     │    │ follow   │    │ aloud     │    │ AI in Farsi      │  │
│  │ decoding │    │ along    │    │           │    │                  │  │
│  └──────────┘    └──────────┘    └───────────┘    └──────────────────┘  │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════ │
│  PASSIVE COMPREHENSION ──────────────────────► ACTIVE PRODUCTION        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Key Principles

### Non-Negotiable (Core Methodology)
1. **The 8 Birkenbihl decoding rules** - read [birkenbihl_method.md](./methodology/birkenbihl_method.md) first
2. **Learning flow order** - Decode → Karaoke → Shadowing → Live Chat (fixed sequence)
3. **German-speaking target audience** - all UI text in German
4. **SRS vocabulary retention** - passive learning → active production cycle
5. **Word-for-word alignment** - no idiomatic translations

### Flexible (Open to Improvement)
- Architectural improvements for efficiency
- UI/UX enhancements using shadcn/ui
- Performance optimizations
- New practice modes (following the methodology)
- Component extraction and refactoring

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (extends auth.users) |
| `lesson_progress` | Overall lesson completion tracking |
| `lesson_step_progress` | Granular decode/karaoke progress with auto-save |
| `vocabulary_cards` | SRS vocabulary with SM-2 scheduling |
| `srs_reviews` | Review history for analytics |
| `gamification_stats` | XP, levels, streaks |

All tables have RLS enabled - users can only access their own data.

**Full schema:** [docs/supabase-schema.sql](../docs/supabase-schema.sql)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `components/LessonView.tsx` | Main lesson orchestration (~1000 lines) |
| `components/lesson/DecodeStep/` | Modular decode UI components |
| `contexts/VocabularyContext.tsx` | SRS vocabulary management |
| `contexts/GamificationContext.tsx` | XP, levels, streaks |
| `hooks/useLessonStepProgress.ts` | Progress persistence |
| `services/geminiService.ts` | Gemini API wrapper |
| `src/lib/supabaseClient.ts` | Supabase client setup |

---

## Environment Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API | Vercel Environment Variables |
| `VITE_SUPABASE_URL` | Supabase project URL | Vercel Environment Variables |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key | Vercel Environment Variables |

---

## Getting Started (Suggested Path)

```
1. Read Birkenbihl Method (methodology/birkenbihl_method.md)
         │
         ▼
2. Read System Overview (architecture/overview.md)
         │
         ▼
3. Follow Quick Start (onboarding/quick_start.md)
         │
         ▼
4. Before coding: Review Feature Checklist (onboarding/feature_checklist.md)
         │
         ▼
5. For refactoring: Consult Lean Strategy (lean_strategy/doc.md)
```

---

## Current Development Priorities

From the [Lean Strategy](./lean_strategy/doc.md):

| Priority | Task | Status |
|----------|------|--------|
| 1 | DecodeStep component extraction | ✓ Complete |
| 2 | KaraokeStep extraction | TODO |
| 3 | Replace custom icons with Lucide React | TODO |
| 4 | Migrate to shadcn Dialog/Toast | TODO |
| 5 | Consolidate audio management | TODO |

---

## Contact & Support

- **Project documentation:** This folder
- **Database schema:** `docs/supabase-schema.sql`
- **Architecture decisions:** `lean_strategy/doc.md`

---

*This is the main entry point for developer onboarding. Keep this document current as the project evolves.*
