# Copilot Instructions – Staff Scheduler (scheduler-fresh)

Authoritative guidance for GitHub Copilot (Chat & Completions) in this repository.  
Audience: engineers, reviewers, AI pair assistant.  
Goal: generate code, tests, and analysis that are production‑ready, minimal, and aligned with project standards.

---

## 1. Project Context

A Next.js 15 (App Router, React Server Components) TypeScript 5 application implementing authenticated scheduling workflows (staff, shifts, availability) with Firebase (Auth/Firestore/Storage) as backend services. Performance, contract integrity, and accessibility are first-class.

---

## 2. Canonical Technology Stack

- Language: TypeScript 5.x (ESM only)
- Framework: Next.js 15 (App Router, RSC first; client components opt‑in via `"use client"`)
- UI: React 18, Tailwind CSS
- Data & Auth: Firebase v10+ (modular SDK).
  - Client SDK ONLY in client components or explicit client utility modules.
  - Server usage via Admin SDK wrappers or REST where applicable (never import client SDK in server components).
- Validation & Contracts: Zod
- Forms: react-hook-form + @hookform/resolvers + Zod
- Data Fetching / Caching: server data fetching preferred; TanStack Query only where reactive client state needed
- Dates: date-fns
- IDs: ulid or uuidv7
- Testing: Vitest (unit/contract), Playwright (auth, onboarding, scheduling flows)
- PWA: Workbox-generated service worker (never hand-edit generated `sw.js`)
- Env Validation: `src/lib/env.ts` (single source)
- Schemas: `src/lib/types.ts`
- Firebase Init: `src/lib/firebase.ts`, `src/lib/firebase.server.ts`
- PWA Registration: `src/app/pwa/register-sw.client.ts`

---

## 3. Architectural Principles

1. Feature Orientation: Group related logic under `app/` (route segments) and `components/` (cross-route feature modules).
2. Clear Boundaries: Use Zod schemas at all external and cross-layer boundaries.
3. Server-First: Prefer server components & server actions; introduce client components only when interaction/state requires.
4. Deterministic Contracts: All API route handlers validate both input and output.
5. Side Effects Isolation: External integrations & mutation logic live in `services/` modules (pure where possible).
6. Error Shape: Always `{ code: string; message: string; details?: unknown }`.
7. Accessibility: WAI-ARIA roles, keyboard navigation, contrast. Do not remove semantics for styling convenience.
8. Performance Discipline: Avoid waterfalls; apply parallel `Promise.all`; code-split large or rarely used client bundles; prefetch critical routes.
9. No Duplication: Prefer extraction over copy—shared types live in `src/lib/types.ts` or a clearly named `shared/` module.
10. Minimal Surface: Export the narrowest API (avoid leaking internal helpers).

---

## 4. Directory & Naming Conventions

- Filenames / folders: kebab-case (`shift-editor.tsx`, `use-shift-form.ts`)
- Components: PascalCase (`ShiftTable.tsx`)
- Hooks: `useXyz.ts`
- Schemas: `<domain>.schema.ts` or `<entity>-schema.ts`
- Services: `<domain>.service.ts`
- Route handlers: `app/api/<segment>/route.ts`
- Absolute imports via `@/` root alias
- Import order: stdlib → external → internal grouped by feature

---

## 5. When Generating Code – Required Behaviors

Copilot MUST:

- ALWAYS create or reuse a Zod schema for:
  - API request bodies, query params, responses
  - Form validation
  - Environment validation (if new vars)
- Include exhaustive TypeScript types driven from Zod via `z.infer<>`.
- Use async/await with proper error handling; never swallow errors silently.
- Wrap external calls (Firestore, Auth) in domain service functions.
- Provide tests (Vitest) for:
  - Schema parsing success & failure cases
  - Service logic (happy path + at least one negative path)
- Provide Playwright test stubs when adding a user-facing flow (list critical assertions).
- Use structured error codes: prefix by domain (e.g. `shift/not-found`, `auth/unauthorized`).
- Keep React server components free of client-only APIs (e.g. DOM, window, localStorage).
- Mark client components explicitly with `"use client"` at file top.

