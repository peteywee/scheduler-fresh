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

## Documentation

- **Multi-Tenant Implementation:** See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the contractor/subcontractor model, parent ledgers, attendance replication, and API routes
- **AI Agent Instructions:** See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for concise, up-to-date guidance tailored to this repo (architecture map, workflows, security, and patterns with file references)
- **Architecture Overview:** See [`docs/architecture.md`](docs/architecture.md) for technical architecture, auth patterns, AI integration, and component structure
- **App Features & Design:** See [`docs/blueprint.md`](docs/blueprint.md) for app features and UI design guidelines
- **CLI Setup Guide:** See [`docs/firebase-gcp-cli-setup.md`](docs/firebase-gcp-cli-setup.md) for detailed Firebase & GCP configuration
