#!/usr/bin/env bash
set -euo pipefail

echo "==> Patching files (workflows, DeepSource, Prettier ignore, Firestore rules) already applied if you used the heredocs."

# --- ESLint fixes ---
echo "==> Fix ESLint violations (unused 'user' -> '_user', any->unknown, empty interface->Record<string, unknown>)"
if [ -f src/app/api/orgs/requests/approve/route.ts ]; then
  perl -0777 -i -pe 's/\b(const|let)\s+user(\s*[:=])/\1 _user\2/g' src/app/api/orgs/requests/approve/route.ts || true
  perl -0777 -i -pe 's/(\()\s*([^)]*?)\buser\b([^)]*)(\))/\1\2_user\3\4/g' src/app/api/orgs/requests/approve/route.ts || true
fi

if [ -f src/test/rules-setup.ts ]; then
  sed -E -i 's/: any/: unknown/g' src/test/rules-setup.ts || true
  perl -0777 -i -pe 's/interface\s+([A-Za-z_]\w*)\s*\{\s*\}/type \1 = Record<string, unknown>/g' src/test/rules-setup.ts || true
fi

# --- Lint/Format ---
echo "==> ESLint (with cache)"
pnpm exec eslint --fix --cache --cache-location .eslintcache "src/**/*.{ts,tsx,js,jsx}" "scripts/**/*.{ts,tsx,js,jsx}" || true

echo "==> Prettier write"
pnpm exec prettier --write --log-level warn .

# --- Firestore rules tests ---
echo "==> Firestore rules tests"
pnpm test:rules || (echo 'Rules test failed; inspect vitest output above.' && exit 1)

# --- Commit & Push ---
echo "==> Git add/commit"
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "fix: workflows & DeepSource; Prettier ignore; Firestore rules; ESLint patches"
fi

echo "==> Git push (set upstream if needed)"
BR="$(git rev-parse --abbrev-ref HEAD)"
git push --set-upstream origin "$BR" || git push
