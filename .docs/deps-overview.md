# Dependency Overview

Generated: 2025-10-03

This document summarizes key dependencies for the Scheduler PWA (extracted from `package.json`).

## scheduler — 0.1.0

Path: `package.json`

### Dependencies

- `firebase`: ^12.3.0
- `firebase-admin`: ^12.5.0
- `firebase-functions`: ^5.0.0
- `next`: ^15.5.3
- `react`: ^18.3.1
- `react-dom`: ^18.3.1
- `zod`: ^3.23.8
- `date-fns`: ^3.6.0

### DevDependencies

- `@firebase/rules-unit-testing`: ^5.0.0
- `typescript`: ^5.6.2
- `vitest`: ^3.2.4
- `eslint`: ^9.9.0
- `eslint-config-next`: ^15.5.3

## Notes

- Ensure the `firebase` and `firebase-admin` versions are compatible when running emulator or functions locally.
- Pin or test dependency upgrades in a separate branch; this repo now standardizes on npm for lockfile and CI.
- Security: run dependency audits (Dependabot/GitHub security alerts) regularly; CI prints known vulnerabilities on push.
