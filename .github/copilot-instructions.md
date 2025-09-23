# Copilot Instructions for Fresh Schedules

## Project Overview

This is a **security-first scheduling app** built with Next.js 15, Firebase, and AI-powered conflict detection using Google's Genkit. The app manages employee schedules with automated conflict flagging and real-time updates.

## Architecture Patterns

### Route Structure

- `src/app/(app)/` - Main authenticated app pages (dashboard, conflict-detector, requests, settings)
- `src/app/(auth)/` - Authentication pages (login, signup)
- `src/app/api/auth/` - API routes for authentication
- `src/app/actions/` - Server actions for form handling and AI integration

### AI Integration

- **Genkit flows** in `src/ai/flows/` - Server-side AI functions with structured input/output schemas
- **Server actions** in `src/app/actions/` - Bridge between UI forms and AI flows
- Example: `flagConflicts()` analyzes schedule conflicts using employee availability docs

### Component Organization

- **shadcn/ui components** in `src/components/ui/` - Pre-built, customizable UI primitives
- **Business components** in `src/components/` - App-specific components (conflict-detector, schedule, layout)
- **Custom hooks** in `src/hooks/` - Reusable React hooks (use-mobile, use-toast)

## Development Workflows

### Required Commands (use pnpm only)

```bash
pnpm run dev:web      # Next.js dev server (port 3000)
pnpm run dev:api      # Firebase emulators (auth, firestore, storage)
pnpm run dev          # Start both web + API concurrently
pnpm run stop         # Kill all dev processes and ports
```

### Pre-commit Checks

```bash
pnpm run typecheck    # TypeScript validation
pnpm run lint         # ESLint with --max-warnings=0
pnpm run format       # Prettier formatting
pnpm run gitleaks:scan # Security scanning for secrets
```

## Key Conventions

### Styling & UI

- **Tailwind CSS** with custom color variables in `src/app/globals.css`
- **shadcn/ui** components with `cn()` utility for className merging
- **Font stack**: Roboto (headlines), Open Sans (body text)
- **Theme colors**: Teal primary (#008080), light cyan background, olive green accents

### State Management

- **Server actions** for forms and AI interactions (use `'use server'` directive)
- **Zod schemas** for AI flow input/output validation
- **Real-time updates** via Firestore listeners (planned)

### Security Practices

- **Firebase emulators** for local development (no cloud functions)
- **Gitleaks** scanning in pre-commit hooks and CI/CD
- **Environment variables** in `.env.local` (never commit `.env` files)

## Critical File Patterns

### AI Flow Structure

```typescript
// src/ai/flows/example-flow.ts
'use server';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InputSchema = z.object({...});
const OutputSchema = z.object({...});

export async function myFlow(input: Input): Promise<Output> {
  return myFlowGenkit(input);
}

const myFlowGenkit = ai.defineFlow({...});
```

### Server Action Pattern

```typescript
// src/app/actions/example-actions.ts
"use server";
export async function myAction(prevState: any, formData: FormData) {
  // Validate input, call AI flows, return {result, error}
}
```

### Component Import Aliases

- `@/components` - Components directory
- `@/lib` - Utilities and shared logic
- `@/hooks` - Custom React hooks
- `@/ai` - AI flows and Genkit configuration

## Notes for AI Agents

- **Always use pnpm** (never npm/yarn) - enforced by packageManager field
- **TypeScript/ESLint errors ignored** in Next.js config for faster development
- **Firebase emulators** replace cloud functions - all server logic in Next.js API routes
- **Responsive design** with mobile-first approach using Tailwind breakpoints
- **Security scanning** is mandatory - gitleaks must pass before commits
