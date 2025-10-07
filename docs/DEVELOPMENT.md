Development setup

This document explains how to run tests, enable pre-commit hooks, and set up local SDKs for Firebase and Google Cloud.

Prerequisites

- Node.js (LTS) and pnpm. The devcontainer is configured to use Node LTS.
- Firebase CLI (installed via npm or the devcontainer Dockerfile)
- gcloud SDK (install via instructions below or use the devcontainer)

Quick start

1. Install deps and enable hooks

```bash
pnpm install
pnpm prepare # sets up husky
```

2. Run linters and tests

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
```

Pre-commit hooks

- Husky + lint-staged are configured. The pre-commit hook will run `eslint --fix` on staged JS/TS files and `prettier --write` on staged markup files.

Firebase & GCloud

- Install the Firebase CLI globally if you need local emulators:

```bash
npm install -g firebase-tools
```

- Install the gcloud SDK (follow official Google Cloud docs). Once installed, run:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

E2E testing with Playwright

- Playwright is included as a devDependency. To install the browser binaries:

```bash
pnpm exec playwright install --with-deps
```

CI

- CI (GitHub Actions) uses pnpm with `--frozen-lockfile`. Ensure the lockfile is committed.

Notes

- For reproducible CI builds, always commit the `pnpm-lock.yaml` at the root. Use `pnpm -w install --frozen-lockfile` in CI for monorepos.
- The devcontainer will attempt to prepare pnpm and install dependencies during `postCreateCommand`.
