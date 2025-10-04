# Scheduler PWA

A multi-tenant, security-first scheduling platform built with the Next.js App Router, Firebase/Firestore, and a hardened tooling workflow.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Requirements](#requirements)
3. [Environment Setup](#environment-setup)
4. [Everyday Development Workflow](#everyday-development-workflow)
5. [Automation & Task Runner](#automation--task-runner)
6. [Testing & Quality Gates](#testing--quality-gates)
7. [Port Health Automation](#port-health-automation)
8. [Performance Playbook](#performance-playbook)
9. [Troubleshooting](#troubleshooting)
10. [Reference Documentation](#reference-documentation)

## Project Overview

- **Frontend**: Next.js 15 App Router (TypeScript, Tailwind, Radix UI) with PWA support.
- **Backend**: Firebase Authentication, Firestore (Rules v2), Cloud Functions on Node 20.
- **Data model**: Multi-tenant org/parent schema with append-only parent ledgers and attendance replication.
- **Tooling**: pnpm, Vitest, Playwright, ESLint, Prettier, Husky, custom task runner with presets.

The repository prioritises reproducible environments, least-privilege data access, and deterministic tests. Most automation is exposed through pnpm scripts or the task runner described below.

## Requirements

| Tool             | Version  | Notes                                                                        |
| ---------------- | -------- | ---------------------------------------------------------------------------- |
| Node.js          | ≥ 20.x   | Functions deploy target and TypeScript build assume Node 20 runtime.         |
| pnpm             | 10.x     | `corepack enable` recommended; `packageManager` is pinned in `package.json`. |
| Firebase CLI     | ≥ 14.x   | Needed for emulator suite, rules tests, and deployments.                     |
| Google Cloud CLI | optional | Required for production secret management scripts.                           |

> **Tip:** Run `pnpm run Complete: Stabilize & Validate` to bootstrap pnpm, install deps, and run repo health checks in one go.

## Environment Setup

**🚀 Quick Start:** Follow the [Environment Setup Guide](./ENV_SETUP.md) for step-by-step instructions.

**📋 Issues & Fixes:** Check [Actionable Issues](./ACTIONABLE_ISSUES.md) for known problems and solutions.

The `scripts/` directory contains one-click helpers for bootstrapping Firebase and GCP credentials:

```bash
# First-time setup (service accounts, secrets, CLI config)
./scripts/setup-cli-config.sh full

# Interactive wizard if you want granular control
./scripts/setup-cli-config.sh interactive

# Validate or inspect current configuration
./scripts/setup-cli-config.sh status
./scripts/setup-cli-config.sh validate
```

Populate `.env.local` with the Firebase web config and any feature flags. Use the secrets sync helpers if your project has already been provisioned:

```bash
./scripts/secrets-management.sh sync-from-secrets <gcp-project> .env.local
```

### Essential Setup Steps

1. **Copy environment template**: `cp .env.example .env.local`
2. **Configure Firebase credentials** (see [ENV_SETUP.md](./ENV_SETUP.md))
3. **Create service account**: `./scripts/service-accounts.sh create <project-id>`
4. **Validate setup**: `./scripts/env-utils.sh validate .env.local`
5. **Start development**: `pnpm run dev`

For detailed troubleshooting and advanced configuration, see [ENV_SETUP.md](./ENV_SETUP.md).

## Everyday Development Workflow

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Verify ports are free** _(runs automatically when you start dev servers)_

   ```bash
   pnpm run check:ports
   ```

3. **Start dev servers**
   - Next.js (default watcher):
     ```bash
     pnpm run dev:web
     ```
   - Next.js (Turbopack — faster hot reloads via `next dev --turbopack`):
     ```bash
     pnpm run dev:web:turbo
     ```
   - Firebase emulators (Auth, Firestore, Storage):
     ```bash
     pnpm run dev:api
     ```
   - Both together:
     ```bash
     pnpm run dev
     ```
   - Both with Turbopack for the web app:
     ```bash
     pnpm run dev:turbo
     ```

4. **Stop everything**
   ```bash
   pnpm run stop
   ```

The `dev:*` scripts now invoke an automated port check (see [Port Health Automation](#port-health-automation)) before binding servers. If a port is occupied, the script aborts with guidance instead of crashing your shell.

## Automation & Task Runner

`pnpm run task-runner` discovers all scripts in the workspace and executes them concurrently with retries. Key features:

- **Presets** via `TASK_PRESET` (defined in `task-runner.config.json`). Examples:

  ```bash
  # Lint + type-check the app (default safe bundle)
  TASK_PRESET=core pnpm run task-runner

  # Start both dev servers (Next.js + Firebase emulators)
  TASK_PRESET=full-dev pnpm run task-runner

  # Turbopack-powered dev servers
  TASK_PRESET=frontend-dev-turbo pnpm run task-runner
  TASK_PRESET=full-dev-turbo pnpm run task-runner

  # Combine presets and add ad-hoc filters
  TASK_PRESET=core-with-functions TASK_EXCLUDE=gitleaks pnpm run task-runner
  ```

- **Safety filters**: destructive scripts containing `kill`, `stop`, or `task-runner` are skipped by default. Override with `ALLOW_DESTRUCTIVE=1` when you really need them.
- **Dry runs**: preview which tasks would run without executing anything via `DRY_RUN=1`.
- **Retry support**: configure concurrency and retry counts with `CONCURRENCY` and `MAX_RETRIES`.

See `task-runner.config.json` for the preset catalog. Add new bundles by editing that file; the runner logs any preset descriptions to help with discoverability.

> Need a breather? Create a root-level file named `.task-runner.disabled` (or export `TASK_RUNNER_DISABLED=1`) and the runner will exit immediately with a reminder message. Delete the flag file or unset the variable to restore normal behaviour.

## Testing & Quality Gates

| Command                             | Purpose                                     |
| ----------------------------------- | ------------------------------------------- |
| `pnpm run lint`                     | ESLint with zero-warning policy.            |
| `pnpm run typecheck`                | TypeScript type checking (no emit).         |
| `pnpm run test`                     | Vitest in watch mode.                       |
| `pnpm run test:run`                 | Vitest run excluding Firestore rules tests. |
| `pnpm run test:rules`               | Firestore rules tests via emulator exec.    |
| `pnpm run test:e2e`                 | Playwright end-to-end suite.                |
| `pnpm run Validate: Quality Checks` | Combined lint + typecheck task runner.      |

Before pushing, run the quality checks or use the task runner preset to keep the tree green.

## Port Health Automation

The new `check:ports` script ensures common development ports are available before we attempt to bind servers.

```bash
# Quick scan (defaults to 3000, 8080, 9099, 9199)
pnpm run check:ports

# Custom list (remember the `--` when forwarding args through pnpm)
pnpm run check:ports -- 3000 4000 8080

# JSON summary for tooling
pnpm run check:ports -- --json 3000 8080

# Silent CI probe (exit code only)
pnpm run check:ports -- --silent 3000
```

The CLI now prints a colourised dashboard, automatically suggests a `kill-port` command when conflicts arise, and honours environment switches such as `CHECK_PORTS_JSON=1`, `CHECK_PORTS_HOST`, or `CHECK_PORTS_DEFAULT="3000,8080"`. This automation is wired into `dev`, `dev:web`, `dev:web:turbo`, `dev:turbo`, and `dev:api`, preventing the “silent failure” scenario where the emulator suite or Next.js dev server quits without context.

## Performance Playbook

Keeping the PWA “fast and accurate” means optimising both local developer experience and production builds.

1. **Prefer Turbopack during development.** Next.js 15.1.8 recommends `next dev --turbopack` for quicker rebuilds. Use `pnpm run dev:web:turbo` (or `pnpm run dev:turbo` when you need emulators too) for the fastest feedback loop.
2. **Verify type safety continuously.** Run `pnpm run typecheck` alongside `pnpm run lint` so regressions are caught before shipping. The task runner’s `core` preset wraps both.
3. **Exercise the production build.** Periodically run `pnpm run build && pnpm run start -p 3000` to experience the optimised PWA bundle and catch server/runtime issues that dev mode masks.
4. **Profile stubborn slowdowns.** Collect Turbopack traces when hot reloads stall:
   ```bash
   NEXT_TURBOPACK_TRACING=1 pnpm run dev:web:turbo
   ```
   The trace file lands in `.next/trace.log`—attach it when opening Next.js issues or analysing long rebuilds.
5. **Keep ports tidy.** Use `pnpm run check:ports --silent` before large demo sessions to avoid binding delays, and fall back to `pnpm run stop` instead of force-killing terminals.

Together, these habits keep development responsive and ensure production remains consistent.

## Troubleshooting

- **Port already in use**: Run `pnpm run check:ports` to see the offender, then free it with `pnpm run kill:ports` or manually stop the process. You can bypass the safety filters by setting `ALLOW_DESTRUCTIVE=1`.
- **Multiple emulator suites detected**: The Firebase CLI warns when two emulator instances share a project ID. Confirm no other emulator processes are active (`pnpm run stop`) before restarting.
- **Task runner skips a script you expected**: Check the applied filters in the runner logs. Use `DRY_RUN=1` to experiment and `TASK_INCLUDE` to force inclusion.
- **Docs out of sync**: Architecture, implementation, and blueprint details live alongside this README in the `docs/` folder—see the references below.

## Reference Documentation

### Getting Started

- **[Environment Setup Guide](./ENV_SETUP.md)** – Step-by-step environment configuration
- **[Actionable Issues](./ACTIONABLE_ISSUES.md)** – Known issues with clear fixes and testable outcomes

### Architecture & Implementation

- [`architecture.md`](architecture.md) – technical architecture, auth patterns, AI integration
- [`IMPLEMENTATION.md`](IMPLEMENTATION.md) – domain model, Firestore structure, API routes
- [`blueprint.md`](blueprint.md) – product feature map and UX guidelines
- [`firebase-gcp-cli-setup.md`](firebase-gcp-cli-setup.md) – Firebase and GCP CLI configuration

### Project Maintenance

- [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) – agent-facing playbook for automation and code conventions
- [`BRANCH_CLEANUP.md`](BRANCH_CLEANUP.md) – guidance for repository hygiene

Need something else documented? Open an issue with the desired section and we'll expand from there.

# Scheduler

Security-first, pnpm-only project scaffold with comprehensive Firebase and GCP CLI configuration management.

## 🚀 Quick Start

### Initial Setup

1. **Configure Firebase & GCP** (one-time setup):

   ```bash
   ./scripts/setup-cli-config.sh full
   ```

2. **Start development**:
   ```bash
   pnpm run dev
   ```

### CLI Configuration System

This project includes a complete CLI-based configuration system for Firebase and Google Cloud Platform:

- **🔧 Environment Management**: Automated setup of Firebase and GCP configurations
- **🔐 Secret Management**: Secure handling of API keys and service accounts using Google Secret Manager
- **🛠️ Service Accounts**: Automated creation and management of service accounts with proper roles
- **📋 Validation**: Built-in validation and troubleshooting tools

**Quick Commands:**

```bash
# Complete setup (recommended for first-time)
./scripts/setup-cli-config.sh full

# Interactive setup menu
./scripts/setup-cli-config.sh interactive

# Check configuration status
./scripts/setup-cli-config.sh status

# Validate existing setup
./scripts/validate-setup.sh
```

For detailed instructions, see [`docs/architecture.md`](docs/architecture.md) for technical architecture and CLI setup details.

## Documentation

- **Multi-Tenant Implementation:** See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the contractor/subcontractor model, parent ledgers, attendance replication, and API routes
- **AI Agent Instructions:** See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for concise, up-to-date guidance tailored to this repo (architecture map, workflows, security, and patterns with file references)
- **Architecture Overview:** See [`docs/architecture.md`](docs/architecture.md) for technical architecture, auth patterns, AI integration, and component structure
- **App Features & Design:** See [`docs/blueprint.md`](docs/blueprint.md) for app features and UI design guidelines
<!-- The CLI Setup Guide file does not exist. Please update this link when the documentation is available. -->
