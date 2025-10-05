# Naming & Domain Glossary

Authoritative reference for canonical domain terminology, Firestore collection paths, field naming conventions, legacy → new mappings, and invariants. Use this file to verify module/type names; if a name is not present here (or in `src/lib/types.ts`), treat it as undefined until added.

## ID & Primitive Conventions

- `Id` (branded) – generic unique identifier (string, non-empty)
- `OrgId` – branded org identifier (extends `Id`)
- `ParentId` – branded corporate (parent) identifier
- `Timestamp` – JavaScript `Date` object (persisted via Firestore Timestamp)
- All date/time fields are UTC and stored as Firestore Timestamps; UI converts to local.
- Do NOT embed PII in IDs.

## Collections & Paths (Tenant Scope)

```
orgs/{orgId}
  staff/{staffId}
  certifications/{certId}
  venues/{venueId}
    zones/{zoneId}
  positions/{positionId}
  events/{eventId}
    shifts/{shiftId}
  attendance/{attendanceId}
  tokens/{tokenId}
```

### Parent (Corporate) Scope (Immutable Client-Side)

```
parents/{parentId}
  ledgers/{periodId}
    lines/{lineId}        (append-only via server function)
  contracts/{orgId}
```

## Entity Schemas (Canonical)

| Entity           | Source Schema            | Key Fields                               | Notes                                                      |
| ---------------- | ------------------------ | ---------------------------------------- | ---------------------------------------------------------- | ---------- | ----------------------- | --------- |
| CorporateAccount | `CorporateAccountSchema` | id, displayName, orgIds[]                | Parent/billing root; no staff PII                          |
| Organization     | `OrganizationSchema`     | id, parentId?, name, status              | `status`: active                                           | suspended  |
| Staff            | `StaffSchema`            | id (auth uid), roles[], active           | roles subset of {admin, manager, staff} (NOT `employee`)   |
| Certification    | `CertificationSchema`    | name, expiresAfterDays?                  | Used in `Position.requiredCertificationIds`                |
| Venue            | `VenueSchema`            | name, address?                           | Container for zones                                        |
| Zone             | `ZoneSchema`             | venueId, capacity?                       | Replaces legacy Stand                                      |
| Position         | `PositionSchema`         | name, requiredCertificationIds[]         | Shift staffing requirements                                |
| Event            | `EventSchema`            | start, end, venueId?, status             | status: draft                                              | published  | archived                |
| Shift            | `ShiftSchema`            | eventId, start, end, positions[], status | status: open                                               | locked     | completed               | cancelled |
| Attendance       | `AttendanceSchema`       | shiftId, staffId, status                 | status workflow: pending→approved/rejected; cancel special |
| StaffJoinToken   | `StaffJoinTokenSchema`   | type=staffJoin, roles[]                  | Controlled creation by org admin                           |
| OrgPartnerToken  | `OrgPartnerTokenSchema`  | type=orgPartner, partnerOrgId            | Cross-org partnership invitation                           |
| LedgerLine       | `LedgerLineSchema`       | periodId, staffRef, amountCents, kind    | kind: work                                                 | correction | adjustment; append-only |

## Field Naming Patterns

- `createdAt` / `updatedAt` – always present for mutable tenant entities.
- `status` fields use lower-case enums.
- `orgId` mandatory for tenant-scoped documents (except top-level `orgs/{orgId}` root itself where id == orgId).
- `parentId` only appears in: Organization (link), LedgerLine, CorporateAccount.
- `staffRef` replaces any staff PII in parent ledger lines (store only the staffId).
- `positions[]` inside Shift: `{ positionId: Id; required: number }` – never store staff assignments there (assignments are via Attendance docs).

## Status Enumerations

| Context             | Values                                 | Notes                                                                      |
| ------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Organization.status | active, suspended                      | Suspended blocks staff writes                                              |
| Event.status        | draft, published, archived             | Archived = read-only                                                       |
| Shift.status        | open, locked, completed, cancelled     | Completed → no further edits except corrections via attendance adjustments |
| Attendance.status   | pending, approved, rejected, cancelled | `approved` triggers ledger replication flow                                |
| LedgerLine.kind     | work, correction, adjustment           | Corrections reference `reversalOf`                                         |

## Invariants & Rules Alignment

- Client may NOT write under `parents/**`.
- Ledger lines are append-only; corrections create a new line with `kind=correction` and `reversalOf` referencing original.
- Attendance approval is manager/admin only; pending creation must exclude `approvedAt` / `approvedBy`.
- Role checks in rules only scan first 3 entries of `roles[]` (bounded optimization) – avoid storing more than 3 roles per staff (practically limited set anyway).
- `Staff.roles` canonical set excludes legacy `employee` (mapped → `staff`).

## Legacy → Canonical Mapping

