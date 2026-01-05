# Quick Start Guide

**Document Version:** 1.0  
**Date:** December 2025

---

## Prerequisites

Before starting, ensure you have:
- Node.js installed (v18 or higher)
- Understanding of React, TypeScript, and Tailwind CSS
- Read the [Birkenbihl Method](../methodology/birkenbihl_method.md) documentation

---

## 10-Minute Setup

### Step 1: Understand the Project (3 minutes)

1. Read the [Birkenbihl Method](../methodology/birkenbihl_method.md) documentation
2. Review the [System Overview](../architecture/overview.md)
3. Note: The 8 decoding rules are **non-negotiable**

### Step 2: Run the Application (1 minute)

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open your browser at `http://localhost:5173` (default Vite port).

### Step 3: Explore the Codebase (3 minutes)

**Key directories:**
```
src/
├── components/       # React components
│   ├── lesson/      # Learning step components
│   └── ui/          # shadcn/ui components
├── contexts/        # Global state (Vocabulary, Gamification)
├── hooks/           # Custom React hooks
└── lib/             # Utilities (Supabase, Gemini)
```

**Start with these files:**
1. `components/LessonView.tsx` - Main lesson flow
2. `components/lesson/DecodeStep/DecodeStep.tsx` - Modular decode UI
3. `contexts/VocabularyContext.tsx` - SRS vocabulary management

### Step 4: Check Environment Variables (1 minute)

Required environment variables (configured in Vercel Environment Variables or local `.env` file):
- `GEMINI_API_KEY` - Google Gemini API for TTS and chat
- `VITE_SUPABASE_URL` - Database URL
- `VITE_SUPABASE_ANON_KEY` - Public Supabase key

**Note:** For Vercel deployment, ensure `vercel.json` exists in project root for SPA routing.

### Step 5: Understand the Learning Flow (2 minutes)

```
Decode → Karaoke → Shadowing → Live Chat
```

- **Decode:** Fill in German translations (word-for-word)
- **Karaoke:** Listen and read along (audio sync)
- **Shadowing:** Repeat after audio
- **Live Chat:** Conversation with AI

---

## Common Tasks

### Adding a shadcn Component

```bash
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add dialog
```

### Creating a New Component

1. Create file in appropriate directory
2. Use TypeScript with proper interfaces
3. Follow shadcn styling patterns
4. Export from barrel file (`index.ts`)

**Template:**
```tsx
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
```

### Adding Database Functionality

1. Check existing table structure in Supabase dashboard
2. Use type-safe queries:

```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('vocabulary_cards')
  .select('*')
  .eq('user_id', userId);
```

3. RLS is enabled - queries auto-filter by authenticated user

### Working with Audio

1. TTS is handled via Gemini API
2. Audio caching is implemented for efficiency
3. Use Web Audio API for playback control

---

## Development Workflow

### Before Making Changes

1. Read the [Feature Checklist](./feature_checklist.md)
2. Understand which component you're modifying
3. Check for existing patterns in similar components

### Testing Changes

1. Check the Webview for visual changes
2. Test the complete learning flow
3. Verify progress saving (reload and resume)
4. Check console for errors

### Code Style

- Use TypeScript strictly (no `any` types)
- Follow existing Tailwind class patterns
- Use shadcn/ui components where available
- Keep components under 300 lines

---

## Troubleshooting

### App Not Loading

1. Check if `npm run dev` is running
2. Look for errors in the console
3. Verify Supabase connection

### Database Issues

1. Check RLS policies in Supabase dashboard
2. Verify user is authenticated
3. Check for type mismatches in queries

### Audio Not Playing

1. Check Gemini API key is set
2. Look for errors in browser console
3. Verify audio context is initialized on user interaction

### Styling Issues

1. Check Tailwind classes are correct
2. Verify shadcn theme configuration
3. RTL layout uses `dir="rtl"` for Farsi content

---

## Next Steps

After completing this guide:

1. Read the [Feature Checklist](./feature_checklist.md) for implementation protocols
2. Review the [Component Map](../architecture/component_map.md) for detailed structure
3. Check the [Lean Strategy](../lean_strategy/doc.md) for refactoring priorities

---

## Key Contacts

- **Project Owner:** Check migration docs for preferences
- **Documentation:** This migration folder
- **Architecture Decisions:** See lean_strategy/doc.md

---

*Update this guide if setup steps change or new tools are added.*
