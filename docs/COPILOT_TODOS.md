<!--
  Modernized Copilot Task Backlog
  This file was overhauled to reflect CURRENT repository reality.
  Legend of dispositions:
    DONE     – Implemented; keep concise note for audit trail
    ACTIVE   – In current sprint focus window
    NEXT     – Queued (ready, low ambiguity)
    DEFERRED – Valuable but intentionally postponed (note trigger)
    OBSOLETE – No longer relevant (architecture shift or superseded)
-->

# Scheduler – Consolidated Engineering Backlog

Last refresh: <!-- YYYY-MM-DD --> 2025-10-05

## 1. Recently Completed (evidence in code/tests)

- [x] Approve join request API route hardened (`src/app/api/orgs/requests/approve/route.ts`): uses Zod `ApproveRequestSchema`, transactional status update, adds user to org with role.
- [x] Removed legacy `JoinRequest` / `types.legacy` imports (search returns none; only comment reference remains).
- [x] Centralized request approval/input schemas inside `src/lib/types.ts` (ApproveRequestSchema, JoinOrgRequestSchema, RequestAccessSchema).
- [x] Session + CSRF validation pattern standardized across new org request endpoints.

## 2. Active (In Progress Now)

- [ ] Backlog reclassification & rewrite (this document) – pruning vague v1 items and mapping to current domain model.
- [ ] Verify if any onboarding page callback typing issues still exist (`src/app/onboarding/page.tsx`); update or mark obsolete.

## 3. Next Up (Ready)

- [ ] UI Chart component: tighten tooltip/legend generic typing (ensure formatter and payload inference strongly typed) – file `src/components/ui/chart.tsx`.
- [x] Rename or relocate misnamed `calendar.tsx` (is actually Invite Manager) OR create real calendar component stub; decide naming convention (`InviteManager` to `invite-manager.tsx`). (Added re-export shim.)

## 4. Deferred (Intentionally Later)

- [ ] Real-time listeners + optimistic updates (requires schedule data model stabilization first).
- [ ] AI schedule generation flow (needs consensus on constraint schema + fairness metrics).

## 5. Obsolete / Superseded (Removed From Active Scope)

- ~~Fix TypeScript errors in approve route (orgId before assignment)~~ – code presently clean; no usage-before-assignment in current file.
- ~~Fix TypeScript errors in chart.tsx (baseline types missing)~~ – baseline types exist; remaining work is enhancement, moved to Next Up.
- ~~calendar.tsx DayPicker IconLeft/IconRight issues~~ – file no longer implements DayPicker; it's an Invite Manager component; original issue invalid.

## 6. Larger Feature Epics (Condensed)

| Epic                                              | Status              | Notes                                                               |
| ------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| Settings Page (org + user prefs)                  | Pending design sync | Placeholder exists. Need schema for notification prefs.             |
| Requests Management (swap, time-off)              | Deferred            | Requires final approval rules + ledger impacts.                     |
| Schedule Management (CRUD, DnD, publish)          | In discovery        | Need shift entity schema + conflict integration.                    |
| Conflict Detection Enhancements                   | Active R&D          | Current flow at `ai/flows/conflict-flagging.ts`; expand categories. |
| Notification System (in-app + email)              | Deferred            | Blocked on event bus abstraction.                                   |
| Security Hardening (rate limiting, audit logging) | Partially started   | CSRF + session patterns present; rate limiting TBD.                 |

## 7. Technical Debt / Quality Targets

- [ ] Add minimal vitest coverage for `addUserToOrg` side effects (membership doc write & role field) via emulator.
- [ ] Introduce structured logging helper (levels + redact PII) for API routes.
- [ ] Service worker: evaluate offline caching strategy (currently basic PWA manifest only).

## 8. Documentation & DX

- [ ] Add schema section to `docs/architecture.md` for new approval & invite flows.
- [ ] Provide quickstart snippet for creating a join request & approval (curl examples) in `docs/QUICKSTART.md`.

## 9. Security & Compliance

- [ ] Add audit trail append-only collection for org membership changes (server-only writes, no PII outside tenant scope).

---

### Historical (Legacy List Snapshot)

> The original verbose v1 backlog has been superseded. Items were mapped to the categories above or removed when invalid. See git history for prior granular bullet points if needed.

---

### Operating Notes

1. Keep Zod schemas authoritative; derive component prop types from them where possible.
2. Never allow client writes to `parents/**` (ledger immutability maintained).
3. When adding AI flows, follow existing `conflict-flagging` pattern: Zod in/out + minimal structured result.

### Verification Commands

Run before marking tasks Done:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

### Next Review

- Schedule a backlog grooming review after implementing the "Next Up" items or in 1 week, whichever comes first.

<!-- Legacy detailed feature list collapsed into Epics above -->

<!-- AI features reorganized; see Conflict Detection & AI schedule generation entries -->

<!-- UX & Notification items summarized under Epics and Deferred -->

<!-- Technical improvements refined into Technical Debt / Quality Targets section -->

<!-- Polish items retained implicitly; will be reintroduced when core flows stable -->

<!-- Security tasks consolidated in Security & Compliance section -->

<!-- Documentation tasks condensed into Documentation & DX section -->

<!-- Future enhancements summarized in Epics or Deferred -->

---

<!-- Original priority legend and agent notes retained implicitly; streamlined above -->
