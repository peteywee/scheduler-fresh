#!/usr/bin/env bash
set -euo pipefail

echo "==> Enhanced bootstrap starting..."

ensure_pnpm() {
	if command -v pnpm >/dev/null 2>&1; then
		echo "pnpm already available"
		return 0
	fi

	if command -v npm >/dev/null 2>&1; then
		echo "Installing pnpm via npm (user/global install)..."
		npm install -g pnpm --no-audit --no-fund || true
		if command -v pnpm >/dev/null 2>&1; then
			echo "pnpm installed"
			return 0
		fi
	fi

	if command -v npx >/dev/null 2>&1; then
		echo "pnpm not installed; will use npx pnpm for commands"
		return 0
	fi

	echo "Error: no pnpm, npm, or npx available in PATH" >&2
	exit 1
}

ensure_firebase() {
	if command -v firebase >/dev/null 2>&1; then
		echo "firebase-tools already installed; skipping global install"
		return 0
	fi
	if command -v npm >/dev/null 2>&1; then
		echo "Installing firebase-tools globally via npm"
		npm install -g firebase-tools --no-audit --no-fund || true
	fi
}

write_package_metadata() {
	# Ensure package.json exists
	if [ ! -f package.json ]; then
		cat > package.json <<'JSON'
{
	"name": "scheduler-fresh",
	"private": true,
	"version": "0.0.0"
}
JSON
	fi

	# Detect node LTS version (use node -v if present) else set to 18
	NODE_VERSION_DEFAULT="18"
	if command -v node >/dev/null 2>&1; then
		NODE_VERSION_FULL=$(node -v | sed 's/^v//')
		NODE_MAJOR=$(echo "$NODE_VERSION_FULL" | cut -d. -f1)
		NODE_VERSION_DEFAULT="$NODE_MAJOR"
	fi

	# Use pnpm@latest to set packageManager
	PNPM_PGM="pnpm@latest"

	node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
if(!p.engines) p.engines={};
p.engines.node=String(process.env.NODE_VERSION || '${NODE_VERSION_DEFAULT}');
p.packageManager='pnpm@latest';
fs.writeFileSync('package.json',JSON.stringify(p,null,2));
" || true
}

run_pnpm() {
	if command -v pnpm >/dev/null 2>&1; then
		PNPM_CMD=pnpm
	else
		PNPM_CMD="npx pnpm"
	fi
	echo "Using: $PNPM_CMD"
	$PNPM_CMD install --frozen-lockfile || $PNPM_CMD install || true
	# Update to latest matching semver (safe) across direct deps
	$PNPM_CMD up -L || true
}

ensure_pnpm
ensure_firebase
write_package_metadata
run_pnpm

echo "==> Enhanced bootstrap complete."
