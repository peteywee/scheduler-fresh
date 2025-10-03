---
applyTo: "**"
description: "Scheduler PWA — Next.js + Firebase/Firestore, Functions, Vitest. Never guess. Use MCP to fetch version-correct docs before coding."
---

# Copilot Instructions: Scheduler PWA

This document outlines the operating principles, tech stack ground truth, and specific guidelines for using Copilot within the Scheduler PWA project. Adhering to these instructions ensures consistency, security, and maintainability across the codebase.

## Operating Principles (non-negotiable)

- **Never guess.** If uncertain about an API, rule, config, or behavior: **pause and fetch docs via MCP** (Context7 for vendor docs, GitHub MCP for repo/PR/issues).
- **Use installed versions**: infer from `package.json`, lockfiles, imports. Do not propose APIs that don’t exist in those versions.
- **Security first**: least privilege, no secrets in logs, PII stays inside tenant scope; parent ledger is append-only and **server-written only**.
- **TypeScript by default** with Zod validation. Keep code composable and testable.

## Tech Stack Ground Truth

- **Frontend**: Next.js App Router (TypeScript), PWA (service worker + manifest).
- **Backend**: Firebase/Firestore with **Rules v2**; Functions (Node 20).
- **Testing**: Vitest (+ Firestore emulator for rules tests).
- **Schemas/Utils**: Zod, date-fns.
- **Data model** (do not deviate):
  - `orgs/{orgId}/...` = sub-org tenant scope (venues, staff, schedules, **attendance**).
  - `parents/{parentId}/contracts/{subOrgId}` = billRate, rounding, pay period.
  - `parents/{parentId}/ledgers/{periodId}/lines/{lineId}` = **append-only** derived lines (no PII; use `staffRef`).
- **Rules**: No client reads across tenants; **no client writes** to `parents/**`; use `exists(...)` before `get(...).data` to avoid Null errors.

## MCP-First Retrieval Protocol

When you’re not 100% sure:

1. **Determine versions** from `package.json` or lockfile.
2. **Fetch docs with Context7 MCP** for the exact version:
   - Firestore (client SDK + **security rules v2**, emulator)
   - Firebase Functions (Node 20)
   - Next.js App Router (routing, caching, RSC constraints)
   - PWA (service worker + manifest)
   - Vitest & @firebase/rules-unit-testing
   - Zod, date-fns
3. **(If codebase context helps)** use **GitHub MCP** to open files, PRs, or issues for local conventions.
4. **Only then** generate code/tests. If ambiguity remains, ask **one specific clarifying question**.

## Code & Review Standards (this repo)

- **Firestore Rules**:
  - No `get(...).data` without `exists(...)`.
  - Parent ledger: **read-only** to parent admins; writes are server-only via Functions.
  - Attendance create/update validations as per org scope; deny deletes from clients.
- **Functions**:
  - Use Admin SDK singleton; Node 20 target.
  - Replication: attendance `approved` → append ledger line; reversals create compensating lines.
- **Next.js API routes**:
  - Auth: verify ID token; enforce `{ parentAdmin: true, parentId: <id> }` claims for parent endpoints.
  - CSV exports: escape properly; no PII joins unless documented server-side.
- **Testing**:
  - Vitest unit tests for helpers.
  - **Rules tests** via emulator for positive/negative cases.
  - Provide minimal, deterministic tests for new logic.

## Output Format (when proposing code)

- **What changed** (bullets)
- **Why** (tie to requirements + docs)
- **How to verify** (exact commands)
- **Sources** (doc URLs + versions from MCP fetch)

## When to stop

## When to stop

If docs cannot be retrieved or behavior cannot be confirmed → **stop and ask**. Do **not** invent APIs or speculate.

Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
