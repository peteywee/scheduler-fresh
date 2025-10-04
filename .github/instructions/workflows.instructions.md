---
applyTo: ".github/workflows/**/*.yml"
description: "GitHub Actions CI/CD workflow guidelines"
---

# GitHub Actions CI/CD Guidelines

## Workflow Structure

```yaml
# ✅ Complete workflow example
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch: # Manual trigger

# ✅ Set permissions explicitly
permissions:
  contents: read
  pull-requests: write
  checks: write

# ✅ Cancel in-progress runs
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9.12.3"

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for better analysis

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:run

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests
```

## Security Best Practices

```yaml
# ✅ Use GitHub secrets
env:
  FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
  FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}

# ✅ Use OIDC for cloud authentication
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

# ✅ Pin action versions to SHA
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1

# ✅ Scan for secrets
- name: Gitleaks scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Caching Strategies

```yaml
# ✅ Cache dependencies
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

- name: Setup Node.js with pnpm cache
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "pnpm"

# ✅ Cache Next.js build
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ${{ github.workspace }}/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-

# ✅ Cache Firebase emulators
- name: Cache Firebase emulators
  uses: actions/cache@v4
  with:
    path: ~/.cache/firebase/emulators
    key: ${{ runner.os }}-firebase-emulators-${{ hashFiles('firebase.json') }}
```

## Matrix Builds

```yaml
# ✅ Test across multiple versions
jobs:
  test:
    strategy:
      matrix:
        node-version: [20, 22]
        os: [ubuntu-latest, macos-latest]
      fail-fast: false # Continue on failure

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Run tests
        run: pnpm test
```

## Conditional Steps

```yaml
# ✅ Run steps conditionally
- name: Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: pnpm run deploy:staging

- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: pnpm run deploy:prod

# ✅ Skip on draft PRs
- name: Run E2E tests
  if: github.event.pull_request.draft == false
  run: pnpm test:e2e

# ✅ Run only on changes to specific paths
- name: Build functions
  if: |
    contains(github.event.head_commit.modified, 'functions/') ||
    contains(github.event.head_commit.added, 'functions/')
  run: cd functions && pnpm build
```

## Parallel Jobs

```yaml
# ✅ Run independent jobs in parallel
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:e2e

  # ✅ Require all checks to pass
  all-checks:
    needs: [lint, typecheck, test-unit, test-e2e]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All checks passed!"
```

## Deployment Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Setup
        uses: ./.github/actions/setup

      - name: Build
        run: pnpm build
        env:
          NODE_ENV: production

      - name: Run security checks
        run: |
          pnpm audit --audit-level=high
          pnpm run gitleaks:scan

      - name: Deploy to Firebase
        run: pnpm run deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

      - name: Notify deployment
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "Production deployment successful!"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Composite Actions

```yaml
# .github/actions/setup/action.yml
name: "Setup Project"
description: "Setup Node.js, pnpm, and install dependencies"

inputs:
  node-version:
    description: "Node.js version"
    required: false
    default: "20"

runs:
  using: "composite"
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: "pnpm"

    - name: Setup pnpm
      uses: pnpm/action-setup@v4
      with:
        version: 9

    - name: Install dependencies
      shell: bash
      run: pnpm install --frozen-lockfile

    - name: Cache build
      uses: actions/cache@v4
      with:
        path: .next/cache
        key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}
# Usage in workflows:
# - uses: ./.github/actions/setup
#   with:
#     node-version: '20'
```

## Reusable Workflows

```yaml
# .github/workflows/test.yml (reusable)
name: Test

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        required: false
        default: "20"
    secrets:
      firebase-token:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
        with:
          node-version: ${{ inputs.node-version }}
      - run: pnpm test
        env:
          FIREBASE_TOKEN: ${{ secrets.firebase-token }}
# Usage in other workflows:
# jobs:
#   test:
#     uses: ./.github/workflows/test.yml
#     with:
#       node-version: '22'
#     secrets:
#       firebase-token: ${{ secrets.FIREBASE_TOKEN }}
```

## Error Handling

```yaml
# ✅ Always specify timeout
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Run tests
        timeout-minutes: 10
        run: pnpm test

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-logs
          path: |
            logs/
            .firebase/
          retention-days: 7
```

## Performance Optimization

```yaml
# ✅ Minimize checkout depth
- uses: actions/checkout@v4
  with:
    fetch-depth: 1  # Shallow clone

# ✅ Use sparse checkout
- uses: actions/checkout@v4
  with:
    sparse-checkout: |
      src/
      package.json
      pnpm-lock.yaml

# ✅ Install only production dependencies for deployment
- run: pnpm install --prod --frozen-lockfile

# ✅ Use custom runners for better performance
runs-on: [self-hosted, linux, x64]
```

## Best Practices Checklist

- [ ] Use latest action versions
- [ ] Pin actions to SHA for security
- [ ] Set explicit permissions
- [ ] Use concurrency to cancel duplicate runs
- [ ] Cache dependencies and build outputs
- [ ] Set timeouts for all jobs and steps
- [ ] Use secrets for sensitive data
- [ ] Implement proper error handling
- [ ] Upload artifacts on failure for debugging
- [ ] Use matrix builds for cross-platform testing
- [ ] Run linting, type checking, and tests in parallel
- [ ] Use environments for deployment protection
- [ ] Add status badges to README
- [ ] Set up notifications for failures
- [ ] Document workflow requirements
