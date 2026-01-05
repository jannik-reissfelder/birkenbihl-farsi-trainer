# Lean Code Strategy & Migration Roadmap

**Document prepared for:** Software Architect Handover  
**Date:** December 2025  
**Project:** Birkenbihl Farsi Trainer

---

## 1. Executive Summary

This document outlines the refactoring work completed on the DecodeStep component, current code hotspots requiring attention, and a prioritized roadmap for achieving a lean, modular codebase using shadcn/ui as the primary UI component library.

---

## 2. Completed Refactoring (December 2025)

### 2.1 DecodeStep Component Extraction

**Before:** LessonView.tsx contained ~1,200 lines with inline decode UI rendering via `renderDecodeExercise()` function (~200 lines of JSX).

**After:** Created modular component structure:

```
components/lesson/DecodeStep/
├── index.ts           # Barrel export
├── DecodeStep.tsx     # Main composite component
├── TokenStackGrid.tsx # Token display with flex-wrap layout
├── TokenColumn.tsx    # Individual token (Farsi/Latin/German input)
├── StepHeader.tsx     # Title, progress, audio controls
├── ControlBar.tsx     # Navigation buttons (prev/next/check)
└── WordMarkingToggle.tsx # (Legacy - now integrated into TokenStackGrid)
```

**Lines removed from LessonView.tsx:** ~200 lines  
**Current LessonView.tsx size:** ~1,000 lines

### 2.2 Key Improvements Made

| Change | Before | After |
|--------|--------|-------|
| Token layout | CSS Grid (single row) | Flexbox with wrap |
| Word marking UI | Separate duplicate panel | Integrated in TokenStackGrid |
| Shadcn usage | Minimal | Button, Card, Separator, ToggleGroup |
| State management | Inline in LessonView | Partially extracted to hooks |

### 2.3 New Hooks Created

- **`useDecodeController.ts`** - Decode step state management (answers, validation, marking)
- **`useSentenceTokens.ts`** - Token parsing with unique IDs, validation utilities

---

## 3. Current Code Hotspots

### 3.1 LessonView.tsx (~1,000 lines) - CRITICAL

**Problem:** Still contains mixed concerns:
- Decode step orchestration
- Karaoke step logic (~300-400 lines)
- Listen/Speak step logic
- Audio lifecycle management
- Help dialog state
- Progress persistence
- Exit/save dialog

**Impact:** Difficult to test, maintain, and extend.

### 3.2 Karaoke Logic - HIGH PRIORITY

Located in LessonView.tsx lines ~287-600:
- `fetchAllKaraokeData()` - Batch audio/timing fetching
- `playSentence()` - Sentence playback with word highlighting
- `karaokeState` management
- Multiple refs for audio control

**Recommendation:** Extract to `components/lesson/KaraokeStep/` following DecodeStep pattern.

### 3.3 Custom Components Duplicating Shadcn Patterns

| Custom Implementation | Shadcn Replacement |
|----------------------|-------------------|
| Custom modal dialogs | `Dialog` |
| Loading spinners (inline SVG) | `Spinner` or Lucide icon |
| Custom tabs in lesson view | `Tabs` |
| Progress indicators | `Progress` |
| Custom tooltips | `Tooltip` |
| Alert messages | `Alert` |

### 3.4 State Management Fragmentation

Current state split:
- LessonView local state (decode, karaoke, audio)
- `GamificationContext` (XP, streaks)
- `VocabularyContext` (cards, SRS)
- `useProgress` hook (global progress)
- `useLessonStepProgress` hook (per-lesson progress)

**Issues:**
- Heavy prop drilling to child components
- Difficult to test components in isolation
- State updates cause unnecessary re-renders

---

## 4. Shadcn/ui Migration Targets

### 4.1 Priority 1 - Replace Custom Icons

**Current:** Inline SVG components (BotIcon, SpinnerIcon, PlusIcon, CloseIcon, etc.)  
**Target:** Lucide React icons (already a dependency via shadcn)

```tsx
// Before
const SpinnerIcon = ({ className }) => <svg>...</svg>

// After
import { Loader2 } from 'lucide-react'
<Loader2 className="animate-spin" />
```

### 4.2 Priority 2 - Dialog Components

Replace custom modal implementations with shadcn `Dialog`:
- Exit confirmation dialog
- Help panel (could be `Sheet` for side panel)
- Save success notifications (`Toast`)

### 4.3 Priority 3 - Lesson Step Tabs

Replace custom step navigation with shadcn `Tabs`:
```tsx
<Tabs value={step} onValueChange={setStep}>
  <TabsList>
    <TabsTrigger value="decode">Dekodieren</TabsTrigger>
    <TabsTrigger value="karaoke">Karaoke</TabsTrigger>
  </TabsList>
</Tabs>
```

