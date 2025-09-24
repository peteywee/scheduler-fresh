# Copilot Instructions · Scheduler Fresh

Purpose: Make AI agents productive immediately in this Next.js 15 + Firebase (Web + Admin) + Genkit app, with security-first, pnpm-only workflows.

## Architecture map

- App Router: `(app)` authenticated app `src/app/(app)/**`, `(auth)` public auth `src/app/(auth)/**`
- API routes: `src/app/api/**` (no Cloud Functions). Key auth routes: `auth/{session,me,csrf}/route.ts`
- Server actions: `src/app/actions/**` bridge forms → AI flows and server logic
- AI: Genkit in `src/ai/genkit.ts`; flows in `src/ai/flows/**` (zod schemas + `ai.definePrompt` + `ai.defineFlow`)
- UI: shadcn/ui primitives `src/components/ui/**`; feature components under `src/components/**`
- Data: Firebase Web SDK on client (`src/lib/firebase.ts`); Admin SDK on server (`src/lib/firebase.server.ts`)

## Auth & security (copy these patterns)

- Session cookie: POST `/api/auth/session` creates `__session` via Admin SDK; DELETE revokes/clears. See `src/app/api/auth/session/route.ts`
- CSRF: GET `/api/auth/csrf` sets `XSRF-TOKEN` cookie. Mutating routes must enforce double-submit: header `x-csrf-token` equals cookie. See `src/app/api/auth/csrf/route.ts`
- Allowed origins: compute from `NEXT_PUBLIC_APP_URL` + localhost. Block others. See `allowOrigin(...)` in auth routes
- Verify auth in APIs: read `__session` cookie and call `adminAuth().verifySessionCookie(session, true)`
- Client SDK: `src/lib/firebase.ts` config via `NEXT_PUBLIC_FIREBASE_*`; connects to emulators in dev (auth 9099, firestore 8080, storage 9199)
- Admin SDK: `src/lib/firebase.server.ts` loads `FIREBASE_SERVICE_ACCOUNT_JSON` (raw or base64)

## Patterns to copy (with examples)

- AI flow: `src/ai/flows/conflict-flagging.ts` — define zod input/output, `ai.definePrompt`, then `ai.defineFlow`; export a thin wrapper
- Server action: `src/app/actions/conflict-actions.ts` — read `FormData`, validate presence, call flow, return `{result,error}`
- Client form wiring: `src/components/conflict-detector/conflict-detector.tsx` — `useFormState(detectConflictsAction, initialState)` and render result/errors
- API route scaffold (mutating):
  1.  `allowOrigin(req)` vs `NEXT_PUBLIC_APP_URL` + localhost
  2.  `validateCsrf(req)` double-submit token
  3.  Verify `__session` with Admin SDK, then perform work. See `auth/session` route for structure
- Org membership utilities: use `addUserToOrg`, `isUserOrgAdmin` from `src/lib/auth-utils.ts` to update Firestore and custom claims consistently

## Developer workflows (pnpm-only)

- Start web: `pnpm run dev:web` (Next on 3000)
- Start emulators: `pnpm run dev:api` (auth 9099, firestore 8080, storage 9199)
- Both: `pnpm run dev` • Stop: `pnpm run stop`
- Quality gates: `pnpm run typecheck` • `pnpm run lint --max-warnings=0` • `pnpm run build` • `pnpm run gitleaks:scan`
- VS Code tasks: “Start All (Web + API)”, “Validate: Full Pipeline”, and “Complete: Stabilize & Validate” mirror the above

## Conventions & guardrails

- Import aliases: `@/components`, `@/lib`, `@/hooks`, `@/ai`
- No Cloud Functions; keep server logic in route handlers under `src/app/api/**`
- Enforce CSRF + allowed origins on ALL mutating routes; verify session cookie before privileged ops
- Prefer emulator-first development; don’t hardcode project IDs
- Commit/PR gate: run typecheck + lint + build + gitleaks (husky + CI protect secrets)

## Useful file pointers

- Auth session cookie flow: `src/app/api/auth/{session,me,csrf}/route.ts`
- Admin SDK init: `src/lib/firebase.server.ts` • Client SDK: `src/lib/firebase.ts`
- Org/claims helpers: `src/lib/auth-utils.ts`
- AI setup: `src/ai/genkit.ts` • Example flow: `src/ai/flows/conflict-flagging.ts`
- Example end-to-end chain (form → action → AI → UI):
  `src/components/conflict-detector/conflict-detector.tsx` →
  `src/app/actions/conflict-actions.ts` →
  `src/ai/flows/conflict-flagging.ts`

Feedback: If any section is unclear or you need more examples (e.g., additional API route scaffolds or org request handling), ask and we’ll refine this doc.
