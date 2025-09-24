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
# Copilot Instructions · Scheduler Fresh

Purpose: help agents be productive immediately in this Next.js + Firebase + Genkit app with opinionated security/dev workflows.

Architecture map
- Routing (Next.js 15): `(app)` authenticated app at `src/app/(app)/**`; `(auth)` public auth at `src/app/(auth)/**`.
- API routes: `src/app/api/**` (no Cloud Functions). Auth endpoints at `src/app/api/auth/{session,me}/route.ts`.
- Server actions: `src/app/actions/**` bridge forms → AI flows (e.g., `detectConflictsAction` calls `flagConflicts`).
- AI: Genkit configured in `src/ai/genkit.ts`; flows in `src/ai/flows/**` (see `conflict-flagging.ts` with zod IO + `ai.defineFlow`).
- UI: shadcn/ui primitives in `src/components/ui/**`; business components in `src/components/**` (e.g., `conflict-detector/conflict-detector.tsx`).

Auth model (Firebase Web + Admin)
- Client config: `src/lib/firebase.ts` initializes Auth/Firestore/Storage and connects emulators in dev.
- Admin SDK: `src/lib/firebase.server.ts` reads `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON or base64) to verify session cookies.
- Sessions: POST `/api/auth/session` mints a revocable Firebase session cookie from an ID token; DELETE clears it. CSRF is enforced via a double-submit header; origin is checked against `NEXT_PUBLIC_BASE_URL`. Use `/api/auth/me` on the server to get the user.

Patterns to copy
- AI flow (server):
  - File: `src/ai/flows/conflict-flagging.ts`
  - Shape: zod schemas → `ai.definePrompt(...)` → `ai.defineFlow(...)` → exported wrapper `flagConflicts(input)`.
- Server action (form → AI): `src/app/actions/conflict-actions.ts` reads `FormData`, validates, calls `flagConflicts`, returns `{result,error}`.
- Client usage: `src/components/conflict-detector/conflict-detector.tsx` uses `useFormState(detectConflictsAction, initialState)` and renders results.

Developer workflows (pnpm-only)
- Web: `pnpm run dev:web` (Next on 3000).
- API: `pnpm run dev:api` (Firebase emulators: auth 9099, firestore 8080, storage 9199, UI 4000).
- Both: `pnpm run dev` • Stop: `pnpm run stop`.
- Quality gates: `pnpm run typecheck`, `pnpm run lint --max-warnings=0`, `pnpm run build`, `pnpm run gitleaks:scan`.
- VS Code tasks: “Start All (Web + API)”, “Complete: Stabilize & Validate”, plus Cloud tasks (GCP/Firebase setup, service accounts, secrets sync). Use the Tasks palette to run them.

Env & secrets

Conventions & guardrails
- Import aliases: `@/components`, `@/lib`, `@/hooks`, `@/ai`.
- Next build is lenient (see `next.config.ts`), but CI uses strict lint/typecheck before PRs.
- Security-first: Husky runs lint-staged + gitleaks; CI runs gitleaks. Prefer emulator-first development; keep server logic in route handlers.

When adding features
- Follow the flow: zod schema (if AI), server action, component wiring. Keep API logic in `src/app/api/**` and enforce CSRF/origin on mutating endpoints.
- Before commit/PR: run typecheck + lint + build + gitleaks; prefer VS Code task “Validate: Full Pipeline”.
}
```
