# Copilot Instructions · Scheduler Fresh

**Purpose:** help agents be productive immediately in this Next.js + Firebase + Genkit app with opinionated security/dev workflows.

## Architecture Map

- **Routing (Next.js 15):** `(app)` authenticated app at `src/app/(app)/**`; `(auth)` public auth at `src/app/(auth)/**`
- **API routes:** `src/app/api/**` (no Cloud Functions). Auth endpoints at `src/app/api/auth/{session,me,csrf}/route.ts`
- **Server actions:** `src/app/actions/**` bridge forms → AI flows (e.g., `detectConflictsAction` calls `flagConflicts`)
- **AI:** Genkit configured in `src/ai/genkit.ts`; flows in `src/ai/flows/**` (see `conflict-flagging.ts` with zod IO + `ai.defineFlow`)
- **UI:** shadcn/ui primitives in `src/components/ui/**`; business components in `src/components/**` (conflict-detector, layout, schedule)

## Auth Model (Firebase Web + Admin)

- **Client config:** `src/lib/firebase.ts` initializes Auth/Firestore/Storage and connects emulators in dev
- **Admin SDK:** `src/lib/firebase.server.ts` reads `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON or base64) to verify session cookies
- **Sessions:** POST `/api/auth/session` mints a revocable Firebase session cookie from an ID token; DELETE clears it. CSRF is enforced via double-submit header; origin checked against `NEXT_PUBLIC_BASE_URL`. Use `/api/auth/me` to get the user

## Patterns to Copy

- **AI flow (server):** `src/ai/flows/conflict-flagging.ts` - zod schemas → `ai.definePrompt(...)` → `ai.defineFlow(...)` → exported wrapper `flagConflicts(input)`
- **Server action (form → AI):** `src/app/actions/conflict-actions.ts` reads `FormData`, validates, calls `flagConflicts`, returns `{result,error}`
- **Client usage:** `src/components/conflict-detector/conflict-detector.tsx` uses `useFormState(detectConflictsAction, initialState)` and renders results

## Developer Workflows (pnpm-only)

- **Web:** `pnpm run dev:web` (Next on 3000)
- **API:** `pnpm run dev:api` (Firebase emulators: auth 9099, firestore 8080, storage 9199, UI 4000)
- **Both:** `pnpm run dev` • **Stop:** `pnpm run stop`
- **Quality gates:** `pnpm run typecheck`, `pnpm run lint --max-warnings=0`, `pnpm run build`, `pnpm run gitleaks:scan`

## Conventions & Guardrails

- **Import aliases:** `@/components`, `@/lib`, `@/hooks`, `@/ai`
- **Security-first:** Husky runs lint-staged + gitleaks; CI runs gitleaks. Prefer emulator-first development; keep server logic in route handlers
- **Feature flow:** zod schema (if AI) → server action → component wiring. Keep API logic in `src/app/api/**` and enforce CSRF/origin on mutating endpoints
- **Before commit/PR:** run typecheck + lint + build + gitleaks
