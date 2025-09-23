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

For detailed instructions, see [Firebase & GCP CLI Setup Guide](docs/firebase-gcp-cli-setup.md).

## Copilot Agent Operating Instructions

**Context:** This repo uses pnpm, Husky hooks, Firebase emulators, Next.js, and CLI-based configuration management.

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

**CLI Configuration Commands:**
- Full setup: `./scripts/setup-cli-config.sh full`
- Environment status: `./scripts/env-utils.sh status`
- Validate setup: `./scripts/validate-setup.sh`
- Service account management: `./scripts/service-accounts.sh list PROJECT_ID`
- Secret management: `./scripts/secrets-management.sh list PROJECT_ID`

### Rules / Expectations

- Always use **pnpm** for install and scripts.
- Do not commit `.env` files; use `.env.example`.
- Before opening a PR, ensure:
  - `pnpm run typecheck` passes
  - `pnpm run lint` passes
  - `pnpm run build` succeeds
- When adding deps, prefer `pnpm add <pkg>` (runtime) or `pnpm add -D <pkg>` (dev).
- Local API uses **Firebase emulators** (auth, firestore, storage). No Cloud Functions; server logic lives in **Next.js route handlers**.
- Use CLI scripts for Firebase/GCP configuration management instead of manual console operations.
