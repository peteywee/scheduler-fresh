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

See `.github/copilot-instructions.md` for concise, up-to-date guidance tailored to this repo (architecture map, workflows, security, and patterns with file references). For a deeper dive into data flows and security choices, read `docs/architecture.md`.

### Useful Tasks (VS Code)

- Start All (Web + API): runs Next.js and Firebase emulators in parallel
- Complete: Stabilize & Validate: ensure pnpm, install deps, husky, then lint → typecheck → build → gitleaks and CLI checks
- Cloud: Setup (Full/Interactive): orchestrates GCP + Firebase + service accounts + secrets sync

### Scripts (CLI)

- `./scripts/setup-cli-config.sh full|interactive|status|validate`
- `./scripts/setup-firebase.sh`, `./scripts/setup-gcp.sh`, `./scripts/service-accounts.sh`
- `./scripts/secrets-management.sh` and `./scripts/env-utils.sh`