Copilot MUST AVOID:

- Introducing untyped `any` (except in narrow, justified interop with comment).
- Mixing concerns (no data fetch + complex UI + mutation in one monolith component).
- Duplicating schemas or environment variable parsing.
- Adding libraries without justification (prefer native / existing dependencies).
- Side-effect code in schema or UI modules.
- Using moment.js, dayjs—stick to date-fns.
- Using default Firebase exports; always modular imports.

---

## 6. Error Handling Pattern

Example:

```ts
import { z } from "zod";

export class AppError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, details: err.details };
  }
  return { code: "internal/error", message: "Unexpected error" };
}
```

Use in API route:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createShift } from "@/features/shifts/shift.service";
import { toErrorResponse, AppError } from "@/lib/errors";

const BodySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  staffId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const input = BodySchema.parse(json);
    const shift = await createShift(input);
    return NextResponse.json({ shift });
  } catch (err) {
    return NextResponse.json(toErrorResponse(err), {
      status: err instanceof AppError ? 400 : 500,
    });
  }
}
```

---

## 7. Data Layer Pattern (Firestore Example)

```ts
// lib/types.ts or features/shifts/shift.schema.ts
import { z } from "zod";

export const ShiftSchema = z.object({
  id: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  staffId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Shift = z.infer<typeof ShiftSchema>;
```

```ts
// features/shifts/shift.service.ts
import { ShiftSchema, Shift } from "@/lib/types";
import { firestore } from "@/lib/firebase.server";
import { ulid } from "ulidx";
import { AppError } from "@/lib/errors";

const COLLECTION = "shifts";

export async function createShift(data: {
  start: string;
  end: string;
  staffId: string;
}): Promise<Shift> {
  const id = ulid();
  const now = new Date().toISOString();
  const doc = { id, ...data, createdAt: now, updatedAt: now };
  await firestore.collection(COLLECTION).doc(id).set(doc);
  return ShiftSchema.parse(doc);
}

export async function getShift(id: string): Promise<Shift> {
  const snap = await firestore.collection(COLLECTION).doc(id).get();
  if (!snap.exists)
    throw new AppError("shift/not-found", "Shift not found", { id });
  return ShiftSchema.parse(snap.data());
}
```

---

## 8. Form Pattern (react-hook-form + Zod)

```ts
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ShiftFormSchema = z.object({
  start: z.string().min(1, "Start required"),
  end: z.string().min(1, "End required"),
  staffId: z.string().min(1, "Staff required"),
});

type ShiftFormValues = z.infer<typeof ShiftFormSchema>;

export function ShiftForm({ onSubmit }: { onSubmit: (v: ShiftFormValues) => Promise<void> }) {
  const form = useForm<ShiftFormValues>({ resolver: zodResolver(ShiftFormSchema) });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Inputs with accessible labels */}
      {/* ... */}
      <button type="submit" className="btn-primary" disabled={form.formState.isSubmitting}>
        Save
      </button>
    </form>
  );
}
```

---

## 9. Testing Expectations

Vitest Unit Examples:

```ts
import { describe, it, expect } from "vitest";
import { ShiftSchema } from "@/lib/types";

