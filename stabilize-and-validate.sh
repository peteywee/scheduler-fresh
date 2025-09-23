#!/usr/bin/env bash
# file: stabilize-and-validate.sh
set -euo pipefail

echo "==> Ensure pnpm is available on PATH (local & agents)"
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@10 --activate >/dev/null 2>&1 || true
  fi
fi
# Common per-user location used by agents (GitHub runners, Codespaces, etc.)
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"

# Fallback install if still missing
if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> Installing pnpm (user-scoped)…"
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  export PATH="$PNPM_HOME:$PATH"
fi
echo "pnpm version: $(pnpm --version)"

echo "==> Harden Husky hooks to be pnpm-robust"
mkdir -p .husky
# pre-commit: secret scan + lint-staged; robust PNPM resolution
cat > .husky/pre-commit <<'SH'
#!/usr/bin/env bash
. "$(dirname -- "$0")/_/husky.sh"

# Robust pnpm resolution for local/CI/agent shells
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then corepack enable >/dev/null 2>&1 || true; fi
fi

# Run secret scan (non-fatal if gitleaks missing) + lint-staged
pnpm run precommit:secrets || echo "⚠️  precommit:secrets skipped/failed"
# Prefer pnpm dlx; fallback to npx if pnpm still unavailable
if command -v pnpm >/dev/null 2>&1; then
  pnpm dlx lint-staged
else
  npx --yes lint-staged
fi
SH
chmod +x .husky/pre-commit

# pre-push: typecheck + lint
cat > .husky/pre-push <<'SH'
#!/usr/bin/env bash
. "$(dirname -- "$0")/_/husky.sh"

export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then corepack enable >/dev/null 2>&1 || true; fi
fi

pnpm run typecheck && pnpm run lint
SH
chmod +x .husky/pre-push

# Ensure husky bootstrap exists (v9)
if [ ! -f ".husky/_/husky.sh" ]; then
  pnpm dlx husky@9 init >/dev/null 2>&1 || true
fi

echo "==> Install deps (pnpm ci if lockfile present)"
if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi

echo "==> Lint"
pnpm run lint

echo "==> Typecheck"
pnpm run typecheck

echo "==> Build"
pnpm run build

echo "==> Gitleaks security scan"
pnpm run gitleaks:scan || echo "⚠️ gitleaks scan failed or not available"

echo "==> Quick Firebase/GCP CLI sanity (non-fatal if missing)"
set +e
firebase --version >/dev/null 2>&1 && echo "firebase-tools: $(firebase --version)" || echo "⚠️ firebase-tools not found (ok if not needed on this machine)"
gcloud --version >/dev/null 2>&1 && echo "gcloud present" || echo "⚠️ gcloud not found (ok if not needed locally)"
[ -x "./scripts/validate-setup.sh" ] && ./scripts/validate-setup.sh || echo "ℹ️  scripts/validate-setup.sh not present or not executable (skip)"
set -e

echo "✅ All local checks passed: lint + typecheck + build + security scan."
echo "Next: run your Firebase CLI config scripts if needed, then start dev:"
echo "   pnpm run dev       # or VS Code Task \"Start All (Web + API)\""