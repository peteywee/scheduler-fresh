# Security Model

This document captures the enforced security posture for scheduler-fresh, spanning API routes, session handling, CSRF, origin checks, and Firestore rules.

## Principles

- Defense-in-depth: every boundary validates identity, intent, and scope.
- Server-first: sensitive logic runs on the server (Next.js API routes, server actions).
- Least privilege: users operate only within their org and role.
- Deterministic contracts: inputs/outputs validated with Zod; errors are structured.

## Authentication & Sessions

- Session cookie: `__session` created from Firebase ID token via Admin SDK.
- Verification: API routes call `adminAuth().verifySessionCookie(session, true)`.
- Revocation: supports clearing session cookies and token revocation.
- Route reference:
  - `POST /api/auth/session` (create cookie)
  - `DELETE /api/auth/session` (clear cookie)
  - `GET /api/auth/me` (current user)

## CSRF & Origin

- CSRF: double-submit cookie pattern.
  - Client requests `XSRF-TOKEN`; mutations must include header `x-csrf-token` equal to cookie.
- Origin allowlist:
  - Allowed origins derived from `NEXT_PUBLIC_APP_URL` + localhost defaults.
  - Missing `Origin` header is tolerated for same-origin fetches; others are blocked.

## Firestore Security Rules

- Single-org model is enforced.
- `claimMatchesUserDoc(orgId)` requires:
  - Auth claim `orgId` equals `users/{uid}.orgId`.
  - Provided `orgId` equals auth claim.
- Impact: prevents stale/forged tokens and cross-tenant access.
- If multi-org is needed in the future:
  - Schema to `users/{uid}.orgIds: string[]`
  - Claims to include map of roles per org
  - Rules check membership via `in`/`array_contains`.

### Allowed Patterns (examples)

- User reads own profile: `users/{uid}` if `request.auth.uid == uid`.
- Org-scoped reads/writes allowed when:
  - `userOrg() == orgId` AND `claimMatchesUserDoc(orgId)`.
- Admin operations:
  - Require role claim check (e.g., `isOrgAdmin(orgId)`); never rely solely on user doc.

### Removed/Denied

- Public collection reads (e.g., `public/`, `directory/`) are not world-readable by default.
- Public access must go through API routes with explicit policy.

## API Route Requirements

- Validate input with Zod.
- Verify session cookie; return `{ code, message }` on failure.
- Enforce CSRF + origin checks on mutations (e.g., invites, org switching).
- Return structured errors only; never leak internal messages.

## PWA/Service Worker

- `public/sw.js` and `public/workbox-*.js` are generated artifacts; do not edit.
- Lint ignores these files; CI does not analyze them.

## Environment

- All env access flows through `src/lib/env.ts` and Zod validation.
- Admin SDK service account from `FIREBASE_SERVICE_ACCOUNT_JSON` (supports raw JSON or base64).

## Known Constraints

- Single-org per user is intentional; document when workflows need exceptions.
- Some generated/minified assets are excluded from linting.

## References

- `src/lib/firebase.server.ts` – Admin SDK init & guards
- `src/app/api/**/route.ts` – Route handlers with CSRF and origin checks
- `firestore.rules` – Rules enforcing tenancy and roles
- `.github/copilot-instructions.md` – Authoritative coding guidance
