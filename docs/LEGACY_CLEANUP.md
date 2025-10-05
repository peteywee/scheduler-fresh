## Legacy Cleanup & Migration Matrix

Purpose: Track every legacy / duplicate / transitional artifact so we can remove stale files without losing intent or context. Only trim underbrush; no core refactors during this pass.

| Artifact                        | Path                                    | Type      | Action                                                                                                         | Rationale                                               | Status      |
| ------------------------------- | --------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- |
| Backup package manifest         | `package.json.bak.20250923-014849`      | backup    | Delete after diff recorded                                                                                     | Current `package.json` supersedes; all scripts migrated | Pending     |
| Legacy generic TODO list        | `TODO.md`                               | doc       | Merge salient completed notes into COPILOT_TODOS and delete                                                    | Redundant; tasks now in structured backlog              | Pending     |
| Misnamed Invite Manager         | `src/components/ui/calendar.tsx`        | component | Keep (annotated) + new `invite-manager.tsx` shim                                                               | Rename done; consumers can migrate gradually            | Done        |
| Overlap: Feature wishlist/style | `docs/blueprint.md`                     | doc       | Fold essentials (feature bullets still valid) into Architecture / Roadmap; add deprecation banner; then delete | Duplicates richer docs                                  | In Progress |
| Architecture canonical          | `docs/architecture.md`                  | doc       | Retain & enrich with any missing parent/ledger + invite details                                                | Primary source                                          | Active      |
| Implementation deep dive        | `docs/IMPLEMENTATION.md`                | doc       | Retain (authoritative tenancy + ledger logic)                                                                  | Needed for future onboarding                            | Active      |
| Roadmap v2 (if exists)          | `docs/ROADMAP_V2.md`                    | doc       | Evaluate overlap with COPILOT_TODOS; merge or delete                                                           | Possibly redundant                                      | Review      |
| Naming glossary                 | `docs/NAMING_GLOSSARY.md`               | doc       | Retain; update after any term removals                                                                         | Source of mappings                                      | Active      |
| Placeholder rules test          | `src/__tests__/firestore-rules.test.ts` | test      | Replace placeholder description & expand or remove if duplication with `src/test` harness                      | Avoid confusion                                         | Pending     |
| Husky deprecated script note    | `.husky/_/husky.sh`                     | tooling   | Acknowledge; ensure pinned husky v9; no action else                                                            | Upstream note only                                      | Done        |

### Immediate Deletions (after confirmation)

1. `package.json.bak.20250923-014849`
2. `TODO.md`

### Pre-Deletion Tasks

- [ ] Copy any unique untracked tasks from `TODO.md` (none beyond already completed list) – verify
- [ ] Confirm no references to `package.json.bak.*` in scripts or docs (search complete)

### Deprecation Banners To Apply

Add at file top:

```markdown
> [DEPRECATED – merged into ARCHITECTURE / ROADMAP on YYYY-MM-DD] This file remains temporarily for diff context; do not add new content.
```

Targets: `blueprint.md`, optionally `ROADMAP_V2.md` if merged.

### Verification Checklist

- [ ] Typecheck & lint still green after deletions
- [ ] No imports (NA for docs) pointing to removed files
- [ ] CI tasks unchanged

### Merge Strategy (develop → main)

1. Ensure branch parity & green pipeline on develop (manual fetch + rebase outside this automation scope)
2. Confirm this matrix fully closed (Status column has no 'Pending')
3. Perform fast-forward or squash merge; tag `v0.1.0-migration`.

### Notes

- We deliberately avoid altering runtime behavior; only doc + naming hygiene.
- If a future diff needs historical context, refer to git history prior to deletion commit.
