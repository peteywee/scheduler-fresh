## Copilot Instructions · Scheduler Fresh

Goal: get productive fast in this Next.js 15 + Firebase app with AI (Genkit) and security-first workflows.

Architecture map

- Routes: `src/app/(app)/**` (auth-required UI: dashboard, conflict-detector, requests, settings); `src/app/(auth)/**` (public: login, signup).
- API (no Cloud Functions): `src/app/api/**`. Key auth endpoints: `api/auth/session`, `api/auth/me`.
- AI: `src/ai/genkit.ts` config; flows in `src/ai/flows/**` (e.g., `conflict-flagging.ts` with zod IO, `ai.definePrompt/defineFlow`).
- Server actions: `src/app/actions/**` bridge forms → AI flows (`detectConflictsAction` → `flagConflicts`).
- UI: shadcn/ui in `src/components/ui/**`; app components in `src/components/**`.

Auth model (Firebase Web + Admin)

- Client SDK: `src/lib/firebase.ts` initializes Auth/Firestore/Storage and connects emulators in dev.
- Admin SDK: `src/lib/firebase.server.ts` reads `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON or base64) to verify session cookies.
- Sessions: POST `/api/auth/session` creates a Firebase session cookie from an ID token; DELETE clears it. CSRF via `x-csrf-token`; Origin checked against `NEXT_PUBLIC_APP_URL`. GET `/api/auth/me` verifies session cookie (revocation enabled).

Patterns to copy

- AI flow: define zod schemas → `ai.definePrompt` → `ai.defineFlow` → export wrapper. See `src/ai/flows/conflict-flagging.ts`.
- Form → action → AI: `src/components/conflict-detector/conflict-detector.tsx` → `detectConflictsAction` → `flagConflicts`.
- Protected UI: wrap app pages in `(app)` group; auth pages in `(auth)`; client auth context in `src/lib/auth-context.tsx`.

Developer workflows (pnpm only)

- Start: `pnpm run dev` (web+emulators) or tasks: Start All (Web + API).
- Web: `pnpm run dev:web` (3000). API/Emulators: `pnpm run dev:api` (auth 9099, firestore 8080, storage 9199, UI 4000).
- Quality gates: `pnpm run typecheck`, `pnpm run lint --max-warnings=0`, `pnpm run build`, `pnpm run gitleaks:scan`.
- One-click validation: VS Code task “Complete: Stabilize & Validate”.

Env & secrets

- `.env.local` holds Firebase web config; service account JSON is provided via `FIREBASE_SERVICE_ACCOUNT_JSON` (raw or base64).
- Use scripts: `./scripts/setup-cli-config.sh full|interactive`, `./scripts/secrets-management.sh` to sync with Secret Manager.

Conventions & guardrails

- Import aliases: `@/*` (see `tsconfig.json`). Keep server logic in route handlers; prefer emulator-first development.
- Next build is lenient (see `next.config.ts`), but CI enforces lint/typecheck and gitleaks.

Example: add a new AI flow

1. Create `src/ai/flows/my-flow.ts` with zod input/output; define prompt + flow; export wrapper.
2. Add a server action in `src/app/actions/**` that validates input (FormData or JSON) and calls the flow.
3. Wire a client component to call the action and render result.

More details: see `docs/architecture.md` for data flows, security (CSRF, sessions), and CLI setup tasks.
