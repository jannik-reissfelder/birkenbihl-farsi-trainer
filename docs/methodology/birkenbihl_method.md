# The Birkenbihl Decoding Method

**Document Version:** 1.0  
**Date:** December 2025

---

## Overview

The Birkenbihl Farsi Trainer implements Vera F. Birkenbihl's language learning methodology, specifically adapted for German speakers learning Farsi. This method focuses on **passive comprehension before active production**, using word-for-word decoding as the foundation.

This document is **essential reading** before modifying any learning-related code.

---

## The 8 Decoding Rules

These rules govern how Farsi text is translated and displayed to learners. They are **non-negotiable** - the app's educational value depends on their correct implementation.

### Rule 1: Transliteration
**Purpose:** Make Farsi script accessible to beginners.

Every Farsi word is displayed with:
- Original Persian script (فارسی)
- Latin transliteration (fârsi)

```
Farsi:  سلام
Latin:  salâm
German: Gruß
```

### Rule 2: Token Alignment
**Purpose:** Create 1:1 word correspondence between languages.

Each Farsi token maps to exactly one German equivalent, displayed in vertical columns:
- Top row: Farsi script
- Middle row: Latin transliteration
- Bottom row: German translation

**Implementation:** `TokenColumn.tsx` and `TokenStackGrid.tsx`

### Rule 3: 'râ' Placeholder (را)
**Purpose:** Handle the Farsi object marker.

The particle "را" (râ) marks definite direct objects in Farsi but has no German equivalent. Display as placeholder:

```
Farsi:  کتاب  را  خواندم
Latin:  ketâb  râ  xândam
German: Buch   ×   las-ich
```

The "×" symbol indicates a grammatical marker with no translation.

### Rule 4: Ezafe Decoding (اضافه)
**Purpose:** Handle the Ezafe construction (possessive/descriptive link).

Ezafe is an unstressed "-e" suffix connecting nouns to modifiers. It's not written in Farsi but must be marked:

```
Farsi:  کتابِ    من
Latin:  ketâb-e  man
German: Buch-    mein
```

The hyphen indicates the Ezafe connection.

### Rule 5: Gender-Neutral Pronouns
**Purpose:** Simplify pronoun translation.

Farsi has no grammatical gender. The pronoun "او" (u) means both "he" and "she":

```
Farsi:  او   رفت
Latin:  u    raft
German: er/sie  ging
```

Always show "er/sie" for third-person singular pronouns.

### Rule 6: Split Complex Verbs
**Purpose:** Make compound verbs transparent.

Farsi uses light verb constructions (noun + verb). Split them for clarity:

```
Farsi:  صحبت    کردم
Latin:  sohbat  kardam
German: Rede    machte-ich

(صحبت کردن = "to speak" literally "speech to-make")
```

### Rule 7: Zero-Subject Completion
**Purpose:** Make implicit subjects explicit.

Farsi verbs encode the subject; pronouns are often dropped. Always show the implicit subject:

```
Farsi:  رفتم        (no separate pronoun)
Latin:  raftam
German: ging-ich

Farsi:  می‌خوانند
Latin:  mi-xânand
German: lesen-sie
```

Use suffix notation: "verb-subject" (ging-ich, lesen-sie).

### Rule 8: Affixal Suffix Marking
**Purpose:** Show grammatical suffixes clearly.

Mark suffixes that carry grammatical meaning:

```
Farsi:  کتاب‌ها
Latin:  ketâb-hâ
German: Bücher    (or: Buch-PL)

Farsi:  رفتم
Latin:  raft-am
German: ging-ich
```

---

## Learning Flow

The app follows a strict 4-step progression. **This order is non-negotiable.**

```
┌─────────────────────────────────────────────────────────────────┐
│                      LEARNING FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │  DECODE  │ → │ KARAOKE  │ → │ SHADOWING│ → │ LIVE CHAT│  │
│   │          │    │          │    │          │    │          │  │
│   │ Passive  │    │ Passive  │    │ Active   │    │ Active   │  │
│   │ Reading  │    │ Listening│    │ Speaking │    │ Speaking │  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                 │
│   ─────────────────────────────────────────────────────────────│
│   PASSIVE COMPREHENSION ────────► ACTIVE PRODUCTION            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1: Decode (Dekodieren)
**Goal:** Understand the word-for-word structure.

- User sees Farsi sentence with transliteration
- User fills in German translations (input fields)
- System checks answers against correct translations
- **Word marking:** User can select words to add to SRS vocabulary

**Key components:**
- `DecodeStep.tsx` (composite)
- `TokenStackGrid.tsx` (layout)
- `TokenColumn.tsx` (individual tokens)

### Step 2: Karaoke (Karaoke)
**Goal:** Passive listening with visual synchronization.

- Audio plays automatically
- Words highlight in sync with audio
- User reads along silently
- Loop controls for repetition

**Implementation status:** Still in `LessonView.tsx` (~300 lines)

### Step 3: Shadowing (Nachsprechen)
**Goal:** Active pronunciation practice.

- User hears audio
- User repeats aloud
- Optional: Speech recognition feedback

### Step 4: Live Chat (Live-Chat)
**Goal:** Spontaneous conversation with AI.

- AI-powered conversation in Farsi
- **Dual-mode system:**
  - **Lesson-based:** Contextual to lesson vocabulary with scenario generation
  - **Free speaking:** Daily conversational Farsi for real-life practice
- Powered by Gemini Live API
- Integrates mastered SRS vocabulary for reinforcement

---

## SRS Vocabulary System

### Overview
The Spaced Repetition System (SRS) uses the SM-2 algorithm for long-term retention.

### Workflow
1. During **Decode step**, user marks words for practice
2. Words are added to vocabulary cards
3. Cards appear in **Review sessions**
4. **Cloze-test format:** User fills in missing German translation
5. SM-2 adjusts interval based on performance

### Implementation
- `VocabularyContext.tsx` - Card management
- `VocabularyReview.tsx` - Review interface
- Database: `vocabulary_cards` and `srs_reviews` tables

---

## Code Implementation Notes

### Token Structure
```typescript
interface Token {
  id: string;           // Unique identifier
  farsi: string;        // Persian script
  latin: string;        // Transliteration
  german: string;       // Correct translation
  isPlaceholder?: boolean;  // For râ marker
  hasEzafe?: boolean;   // For Ezafe suffix
}
```

### Sentence Structure
```typescript
interface Sentence {
  id: string;
  farsi: string;        // Full sentence in Farsi
  german: string;       // Full German translation
  tokens: Token[];      // Word-by-word breakdown
  audio?: string;       // TTS audio URL
}
```

### RTL Layout
Farsi reads right-to-left. The `TokenStackGrid` uses:
```tsx
<div dir="rtl">
  {/* Tokens flow right-to-left */}
</div>
```

---

## Do's and Don'ts

### DO
- Maintain 1:1 token alignment
- Show transliteration for all Farsi text
- Respect the learning flow order
- Keep German UI for target audience
- Use SRS for marked vocabulary

### DON'T
- Skip or reorder learning steps
- Remove transliteration layer
- Translate idiomatically (keep word-for-word)
- Ignore grammatical markers (râ, Ezafe)
- Break the passive → active progression

---

## Further Reading

- Vera F. Birkenbihl: "Sprachen lernen leichtgemacht"
- [Lean Strategy Document](../lean_strategy/doc.md) - Technical refactoring plans
- [Component Map](../architecture/component_map.md) - Current implementation structure

---

*This methodology documentation should be updated if new rules or learning steps are added.*
