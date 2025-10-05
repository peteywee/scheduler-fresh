# Copilot Instructions (Concise) – Scheduler Fresh

Production PWA: Next.js 15 App Router + TypeScript 5 + Firebase (Auth, Firestore, Storage, Functions) + Genkit AI. Package manager: pnpm. Testing: Vitest (unit/rules) + Playwright (E2E). STRICT SECURITY & TENANCY.

## Core Principles

1. Never guess: fetch exact docs (versions from `package.json`).
2. Multi-tenant isolation: org data (`orgs/{orgId}`) vs parent billing (`parents/{parentId}`) append‑only ledgers.
3. No client writes to `parents/**`; ledger lines created only by server code/functions.
4. Validate inputs with Zod before persistence or AI calls.
5. ESM only; no CommonJS.

## Critical Paths & Data Flow

Attendance → Approval → Function trigger → Ledger line
`orgs/{orgId}/attendance/{eventId}` (approved) ⇒ derive contract + period ⇒ append line under `parents/{parentId}/ledgers/{periodId}/lines/{lineId}` (no PII: use `staffRef`). Corrections = compensating lines (no mutation).

## Key Files

`firestore.rules` (strict tenancy; always use `exists()` before `get().data`).
`src/app/api/**` (API routes; must verify Firebase session/custom claims).
`functions/src/index.ts` + `replicateAttendance.ts` (approval replication logic).
`src/lib/firebase.server.ts` / `firebase.client.ts` (Admin vs client initialization, emulator support).
`src/ai/flows/conflict-flagging.ts` (Genkit AI flow pattern: zod in/out, structured result).

## Conventions

React Server Components by default; add `'use client'` only when using hooks/state.
Form pattern: schema (Zod) → React Hook Form resolver → server action/API re-validate.
Imports: external → internal alias (`@/lib`, `@/components`) → relative.
Tailwind + `cn()` for conditional class merging; prefer shadcn/ui primitives.
No `any` unless commented justification. Prefix intentionally unused vars with `_`.

## Build & Test Commands

Dev: `pnpm dev` (web + emulators) | Unit: `pnpm test:run` | Rules: `pnpm test:rules` | E2E: `pnpm test:e2e` | Typecheck: `pnpm typecheck` | Lint: `pnpm lint` | Build: `pnpm build`.
CI separates web/functions/e2e; keep changes green across all.

## Firestore / Security Gotchas

Never add cross-tenant queries. Keep parent ledger immutable—only append. Avoid PII in parent collections (only IDs). For new rules: replicate existing pattern of `allow read: if isOrgMember()` style + `exists()` guards.

## Functions (v5 upgrade target)

Use modular triggers: `import { onDocumentWritten } from 'firebase-functions/firestore'`. Single Admin init. Idempotency: ensure function doesn’t duplicate ledger lines (check by attendance ID before insert if you extend logic).

## AI / Genkit Pattern

Zod schema defines flow input & output. Keep AI invocation in server action or API route; never leak secrets. Log minimal non-PII. If adding a new flow, mirror `conflict-flagging.ts` file structure.

## Output Format (When Proposing Changes)

Respond with: 1) What changed 2) Why 3) How to verify (commands) 4) Sources (doc URLs). Ask a focused question if any assumption remains.

## Common Pitfalls

- Forgetting to exclude `functions/**` from root typecheck (already excluded – keep it so).
- Mixing v1/v5 Firebase Functions import styles: stay consistent (modular v5).
- Putting `themeColor`/`viewport` inside `metadata` instead of dedicated `viewport` export.
- Using ledger PII (disallowed) or mutating existing ledger lines.

## When to Stop & Ask

If a needed API or rule nuance isn’t in the repo or official docs you fetched—pause and request clarification instead of inventing behavior.

---

Refine this file if architecture or workflows shift (new collections, build steps, or function patterns). Keep it concise.
