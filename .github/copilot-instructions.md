# Copilot Instructions for Scheduler-Fresh

This repository is a **Next.js 15** PWA project using **TypeScript 5**, **pnpm**, **Firebase (Auth, Firestore, Storage, Functions)**, **Vitest**, and **Playwright** for testing.  
CI/CD runs via **GitHub Actions** and Dockerized builds. Development environment is Debian 12 (systemd, pnpm, Node.js 20/22).

## 🎯 Operating Principles (Non-Negotiable)

- **Never guess.** If uncertain about an API, rule, config, or behavior: **pause and fetch docs via MCP** (Context7 for vendor docs, GitHub MCP for repo/PR/issues).
- **Use installed versions**: Infer from `package.json`, lockfiles, imports. Do not propose APIs that don't exist in those versions.
- **Security first**: Least privilege, no secrets in logs, PII stays inside tenant scope; parent ledger is append-only and **server-written only**.
- **TypeScript by default** with Zod validation. Keep code composable and testable.
- **ESM only**: Always use ES modules (`import`/`export`). No CommonJS.

## 🛠️ Tech Stack Ground Truth

### Frontend

- **Framework**: Next.js 15 App Router (TypeScript 5)
- **UI**: React 18, TailwindCSS 3, shadcn/ui, Radix UI
- **PWA**: Service Worker, Web App Manifest
- **Forms**: React Hook Form + Zod validation
- **State**: React Context + Server Components
- **Charts**: Recharts

### Backend

- **Database**: Firebase/Firestore with **Rules v2**
- **Functions**: Firebase Functions (Node 20)
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage
- **AI**: Genkit + Google AI

### Testing & Quality

- **Unit/Integration**: Vitest + jsdom
- **E2E**: Playwright
- **Rules Testing**: @firebase/rules-unit-testing + Firestore emulator
- **Linting**: ESLint 9 + TypeScript ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode
- **Secrets Scanning**: Gitleaks
- **Code Quality**: DeepSource

### DevOps

- **Package Manager**: pnpm 10.17.1
- **Node Version**: >=20.0.0
- **Git Hooks**: Husky + lint-staged
- **CI/CD**: GitHub Actions
- **Container**: Docker (Debian 12)

## 📁 Repository Structure

```
scheduler-fresh/
├── .github/                    # GitHub configs, workflows, Copilot instructions
│   ├── copilot-instructions.md
│   ├── instructions/           # Path-specific Copilot rules
│   └── copilot-setup-steps.yml
├── docs/                       # Architecture, blueprints, guides
├── functions/                  # Firebase Functions (Node 20)
│   └── src/
│       ├── index.ts
│       └── replicateAttendance.ts
├── public/                     # Static assets, PWA manifest
├── scripts/                    # Setup, deployment, utility scripts
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # Authenticated routes
│   │   ├── (auth)/            # Auth routes (login, signup)
│   │   ├── actions/           # Server actions
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── layout/
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # React hooks
│   ├── lib/                   # Utilities, Firebase setup, types
│   ├── test/                  # Test utilities and rules tests
│   └── __tests__/             # Unit tests
├── types/                     # Global TypeScript declarations
├── firestore.rules            # Firestore security rules
├── firebase.json              # Firebase configuration
└── package.json               # Dependencies and scripts
```

## 🔒 Data Model & Security Rules

**Do not deviate from this structure:**

### Collections

- `orgs/{orgId}/...` — Sub-org tenant scope (venues, staff, schedules, **attendance**)
- `parents/{parentId}/contracts/{subOrgId}` — Bill rate, rounding, pay period
- `parents/{parentId}/ledgers/{periodId}/lines/{lineId}` — **Append-only** derived lines (no PII; use `staffRef`)

### Security Rules

- No client reads across tenants
- **No client writes** to `parents/**`
- Use `exists(...)` before `get(...).data` to avoid null errors
- Attendance: create/update validations within org scope; deny client deletes
- Parent ledger: read-only to parent admins; writes are server-only via Functions