### 4.4 Priority 4 - Form Inputs

Standardize all inputs with shadcn `Input`:
- Decode answer inputs in TokenColumn
- Help question textarea
- Any settings forms

---

## 5. Recommended Extraction Roadmap

### Phase 1: Karaoke Step Extraction (Estimated: 4-6 hours)

```
components/lesson/KaraokeStep/
├── KaraokeStep.tsx      # Main composite
├── SentencePlayer.tsx   # Audio playback with word highlight
├── KaraokeControls.tsx  # Play/pause/restart
├── LoopIndicator.tsx    # Loop count display
└── hooks/
    └── useKaraokeController.ts
```

**Expected reduction:** ~300 lines from LessonView.tsx

### Phase 2: Listen/Speak Steps (Estimated: 2-3 hours)

```
components/lesson/ListenStep/
├── ListenStep.tsx
└── AudioPlayer.tsx

components/lesson/SpeakStep/
├── SpeakStep.tsx
└── SpeechRecognition.tsx
```

**Expected reduction:** ~150 lines from LessonView.tsx

### Phase 3: Audio Context Consolidation (Estimated: 2 hours)

Create unified audio management:
```
hooks/useAudioContext.ts  # Singleton AudioContext management
hooks/useAudioPlayer.ts   # Reusable playback controls
```

### Phase 4: Dialog Standardization (Estimated: 1-2 hours)

- Install shadcn `Dialog`, `Sheet`, `Toast`
- Replace exit dialog
- Replace help panel with Sheet
- Add Toast for save confirmations

### Phase 5: Icon Migration (Estimated: 1 hour)

- Remove inline SVG icon components
- Import from lucide-react
- Update all usages

---

## 6. Target Architecture

### 6.1 Final Component Structure

```
components/
├── lesson/
│   ├── LessonView.tsx          # ~300 lines (orchestrator only)
│   ├── LessonHeader.tsx        # Title, exit button
│   ├── StepTabs.tsx            # Tab navigation
│   ├── DecodeStep/             # ✓ Complete
│   ├── KaraokeStep/            # TODO
│   ├── ListenStep/             # TODO
│   └── SpeakStep/              # TODO
├── vocabulary/
│   ├── VocabularyReview.tsx
│   └── FlashCard.tsx
└── ui/                          # shadcn components
```

### 6.2 Final State Architecture

```
contexts/
├── LessonContext.tsx           # Current lesson, step, sentence index
├── AudioContext.tsx            # Unified audio management
├── VocabularyContext.tsx       # ✓ Exists
└── GamificationContext.tsx     # ✓ Exists

hooks/
├── useDecodeController.ts      # ✓ Exists
├── useKaraokeController.ts     # TODO
├── useLessonProgress.ts        # Unified progress (merge existing)
└── useAudioPlayer.ts           # TODO
```

---

## 7. Testing Strategy

### 7.1 Component Testing

Each extracted component should have:
- Prop interface tests (TypeScript)
- Rendering tests (Vitest + React Testing Library)
- Interaction tests for user actions

### 7.2 Integration Testing

- Full lesson flow tests
- Progress persistence tests
- Audio playback mocking

### 7.3 Regression Testing

Before each extraction:
1. Document current behavior
2. Create snapshot of working state
3. After extraction, verify identical UX

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking audio sync | Medium | High | Comprehensive karaoke tests before extraction |
| State regression | Medium | Medium | Incremental extraction with testing |
| Performance impact | Low | Medium | Profile before/after each phase |
| shadcn version conflicts | Low | Low | Pin versions, test upgrades |

---

## 9. Quick Wins (Can Do Immediately)

1. **Replace inline SVG icons** with lucide-react (~1 hour)
2. **Remove WordMarkingToggle.tsx** if fully deprecated
3. **Add barrel exports** for all component folders
4. **Extract help dialog** to separate component (~30 min)

---

## 10. Metrics to Track

- **Lines per file:** Target <300 for components, <200 for hooks
- **Prop count:** Target <15 props per component (split if more)
- **Import depth:** Target <3 levels for any component
- **Bundle size:** Monitor with Vite bundle analyzer

---

## 11. Conclusion

The DecodeStep extraction established a proven pattern for component modularization. The codebase is now positioned for incremental improvement. Priority should be:

1. Extract KaraokeStep (highest complexity remaining)
2. Migrate to shadcn Dialog/Toast for consistency
3. Replace custom icons with lucide-react
4. Consolidate audio management

Each phase is independent and can be safely shipped incrementally.

---

*Document version: 1.0*  
*Last updated: December 2025*
