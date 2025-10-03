#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🧪 Running unit tests (vitest)..."
pnpm run test:run

echo "📏 Running Firestore rules tests..."
pnpm run test:rules

echo "✅ All test suites completed"
