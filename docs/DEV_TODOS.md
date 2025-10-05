# Development TODOs (Rolling)

Purpose: High-velocity tracker for ongoing hygiene + feature migration tasks. Move items to ROADMAP_V2 when they become scheduled phase work.

## Active Hygiene / Infrastructure

- [ ] Replace `UIShift`/`ShiftLike` with canonical `Shift` once event + positions UI builder is ready.
- [ ] Add contract schema + pay period derivation helper (periodId convention doc update).
- [ ] Extend Firestore rules tests for tokens + zone collections.
- [ ] Add automated test ensuring glossary enums match Zod schema enums (generate & compare).
- [ ] Implement `versions:check` CI workflow step (fail job on drift).

## Functions / Backend

- [ ] Implement attendance approval trigger to create ledger line (idempotent check by attendanceId).
- [ ] Add correction flow (compensating ledger lines) + tests.
- [ ] Introduce contract caching layer (Firestore doc snapshot -> memory with TTL) for performance.

## Security / Auth

- [ ] Migrate legacy member `role` field (`employee`) to canonical `staff` in any remaining code paths.
- [ ] Audit custom claims usage (remove unused `orgRole` once role resolution centralizes on staff doc).

## UI / UX

- [ ] Calendar grid implementation (week/day views) with shift grouping.
- [ ] Shift editor: positions selection + zone picker.
- [ ] Attendance management UI (approve/reject) with optimistic updates.

## Documentation

- [ ] Update `NAMING_GLOSSARY.md` when contract schema lands.
- [ ] Add architectural diagram for ledger replication (sequence diagram) in `architecture.md`.

## Tooling

- [ ] Introduce script to diff package.json vs lockfile and report orphaned dependencies.
- [ ] Add badge auto-sync patterns (shields.io) to version-sync script.

## Nice-to-Have / Future

- [ ] Add OpenAPI (or typed client) generation for API routes.
- [ ] Genkit flow for auto-summarizing attendance anomalies.

---

Process: keep this lean; prune or promote items weekly.