describe("ShiftSchema", () => {
  it("parses valid shift", () => {
    const data = {
      id: "01H...",
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      staffId: "staff_1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(ShiftSchema.parse(data)).toBeTruthy();
  });

  it("rejects missing staffId", () => {
    expect(() =>
      ShiftSchema.parse({
        id: "01H",
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toThrow();
  });
});
```

Playwright (High-Level Stub):

```ts
import { test, expect } from "@playwright/test";

test("user creates a shift", async ({ page }) => {
  await page.goto("/login");
  // perform auth helper
  await page.goto("/shifts/new");
  await page.fill('[name="start"]', "2025-01-01T09:00");
  await page.fill('[name="end"]', "2025-01-01T10:00");
  await page.click('button:has-text("Save")');
  await expect(page.getByText(/Shift created/i)).toBeVisible();
});
```

---

## 10. Performance & Accessibility Guidance

- Use `loading="lazy"` on non-critical images.
- Split large client-only charts/modals via dynamic import.
- Avoid nested sequential `await` when independent; use `Promise.all`.
- Provide `aria-*` attributes for interactive custom elements.
- Ensure keyboard focus states and `tabIndex` ordering are logical.
- Use Next.js `metadata` for SEO and prefetch hints where relevant.

---

## 11. PWA Rules

- Do NOT edit generated `public/sw.js`.
- New caching logic → configure Workbox build pipeline (not manual patch).
- Register service worker only in `src/app/pwa/register-sw.client.ts`.

---

## 12. Environment Variables

- All new env vars: add to environment validation with Zod validation and explicit narrowing.
- Do not access `process.env` outside validated modules.

Example:

```ts
import { z } from "zod";

export const EnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
```

---

## 13. Accessibility Checklist (Copilot Must Encourage)

- Labels associated (`<label htmlFor>` or `aria-label`)
- Focusable interactive elements (no div-buttons)
- Proper heading hierarchy
- Sufficient color contrast (WCAG AA)
- Keyboard navigable modals (trap + escape to close)

---

## 14. Commit & PR Guidance

Commits: Conventional Commits. Examples:

- feat(shift): add shift creation service
- fix(auth): correct session token refresh race
- refactor(schedule): extract duration utility
- test(pwa): add offline detection tests
- chore(deps): update firebase to v10.x

PR Template (enforced):

```
Title: feat(shift): introduce create shift flow

Executive Summary
[3–6 sentences: outcome, scope boundary, value]

Current State & Evidence
[Quantitative + qualitative before state]

Analysis (Options)
- A:
- B:
- C:

Recommendation
[Chosen path + acceptance criteria]

Risks & Mitigations
- R1:
- R2:
- R3:

Next Actions
- [ ] Step 1
- [ ] Step 2

References
- [Next.js App Router Docs](https://nextjs.org/docs/app)
```

Copilot should autofill this structure when a PR is described.

---

## 15. Anti-Patterns to Reject

- Adding global singletons outside controlled `lib/` modules.
- Inline JSON schema duplication instead of importing existing Zod schema.
- Non-deterministic test assertions (sleep-based waits).
- Broad `catch (e) {}` without translation to structured error.
- Hard-coded dates & IDs in production logic.
- Use of `any` or `@ts-ignore` without a short justification comment.

---

## 16. Example Developer Prompts (for Copilot Chat)

Good:

- "Generate a server action to create a shift using existing ShiftSchema and return structured errors."
- "Refactor shift listing to parallelize Firestore reads; preserve current types."
- "Add Vitest cases covering negative path for createShift when Firestore write fails."
- "Create a new API route POST /api/shifts/batch with Zod validation and tests."

Bad (avoid vagueness):

- "Write scheduling stuff."
- "Make auth better."

---

## 17. Upgrade & Dependency Guidance

- Before introducing a lib, answer: native? existing dependency? cost (bundle, maintenance)?
- For Firebase major bumps: create a migration PR with test pass + smoke Playwright run.
- Keep deps lean; remove abandoned utilities.

---

## 18. Review Checklist (Automated + Human)

Copilot should assist reviewer by verifying:

- Scope matches linked issue(s)
- No duplicate schema or environment parsing
- Input/output validated in all routes
- No client SDK usage in server modules
- Performance: no obvious sequential I/O waterfalls
- Accessibility criteria met
- Tests: schema + service + (if UI flow) Playwright stub
- Error objects structured correctly
- PR template fully populated

---

## 19. Response Style (Copilot Chat)

When explaining changes:

- Be concise: bullet points over prose.
- Cite relevant file paths.
- Provide alternative if ambiguity exists.
- Offer complexity reduction suggestions.

---

## 20. Maintenance

This file is the single source of truth for AI generation standards.  
If a rule conflicts with emergent architecture decisions, update here first, then refactor code.

---

## 21. References (Official Only)

- Next.js App Router: https://nextjs.org/docs/app
- React 18: https://react.dev/
- TypeScript 5: https://www.typescriptlang.org/docs/
- Firebase Web: https://firebase.google.com/docs
- Workbox: https://developer.chrome.com/docs/workbox/
- Zod: https://zod.dev/
- TanStack Query: https://tanstack.com/query/latest

---

## Current Project Architecture (Reference)

### Route Groups

- **`src/app/(app)/**`\*\* - Protected authenticated app pages (dashboard, conflict-detector, requests, settings)
- **`src/app/(auth)/**`\*\* - Public authentication pages (login, signup)
- **`src/app/api/**`\*\* - API route handlers (no Cloud Functions)

### Authentication & Session Management

- **Client SDK:** `src/lib/firebase.ts` - Firebase Auth/Firestore/Storage initialization with emulator connections
- **Admin SDK:** `src/lib/firebase.server.ts` - Server-side Firebase Admin using `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Session Endpoints:**
  - `POST /api/auth/session` - Creates Firebase session cookie from ID token
  - `DELETE /api/auth/session` - Clears session cookie
  - `GET /api/auth/me` - Returns current user from session cookie
  - `POST /api/auth/csrf` - CSRF token generation and validation
- **Security:** CSRF double-submit protection, origin validation against `NEXT_PUBLIC_APP_URL`, session cookie revocation support

### AI Integration (Genkit)

- **Configuration:** `src/ai/genkit.ts` - Genkit setup with Google AI plugin
- **Flows:** `src/ai/flows/conflict-flagging.ts` - AI flow with zod input/output schemas for schedule conflict detection
- **Bridge:** `src/app/actions/conflict-actions.ts` - Server actions that connect forms to AI flows
- **Pattern:** zod validation → AI flow execution → structured response

### Component Architecture

- **UI Primitives:** `src/components/ui/**` - shadcn/ui base components (buttons, forms, dialogs)
- **Business Components:** `src/components/**` - Application-specific components
  - `conflict-detector/` - AI conflict detection interface
  - `layout/` - App shell, navigation, headers
  - `schedule/` - Schedule management components
  - `auth/` - Authentication forms and flows

### Firebase Configuration

- **Emulators:** Auth (9099), Firestore (8080), Storage (9199), UI (4000)
- **Rules:** `firestore.rules` and `storage.rules` with security rules and tenancy patterns
- **Indexes:** `firestore.indexes.json` for query optimization

### Development Workflow (pnpm-only)

- Start web: `pnpm run dev:web` (Next on 3000)
- Start emulators: `pnpm run dev:api` (auth 9099, firestore 8080, storage 9199, UI 4000)
- Both: `pnpm run dev` • Stop: `pnpm run stop`
- Quality gates: `pnpm run typecheck` • `pnpm run lint --max-warnings=0` • `pnpm run build` • `pnpm run gitleaks:scan`
- Testing: `pnpm run test` (Vitest) • `pnpm run test:e2e` (Playwright) • `pnpm run test:rules` (Firebase rules)

### Import Aliases

- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/ai` → `src/ai`

### Security & Auth Patterns

- Session cookie: POST `/api/auth/session` creates `__session` via Admin SDK; DELETE revokes/clears
- CSRF: GET `/api/auth/csrf` sets `XSRF-TOKEN` cookie. Mutating routes must enforce double-submit: header `x-csrf-token` equals cookie
- Allowed origins: compute from `NEXT_PUBLIC_APP_URL` + localhost. Block others
- Verify auth in APIs: read `__session` cookie and call `adminAuth().verifySessionCookie(session, true)`
- Org membership utilities: use `addUserToOrg`, `isUserOrgAdmin` from `src/lib/auth-utils.ts`

---

End of Copilot Instructions.
