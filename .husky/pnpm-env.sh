#!/usr/bin/env bash
# Ensure pnpm is available for Husky hooks

# Check if pnpm is already available
if command -v pnpm >/dev/null 2>&1; then
  return 0
fi

# Try to load pnpm from common locations
if [ -n "$PNPM_HOME" ] && [ -d "$PNPM_HOME" ]; then
  export PATH="$PNPM_HOME:$PATH"
fi

# Try default pnpm installation paths
for pnpm_path in "$HOME/.local/share/pnpm" "$HOME/.pnpm"; do
  if [ -d "$pnpm_path" ]; then
    export PATH="$pnpm_path:$PATH"
    export PNPM_HOME="$pnpm_path"
    break
  fi
done

# If still not found, try to use corepack
if ! command -v pnpm >/dev/null 2>&1 && command -v corepack >/dev/null 2>&1; then
  corepack enable pnpm 2>/dev/null || true
fi