| Legacy Term           | Legacy Location               | Canonical Term              | Canonical Schema               | Notes / Transform                                                        |
| --------------------- | ----------------------------- | --------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| OrgMember             | `OrgMemberSchema` (member)    | Staff                       | `StaffSchema`                  | role: employee→staff                                                     |
| Stand                 | `StandSchema`                 | Zone                        | `ZoneSchema`                   | Parent relation via venueId; rename field `standId`→`zoneId` in new code |
| InviteCode            | `InviteCodeSchema`            | StaffJoinToken              | `StaffJoinTokenSchema`         | `role`→`roles[]` (singleton array)                                       |
| JoinRequest           | `JoinRequestSchema`           | (Pending Replacement)       | (TBD)                          | Will map to a new request flow or tokens                                 |
| User (top-level)      | `UserSchema`                  | (Not persisted canonically) | Auth user metadata             | PII kept out of parent scope                                             |
| Organization (legacy) | `OrganizationSchema` (legacy) | Organization                | Canonical `OrganizationSchema` | Merge/rename: ownerUid→createdBy, settings normalized                    |
| Shift (legacy)        | `ShiftSchema` (legacy)        | Shift                       | Canonical `ShiftSchema`        | Replace title→positions/event linkage; assignments via Attendance        |
| Venue (legacy)        | `VenueSchema` (legacy)        | Venue                       | Canonical `VenueSchema`        | Mostly direct mapping                                                    |

## Deprecated / Transitional Fields

| Field           | Context                       | Replacement                     | Action                                 |
| --------------- | ----------------------------- | ------------------------------- | -------------------------------------- |
| `role` (single) | Legacy OrgMember / InviteCode | `roles[]`                       | Normalize to array in new writes       |
| `standId`       | Legacy shifts & forms         | `zoneId`                        | Update UI when zone model integrated   |
| `title` (shift) | Legacy Shift                  | Derive from positions/zone/time | Remove after schedule builder refactor |

## Token Taxonomy

| Token Type | Purpose                               | Creation  | Critical Fields             |
| ---------- | ------------------------------------- | --------- | --------------------------- |
| staffJoin  | Staff self-join with predefined roles | Org Admin | roles[], maxUses, expiresAt |
| orgPartner | Establish parent/partner org link     | Org Admin | partnerOrgId                |

## Ledger Line Derivation Flow (High-Level)

1. Attendance document transitions to `approved`.
2. Cloud Function / server action loads contract (parent scope `contracts/{orgId}`) and period (derive from attendance.start or approval date, e.g., YYYYMM).
3. Compute minutes + rate, create `parents/{parentId}/ledgers/{periodId}/lines/{newId}` with: orgId, staffRef, attendanceId, shiftId, minutes, rateCents, amountCents, kind=work.
4. Corrections create `kind=correction` with `reversalOf` referencing original and net adjustment line if needed.

## Naming Principles

- Prefer singular collection names where standard (`staff`, `events`, `positions`).
- Avoid abbreviations (`org`, `uid` allowed as exceptions due to ubiquity).
- Enums are lower-case, hyphen-free.
- Append `Id` suffix for foreign key references (e.g., `venueId`, `zoneId`).
- Use lists with plural nouns: `requiredCertificationIds`, `orgIds`.

## Validation Strategy

- All server writes call `ensureValid(schema, data)` before persistence or AI function calls.
- Client forms use Zod schemas aligned to canonical definitions; adapter types (e.g., `ShiftLike`) must be temporary and documented with TODO for removal.

## Temporary / Transitional Types

| Type        | Location                  | Purpose                                            | Removal Criteria                                            |
| ----------- | ------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| `ShiftLike` | `shift-editor-dialog.tsx` | UI form decoupling pre-canonical shift integration | Remove when editor uses canonical `Shift` + event/positions |
| `UIShift`   | `schedule-calendar.tsx`   | Simplified local shift representation              | Replace with canonical `Shift` query adapter                |

## Reserved Namespaces

- `parents/**` – server-only ledger + contracts.
- `orgs/{orgId}/tokens/**` – sensitive join/partner tokens; only admins create/update.

## Security Checklist Cross-Reference

| Item                             | Rule/Invariant                                     | Location          |
| -------------------------------- | -------------------------------------------------- | ----------------- |
| No client writes to parent scope | All create/update/delete denied under `parents/**` | `firestore.rules` |
| Staff membership check           | `isStaff(orgId)` before read                       | `firestore.rules` |
| Attendance create guard          | Pending only + self staffId                        | `firestore.rules` |
| Limited role scan                | `hasAnyRole` checks first 3 roles                  | `firestore.rules` |

## Migration Notes

- Phase 1: Dual-read (legacy → canonical) for membership & shifts (UI adapters in place).
- Phase 2: Migrate UI to canonical `Shift` (remove `title`, use positions + zone for display string builder).
- Phase 3: Remove legacy exports from `types.ts`.
- Phase 4: Introduce join request replacement (if needed) using token patterns.

## Open TODOs (Documentation Scope)

- Add contract schema definition when implemented.
- Specify pay period derivation function (YYYYMM vs custom rules) once finalized.
- Document AI conflict detection output shape alignment to canonical types.

---

If a term is missing or ambiguous, add it here in a PR before usage in code.
