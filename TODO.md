> [DEPRECATED – consolidated into `docs/COPILOT_TODOS.md` and `docs/LEGACY_CLEANUP.md` 2025-10-04]

# Refactoring Plan for Entire Codebase

## Goals

- Remove placeholders
- Replace unrecognized functions/expressions
- Improve TypeScript types and type safety
- Focus on speed for PWA

## Tasks

- [x] Fix syntax errors in src/test/firestore.rules.test.ts (extra closing brace)
- [x] Fix unrecognized 'exists' function in .github/workflows/ci.yml
- [x] Remove placeholder images (src/lib/placeholder-images.json, src/lib/placeholder-images.ts)
- [x] Replace placeholder image in src/app/page.tsx with actual optimized image
- [x] Remove legacy types (src/lib/types.legacy.ts and re-exports in src/lib/types.ts) (Already merged; entry preserved for historical context)
- [x] Add PWA speed optimizations to next.config.ts (swcMinify, compress, optimizeFonts, etc.)
- [x] Test build and PWA performance
- [x] Run tests to ensure no breakage