## 🚀 Development Flow

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev:web          # Next.js dev server (port 3000)
pnpm dev:api          # Firebase emulators (auth, firestore, storage)
pnpm dev              # Run both concurrently
```

### Building

```bash
pnpm build            # Production build
pnpm typecheck        # Type checking only
```

### Testing

```bash
pnpm test             # Run Vitest unit tests
pnpm test:run         # Run tests once (excluding rules)
pnpm test:rules       # Firestore rules tests with emulator
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright UI mode
```

### Code Quality

```bash
pnpm lint             # ESLint check
pnpm format           # Prettier format
pnpm gitleaks:scan    # Scan for secrets
```

### Cleanup

```bash
pnpm stop             # Kill all dev processes
pnpm kill:ports       # Kill ports 3000, 8080, 9099, 9199
pnpm emu:kill         # Kill Firebase emulators
```

## 📝 Code Standards

### TypeScript

- **Strict mode** enabled
- No `any` unless justified with comment
- Prefer `interface` for object types, `type` for unions/intersections
- Use Zod schemas for runtime validation

### Imports & Modules

- Always use **ESM** syntax (`import`/`export`)
- No CommonJS (`require`, `module.exports`)
- Group imports: external → internal → relative
- Use absolute imports where configured

### React Components

- **Functional components only** (no classes)
- TypeScript interfaces for props
- Prefer Server Components (default in Next.js App Router)
- Use Client Components (`'use client'`) only when needed (hooks, events, state)
- Keep components small and composable
- Document non-trivial logic with inline comments

### Styling

- **TailwindCSS** for styling
- **shadcn/ui** components for UI consistency
- Use `cn()` utility for conditional classes
- Follow mobile-first responsive design

### Forms & Validation

- **React Hook Form** for form state
- **Zod** schemas for validation
- Use `@hookform/resolvers` for Zod integration
- Validate on both client and server

### API Routes & Server Actions

- Verify Firebase ID token on all protected routes
- Enforce custom claims for role-based access
- Use Zod to validate request bodies
- Return proper HTTP status codes
- Handle errors gracefully with meaningful messages

### Firebase Functions

- Use Admin SDK singleton pattern
- Target Node 20
- Implement idempotency for write operations
- Log structured data for monitoring
- Handle errors and retry logic

### Security

- **Never hardcode secrets** (use `.env.local` or GitHub Secrets)
- No PII in logs or error messages
- Validate and sanitize all user inputs
- Follow principle of least privilege
- Use Firebase Security Rules as primary defense

### Testing

- Write unit tests for utilities and helpers
- Test React components with Testing Library
- Use Firestore emulator for rules tests
- E2E tests for critical user flows
- Each test must be independent
- Use descriptive test names and assertions

### Git & Commits

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Keep commits atomic and focused
- Write clear commit messages
- Run `pnpm lint` and `pnpm test:run` before committing
- Husky + lint-staged will auto-fix and validate

## 🧪 MCP-First Retrieval Protocol

When uncertain about APIs, configs, or behavior:

1. **Determine versions** from `package.json` or lockfile
2. **Fetch docs with Context7 MCP** for the exact version:
   - Firestore (client SDK + **security rules v2**, emulator)
   - Firebase Functions (Node 20)
   - Next.js 15 App Router (routing, caching, RSC constraints)
   - PWA (service worker + manifest)
   - Vitest & @firebase/rules-unit-testing
   - Zod, date-fns, React Hook Form
3. **(If codebase context helps)** use **GitHub MCP** to open files, PRs, or issues for local conventions
4. **Only then** generate code/tests. If ambiguity remains, ask **one specific clarifying question**

## 📋 Output Format (When Proposing Code)

Always structure your response as:

1. **What changed** (bullet points)
2. **Why** (tie to requirements + docs)
3. **How to verify** (exact commands to run)
4. **Sources** (doc URLs + versions from MCP fetch)

## ⚠️ When to Stop

If docs cannot be retrieved or behavior cannot be confirmed → **stop and ask**. Do **not** invent APIs or speculate.

## 🎓 Key Guidelines

1. Always validate data with **Zod** before persistence
2. Use **React Server Components** where possible; minimize client code
3. Write unit and integration tests for new functionality
4. Follow **modern UX-first** component design (Tailwind + shadcn/ui)
5. Respect **file conventions** (`page.tsx` in routes, `lib/` for utilities)
6. Keep security rules tight and test them with emulator
7. Document complex logic and architectural decisions
8. Optimize for performance (lazy loading, code splitting, caching)
9. Ensure accessibility (semantic HTML, ARIA labels, keyboard navigation)
10. Progressive enhancement for PWA features

## 📚 Additional Resources

- [Architecture Documentation](../docs/architecture.md)
- [Firebase Setup Guide](../docs/firebase-gcp-cli-setup.md)
- [Quickstart Guide](../docs/QUICKSTART.md)
- [Implementation Details](../docs/IMPLEMENTATION.md)

---

**Remember**: This is a production PWA with strict security requirements. When in doubt, consult the MCP docs and ask clarifying questions rather than making assumptions.
