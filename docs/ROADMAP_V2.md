# Platform Roadmap (Execution Tracker)

> Source: architectural prompt + execution plan. This file is the authoritative checklist. Update as work completes. Days 1–3 targeted in current sprint.

## Legend

- [x] = complete
- [ ] = pending / not started
- [~] = in progress

## Phase 0 – Foundation Hardening

| Day | Scope                                                            | Status |
| --- | ---------------------------------------------------------------- | ------ |
| 1   | Canonical domain schemas (Zod) + legacy types quarantined        | [x]    |
| 2   | Firestore rules: hub–spoke multi-tenant overhaul + legacy backup | [x]    |
| 3   | Firebase Admin singleton + config hygiene                        | [x]    |

## Phase 1 – Core Data + Replication

| Day | Scope                                                        | Status |
| --- | ------------------------------------------------------------ | ------ |
| 4   | Contract + parent ledger collection design (no triggers yet) | [ ]    |
| 5   | Attendance → Ledger replication function (idempotent)        | [ ]    |
| 6   | Compensating lines & correction flow (append-only)           | [ ]    |

## Phase 2 – Onboarding & Access

| Day | Scope                                                     | Status |
| --- | --------------------------------------------------------- | ------ |
| 7   | StaffJoinToken + OrgPartnerToken flows (QR + short codes) | [ ]    |
| 8   | Claims issuance & org switch UX refinements               | [ ]    |

## Phase 3 – Scheduling & Allocation

| Day | Scope                                                  | Status |
| --- | ------------------------------------------------------ | ------ |
| 9   | Hierarchical locations (Venue/Zone) + Positions        | [ ]    |
| 10  | Shift modeling (multi-position, capacity) + validation | [ ]    |
| 11  | Assignment & availability surfaces                     | [ ]    |

## Phase 4 – AI & Optimization

| Day | Scope                                         | Status |
| --- | --------------------------------------------- | ------ |
| 12  | Conflict detection AI refactor (new schemas)  | [ ]    |
| 13  | Shift auto-generation (constraints) prototype | [ ]    |

## Phase 5 – Hardening & Compliance

| Day | Scope                                              | Status |
| --- | -------------------------------------------------- | ------ |
| 14  | Security regression tests, ledger integrity audits | [ ]    |

---

## Canonical Schemas (Target Day 1)

Entities (with primary keys):

- CorporateAccount (parent / billing root)
- Organization (orgs/{orgId})
- Staff (orgs/{orgId}/staff/{staffId})
- Certification (orgs/{orgId}/certifications/{certId})
- Venue (orgs/{orgId}/venues/{venueId})
- Zone (orgs/{orgId}/venues/{venueId}/zones/{zoneId})
- Position (orgs/{orgId}/positions/{positionId})
- Event (orgs/{orgId}/events/{eventId})
- Shift (orgs/{orgId}/events/{eventId}/shifts/{shiftId})
- Attendance (orgs/{orgId}/attendance/{attendanceId})
- Tokens: StaffJoinToken, OrgPartnerToken (orgs/{orgId}/tokens/{tokenId})
- LedgerLine (parents/{parentId}/ledgers/{periodId}/lines/{lineId})

All persisted writes must pass Zod validation before commit. Append-only ledger lines; corrections modeled as compensating entries.

## Firestore Rules (Target Day 2)

Goals:

- Strong tenant isolation (no cross-org queries)
- Prevent client writes to parents/\*\* (ledger immutability)
- Only allow staff to create pending attendance for themselves
- Only managers/admins approve attendance => function creates ledger line
- Avoid PII in parent docs (staffRef only)

## Admin Singleton (Target Day 3)

Pattern:

- Single lazy-initialized Admin app (supports emulator)
- Export: adminApp, db, auth
- Guard against re-init in hot reload

---

## Risks & Watch Points

- Functions v4 vs v5 modular upgrade timing
- Wide refactor breakage of legacy imports (mitigated via legacy file quarantine)
- Rule set changes require test updates (Vitest Firestore rules tests)

## Follow-Up / Stretch

- Evaluate Cloud Run/Eventarc alternative for replication
- Add rule-level unit tests for new attendance + ledger invariants
- Introduce feature flag infrastructure for AI experimentation

## Changelog

(append entries as milestones complete)

- (pending) Day 1 start
