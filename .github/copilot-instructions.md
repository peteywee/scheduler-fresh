# Copilot Instructions for Scheduler-Fresh

This repository is a **Next.js 15** project using **TypeScript**, **pnpm**, **Firebase (Auth, Firestore, Storage)**, and **Playwright/Vitest** for testing.  
CI/CD runs via **GitHub Actions** and Dockerized builds. Development environment is Debian 12 (systemd, pnpm, Node.js 22).

## Code Standards

- **TypeScript**: Strict mode, no `any` unless justified.
- **Imports**: Always use ESM (`import` syntax). No CommonJS.
- **Linting**: Run `pnpm lint` before committing. ESLint + Prettier enforced.
- **Secrets**: Never hardcode. Use `.env.local` or GitHub Secrets.
- **Commits**: Conventional commits (`feat:`, `fix:`, `chore:`).

## Development Flow

- Install deps: `pnpm install`
- Dev server: `pnpm dev` (runs web + API emulators)
- Build: `pnpm build`
- Test: `pnpm test` (Vitest)
- Test rules: `pnpm test:rules` (Firestore rules with emulator)
- E2E tests: `pnpm test:e2e` (Playwright)
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`

## Repository Structure

- `src/`: Next.js 15 app (App Router, pages, components, API routes)
- `functions/`: Firebase Cloud Functions (TypeScript, Node 20)
- `types/`: Shared TypeScript types and Zod schemas
- `scripts/`: Utilities and setup scripts
- `.github/`: Workflows, Copilot instructions, CI/CD
- `docs/`: Project documentation

## Key Guidelines

1. Always validate data with **Zod** before persistence.
2. Use **React Server Components** where possible; avoid heavy client code.
3. Write unit and integration tests for new functionality.
4. Follow **modern UX-first** component design (Tailwind + shadcn/ui).
5. Respect **file conventions** (`page.tsx` in routes, `lib/` for utilities).
