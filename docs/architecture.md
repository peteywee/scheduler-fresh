# Architecture Overview

This document captures the essential architecture, data flows, and security patterns for the Scheduler Fresh app.

## Stack

- Next.js 15 (App Router)
- Firebase: Web SDK + Admin SDK, Emulators-first
- Genkit (Google AI) for conflict detection
- shadcn/ui + Tailwind CSS
- TypeScript, ESLint flat config

## High-level flow

- Client pages under `src/app/(app)` require auth; public auth pages under `src/app/(auth)`.
- Client auth (Firebase Web) manages the user; server endpoints verify session cookies (Firebase Admin).
- AI flows run server-side via Genkit (`src/ai/**`). Client components call server actions that invoke flows.

## Routing

- `src/app/(app)/**` – main app (dashboard, conflict-detector, requests, settings).
- `src/app/(auth)/**` – login, signup.
- `src/app/api/**` – route handlers (no Cloud Functions). Auth endpoints: `/api/auth/{session,me}`.

## Auth

- Client: `src/lib/firebase.ts` initializes Firebase Web SDK; connects to emulators in dev.
- Server: `src/lib/firebase.server.ts` initializes Admin SDK from `FIREBASE_SERVICE_ACCOUNT_JSON`.
- Sessions: `/api/auth/session` creates a revocable Firebase session cookie from an ID token (CSRF + Origin enforced). `/api/auth/me` verifies the session cookie with `checkRevoked=true`.

## Security

- CSRF: double-submit token via `x-csrf-token` header, checked against a cookie. Origin is validated against `NEXT_PUBLIC_APP_URL`.
- Cookies: session cookie is `httpOnly`, `sameSite=lax`, `secure` in production.
- Secrets: use `.env.local` for local dev; sync to Google Secret Manager via scripts under `scripts/**`.
- Gitleaks: runs locally and in CI to prevent secret leaks.

## AI integration

- Genkit configuration: `src/ai/genkit.ts`
- Flow example: `src/ai/flows/conflict-flagging.ts` (zod IO schemas, `ai.definePrompt`, `ai.defineFlow`).
- Server action example: `src/app/actions/conflict-actions.ts`
- Client wiring example: `src/components/conflict-detector/conflict-detector.tsx`

## Developer workflows

- pnpm commands:
  - `pnpm run dev:web` – Next dev server on 3000
  - `pnpm run dev:api` – Firebase emulators (auth 9099, firestore 8080, storage 9199, UI 4000)
  - `pnpm run dev` – run both
  - `pnpm run stop` – stop ports/processes
  - Quality gates: `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `pnpm run gitleaks:scan`
- VS Code tasks:
  - Start All (Web + API)
  - Complete: Stabilize & Validate (ensure pnpm, install, husky, lint/typecheck/build/gitleaks, CLI checks)
  - Cloud tasks: GCP/Firebase setup, service accounts, secrets sync, status

## Environment & CLI

- `.env.local` holds Firebase web config (NEXT*PUBLIC_FIREBASE*\*). Admin uses `FIREBASE_SERVICE_ACCOUNT_JSON`.
- Scripts:
  - `scripts/setup-cli-config.sh` – orchestrates GCP + Firebase + SAs + secrets; `full|interactive|validate|status`
  - `scripts/setup-gcp.sh`, `scripts/setup-firebase.sh`, `scripts/service-accounts.sh`
  - `scripts/secrets-management.sh` – sync to/from Secret Manager
  - `scripts/env-utils.sh` – validate and manage env files

## Conventions

- Import alias `@/*` (see `tsconfig.json`).
- Keep server logic in route handlers under `src/app/api/**` and use CSRF/origin checks for mutating endpoints.
- Emulators-first development; production deploys should use restricted API keys and proper Firebase security rules.

## Next steps (feature patterns)

- Add new AI features: copy the flow/action/component pattern from conflict detector.
- Define Firestore collections for employees, schedules, requests; add indexes when Firestore prompts you.
- Consider an onboarding flow to create/join orgs and set custom claims server-side with Admin SDK.
