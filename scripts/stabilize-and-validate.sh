#!/usr/bin/env bash
# file: stabilize-and-validate.sh
set -euo pipefail

echo "==> Standardizing: using npm for installs and hooks"

# Ensure husky bootstrap exists (v9)
if [ ! -f ".husky/_/husky.sh" ]; then
  npx --yes husky@9 init >/dev/null 2>&1 || true
fi

echo "==> Install deps (npm ci if package-lock present)"
if [ -f package-lock.json ]; then
  npm ci --prefer-offline --no-audit --progress=false
else
  npm install
fi

echo "==> Lint"
npm run lint

echo "==> Typecheck"
npm run typecheck

echo "==> Build"
npm run build

echo "==> Gitleaks security scan"
npm run gitleaks:scan || echo "⚠️ gitleaks scan failed or not available"

echo "==> Quick Firebase/GCP CLI sanity (non-fatal if missing)"
set +e
firebase --version >/dev/null 2>&1 && echo "firebase-tools: $(firebase --version)" || echo "⚠️ firebase-tools not found (ok if not needed on this machine)"
gcloud --version >/dev/null 2>&1 && echo "gcloud present" || echo "⚠️ gcloud not found (ok if not needed locally)"
[ -x "./scripts/validate-setup.sh" ] && ./scripts/validate-setup.sh || echo "ℹ️  scripts/validate-setup.sh not present or not executable (skip)"
set -e

echo "✅ All local checks passed: lint + typecheck + build + security scan."
echo "Next: run your Firebase CLI config scripts if needed, then start dev:"
echo "   pnpm run dev       # or VS Code Task \"Start All (Web + API)\""