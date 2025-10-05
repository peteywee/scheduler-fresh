# Version Synchronization Workflow

Automated consistency for dependency version references across the codebase.

## Goal

Ensure any human-written reference to a dependency version (docs, instructions, examples) matches the authoritative version declared in `package.json`.

## Tooling

`scripts/version-sync.mjs` implements scanning + replacement.

### Features

- Scans `.md`, `.ts`, `.tsx`, `.js`, `.mjs`, `.json` files.
- Detects patterns like:
  - `next@15.5.3`
  - `next 15.5.3`
  - `"next": "15.5.3"` (snippet in docs)
  - `<pkg> version 1.2.3`
- Supports `--check` mode for CI (fails on drift without writing changes).
- Safe: only rewrites the version substring if different.

### Limitations

- Does not upgrade dependencies (no network calls). It only propagates existing versions.
- Does not normalize caret/range specifiers in narrative text (keeps whatever is in `package.json`).
- Pattern-based; if a version is written without a package context (e.g. just `15.5.3`) it is ignored.

## Scripts

```bash
pnpm run versions:check   # Read-only; exit 1 if mismatches
pnpm run versions:sync    # Rewrite files in-place to match package.json
```

## Suggested Workflow

1. Bump dependency in `package.json` (or via `pnpm up <pkg>`).
2. Run:
   ```bash
   pnpm run versions:check   # See drift
   pnpm run versions:sync    # Apply fixes
   git add . && git commit -m "chore: sync versions"
   ```
3. CI pipeline can call `pnpm run versions:check` to enforce consistency.

## Pre-Commit (Optional)

Add to `.husky/pre-commit` after lint/tests if you want local enforcement:

```bash
pnpm run versions:check || {
  echo "Version drift detected. Run pnpm run versions:sync" >&2
  exit 1
}
```

### Existing Project Integration

This repository now automatically runs `pnpm run versions:check` in the pre-commit hook (after secret scan + lint-staged). Any drift aborts the commit with guidance to run `pnpm run versions:sync`.

To temporarily bypass (not recommended), you may commit with `--no-verify` but follow up with a sync PR.

## Filtering

Use `--include=docs,README` to restrict scanning to paths containing those substrings:

```bash
node scripts/version-sync.mjs --check --include=docs
```

## Extending Patterns

Add custom regex builders inside `makePatternsFor(pkg)` if new narrative styles emerge (e.g., Markdown badges).

## Future Enhancements (Optional Ideas)

- Add GitHub Action that comments on PR with drift summary.
- Add support for `peerDependencies` if introduced.
- Add ignore list for packages that are intentionally documented with major version only.

---

Keep this file updated if new conventions or patterns are introduced.
