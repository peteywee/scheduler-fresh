# Scheduler

Security-first, pnpm-only project scaffold.

## Copilot Agent Operating Instructions

**Context:** This repo uses pnpm, Husky hooks, Firebase emulators, and Next.js.

### Commands Copilot can run

- Start web (Next dev): `pnpm run dev:web`
- Start API (Firebase emulators): `pnpm run dev:api`
- Start both: `pnpm run dev`
- Kill all dev processes: `pnpm run stop`
- Typecheck: `pnpm run typecheck`
- Lint: `pnpm run lint`
- Format: `pnpm run format`
- Build: `pnpm run build`
- Secret scan (full): `pnpm run gitleaks:scan`

### Rules / Expectations

- Always use **pnpm** for install and scripts.
- Do not commit `.env` files; use `.env.example`.
- Before opening a PR, ensure:
  - `pnpm run typecheck` passes
  - `pnpm run lint` passes
  - `pnpm run build` succeeds
- When adding deps, prefer `pnpm add <pkg>` (runtime) or `pnpm add -D <pkg>` (dev).
- Local API uses **Firebase emulators** (auth, firestore, storage). No Cloud Functions; server logic lives in **Next.js route handlers**.
