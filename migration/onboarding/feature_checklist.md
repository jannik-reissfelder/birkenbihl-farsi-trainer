# Feature Implementation Checklist

**Document Version:** 1.0  
**Date:** December 2025

---

## Overview

This document provides a step-by-step protocol for implementing new features in the Birkenbihl Farsi Trainer. Following this checklist ensures consistency, maintainability, and alignment with the project's educational methodology.

---

## Pre-Implementation Checklist

### 1. Methodology Alignment

Before writing any code, verify:

- [ ] Feature aligns with Birkenbihl methodology (see [birkenbihl_method.md](../methodology/birkenbihl_method.md))
- [ ] Feature respects the learning flow order (Decode → Karaoke → Shadowing → Live Chat)
- [ ] Feature supports passive → active learning progression
- [ ] Feature is appropriate for German-speaking audience

**If unsure:** Consult the project owner before proceeding.

### 2. Architecture Review

- [ ] Identify which existing components will be modified
- [ ] Review [component_map.md](../architecture/component_map.md) for structure
- [ ] Check if similar patterns exist elsewhere in codebase
- [ ] Determine if new database tables/columns are needed

### 3. Design Decision

- [ ] Prefer extending existing components over creating new ones
- [ ] Use shadcn/ui components where available
- [ ] Plan for mobile responsiveness
- [ ] Consider RTL layout for Farsi content

---

## Implementation Protocol

### Phase 1: Setup

1. **Create feature branch** (if using Git workflow):
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Update dependencies** (if needed):
   ```bash
   npx shadcn-ui@latest add [component]
   npm install [package]
   ```

3. **Create component files** following structure:
   ```
   components/
   └── [feature]/
       ├── index.ts           # Barrel export
       ├── FeatureName.tsx    # Main component
       └── SubComponent.tsx   # If needed
   ```

### Phase 2: Implementation

#### Component Structure

Follow this template for new components:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FeatureNameProps {
  requiredProp: string;
  optionalProp?: boolean;
  onAction: () => void;
}

export function FeatureName({
  requiredProp,
  optionalProp = false,
  onAction,
}: FeatureNameProps) {
  const [localState, setLocalState] = useState<string>('');

  return (
    <Card className="p-4">
      {/* Component content */}
    </Card>
  );
}
```

#### Styling Guidelines

- [ ] Use Tailwind CSS utility classes
- [ ] Follow existing color scheme (check `tailwind.config.js`)
- [ ] Use shadcn/ui design tokens
- [ ] Add `dir="rtl"` for Farsi text containers
- [ ] Ensure mobile responsiveness with responsive prefixes (`sm:`, `md:`, `lg:`)

#### State Management

- [ ] Use React hooks for local state
- [ ] Use existing Contexts for global state (Vocabulary, Gamification)
- [ ] Create custom hooks for complex logic (place in `hooks/`)
- [ ] Implement debounced saves for user input (500ms pattern)

#### Database Integration

If adding database functionality:

1. **Define schema** (consult Supabase dashboard for existing structure)

2. **Create type-safe queries**:
   ```typescript
   const { data, error } = await supabase
     .from('table_name')
     .select('column1, column2')
     .eq('user_id', userId);
   ```

3. **Handle errors gracefully**:
   ```typescript
   if (error) {
     console.error('Database error:', error);
     return;
   }
   ```

4. **Verify RLS policies** are set for new tables

### Phase 3: Integration

- [ ] Import component in parent (usually LessonView.tsx)
- [ ] Add to barrel export (`index.ts`)
- [ ] Wire up props and callbacks
- [ ] Test complete user flow

---

## Testing Checklist

### Functional Testing

- [ ] Feature works as expected in happy path
- [ ] Edge cases are handled (empty states, errors)
- [ ] User progress is saved correctly
- [ ] Feature works after page reload (persistence)

### UI Testing

- [ ] Renders correctly on desktop
- [ ] Renders correctly on mobile
- [ ] RTL layout works for Farsi content
- [ ] Follows visual design consistency

### Integration Testing

- [ ] Feature doesn't break existing functionality
- [ ] Navigation works correctly
- [ ] Audio playback (if applicable) works
- [ ] Database operations succeed

---

## Documentation Updates

After implementation, update:

- [ ] `replit.md` - Add feature to Recent Changes section
- [ ] `component_map.md` - Add new components to hierarchy
- [ ] Inline code comments for complex logic
- [ ] This checklist if process changed

---

## Code Review Checklist

Before completing:

- [ ] No TypeScript errors (`any` types avoided)
- [ ] No console warnings
- [ ] Code follows existing patterns
- [ ] Components under 300 lines
- [ ] Props interfaces are complete
- [ ] No hardcoded strings (use German for UI)

---

## Common Patterns

### Adding a New Learning Step Sub-component

Follow the DecodeStep pattern:

1. Create directory: `components/lesson/[StepName]Step/`
2. Create main composite: `[StepName]Step.tsx`
3. Extract sub-components as needed
4. Create controller hook: `hooks/use[StepName]Controller.ts`
5. Add barrel export: `index.ts`
6. Integrate in `LessonView.tsx`

### Adding to Vocabulary System

1. Use `VocabularyContext` for card operations
2. Call `addCard()` with proper structure:
   ```typescript
   addCard({
     farsi: 'فارسی',
     latin: 'fârsi',
     german: 'Persisch',
     lessonId: currentLessonId,
     sentenceContext: fullSentence,
   });
   ```
3. Test SRS review cycle

### Adding Gamification

1. Use `GamificationContext` for XP/streak operations
2. Award XP at appropriate milestones
3. Update streak on daily activity
4. Show visual feedback to user

---

## Rollback Protocol

If feature causes issues:

1. Check Replit checkpoint history
2. Identify last working state
3. Use rollback feature if needed
4. Document what went wrong

---

## Feature Types Reference

### Type A: UI Enhancement
- Modify existing components
- No database changes
- Focus on styling/UX

### Type B: Learning Feature
- Affects learning flow
- May require database schema changes
- Must align with Birkenbihl methodology

### Type C: Infrastructure
- Backend/database changes
- API integrations
- Performance optimizations

---

## Quick Reference Commands

```bash
# Start development server
npm run dev

# Add shadcn component
npx shadcn-ui@latest add [component]

# Type checking
npx tsc --noEmit

# Check for lint issues
npm run lint
```

---

## Related Documents

- [Birkenbihl Method](../methodology/birkenbihl_method.md) - Educational methodology
- [Component Map](../architecture/component_map.md) - Current component structure
- [Lean Strategy](../lean_strategy/doc.md) - Refactoring priorities
- [Quick Start](./quick_start.md) - Initial setup

---

*Update this checklist when development processes change or new patterns emerge.*
