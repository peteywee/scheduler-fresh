# Implementation Priority Guide

This document provides a recommended order for addressing the issues documented in [ACTIONABLE_ISSUES.md](./ACTIONABLE_ISSUES.md).

## Phase 1: Unblock Development (Week 1)

These issues must be resolved immediately to enable local development.

### Issue #1: Missing .env.local Configuration

**Priority:** 🔴 Critical  
**Time:** 30-60 minutes  
**Owner:** DevOps / Setup lead

**Why First:**

- Blocks all local development
- Required for any Firebase operations
- Prerequisite for testing other fixes

**Quick Win:**
Follow [ENV_SETUP.md](./ENV_SETUP.md) step-by-step guide.

---

### Issue #2: Service Account Creation Script Failures

**Priority:** 🟡 High  
**Time:** 2-4 hours  
**Owner:** DevOps / Infrastructure

**Why Second:**

- Automates credential setup
- Reduces onboarding friction
- Makes Issue #1 repeatable

**Implementation:**

- Add project ID validation
- Improve error messages
- Add idempotency checks
- Test with fresh project

---

## Phase 2: Security Critical (Week 1-2)

These vulnerabilities expose the system to unauthorized access and must be fixed before any production deployment.

### Issue #3: Missing Authorization Checks in API Routes

**Priority:** 🔴 Critical  
**Time:** 1-2 days  
**Owner:** Backend / Security team

**Affected Files:**

- `src/app/api/shifts/route.ts`
- `src/app/api/orgs/[orgId]/members/route.ts`
- `src/app/api/invites/bulk-create/route.ts`
- `src/app/api/shifts/create/route.ts`
- `src/app/api/shifts/[shiftId]/route.ts`

**Implementation Order:**

1. Create reusable auth middleware/helper
2. Fix read operations first (GET endpoints)
3. Fix write operations (POST/PUT/DELETE)
4. Add comprehensive tests for each endpoint
5. Document auth requirements in API docs

---

### Issue #5: Insecure Invite Code Generation

**Priority:** 🟡 High  
**Time:** 2-4 hours  
**Owner:** Backend developer

**Why Important:**

- Security vulnerability allowing predictable codes
- Simple fix with high impact
- No database migration needed

**Implementation:**
Replace all `Math.random()` usage with `crypto.randomBytes()` in:

- `src/app/api/invites/bulk-create/route.ts`
- `src/app/api/invites/create/route.ts`

---

### Issue #6: Firestore Rules Missing exists() Checks

**Priority:** 🟡 High  
**Time:** 4-8 hours  
**Owner:** Backend / Security team

**Implementation:**

1. Audit all `get()` calls in `firestore.rules`
2. Add `exists()` checks before `.data` access
3. Write comprehensive rules unit tests
4. Deploy and monitor for rule errors

---

## Phase 3: Financial Integrity (Week 2-3)

These issues affect billing accuracy and financial calculations.

### Issue #9: Prevent Billing Without clockOut Time

**Priority:** 🟡 High  
**Time:** 4-6 hours  
**Owner:** Backend / Functions developer

**Why Critical:**

- Prevents incorrect billing
- Protects financial accuracy
- Relatively simple validation

**Implementation:**

1. Update Cloud Function validation
2. Add Firestore rule enforcement
3. Update UI to prevent approval without clockOut
4. Test with edge cases

---

### Issue #10: Prevent Duplicate Ledger Entries

**Priority:** 🔴 Critical  
**Time:** 1 day  
**Owner:** Backend / Functions developer

**Why Most Important:**

- Double-billing is unacceptable
- Common Cloud Functions issue
- Affects production reliability

**Implementation:**

1. Use deterministic document IDs
2. Replace `.add()` with `.create()`
3. Add comprehensive retry tests
4. Audit production data for existing duplicates

---

### Issue #11: Validate periodId Format

**Priority:** 🟡 High  
**Time:** 3-4 hours  
**Owner:** Backend developer

**Implementation:**

1. Create reusable validation function
2. Add to API route
3. Add to Firestore rules
4. Write validation tests

---

### Issue #12: Prevent staffId Modification

**Priority:** 🟡 High  
**Time:** 2-3 hours  
**Owner:** Backend developer

**Implementation:**

1. Update Firestore rules
2. Disable field in UI
3. Add rules unit tests
4. Document as immutable field

---

## Phase 4: Code Quality & Maintainability (Week 3-4)

These improve code quality and prevent future issues.

### Issue #7: Command Execution Security

**Priority:** 🟢 Medium  
**Time:** 1 day  
**Owner:** DevTools / Security

**Implementation:**

1. Add command validation
2. Detect dangerous patterns
3. Add confirmation prompts
4. Document safe usage

---

### Issue #6: Unsafe Regex Escapes

**Priority:** 🟢 Medium  
**Time:** 1-2 hours  
**Owner:** Any developer

**Quick Fix:**
Update regex patterns in `scripts/task-runner.ts` to use proper escaping.

---

## Phase 5: Performance & Scalability (Week 4+)

These improve system performance and prevent future bottlenecks.

### Issue #8: Missing Pagination in CSV Export

**Priority:** 🟢 Medium  
**Time:** 1 day  
**Owner:** Backend developer

**Implementation:**

1. Add cursor-based pagination
2. Include pagination metadata
3. Update client to handle batches
4. Load test with large datasets

---

## Testing Strategy

### Per-Issue Testing

Each issue has specific testing steps in [ACTIONABLE_ISSUES.md](./ACTIONABLE_ISSUES.md).

### Integration Testing After Each Phase

```bash
# After Phase 1 (Environment)
pnpm run dev
curl http://localhost:3000 -I

# After Phase 2 (Security)
pnpm run test:rules
# Run auth endpoint tests

# After Phase 3 (Financial)
# Run billing calculation tests
# Test Cloud Functions with retries

# After Phase 4 (Code Quality)
pnpm run typecheck
pnpm run lint

# After Phase 5 (Performance)
# Load test CSV exports
# Monitor memory usage
```

### Continuous Validation

```bash
# Run before every commit
pnpm run typecheck
pnpm run lint
pnpm run test:run

# Run before every deployment
pnpm run test:rules
pnpm run test:e2e
```

---

## Success Metrics

### Phase 1 Success

- [ ] New developers can set up environment in <30 minutes
- [ ] All validation scripts pass
- [ ] Dev servers start without errors

### Phase 2 Success

- [ ] All API endpoints require authentication
- [ ] Unauthorized requests return 401/403
- [ ] No Math.random() in security-sensitive code
- [ ] Zero Firestore rules evaluation errors

### Phase 3 Success

- [ ] No duplicate ledger entries in production
- [ ] 100% of approved attendance has clockOut
- [ ] All billing calculations are accurate
- [ ] Financial reports reconcile perfectly

### Phase 4 Success

- [ ] Zero lint/typecheck errors
- [ ] All dangerous commands blocked by default
- [ ] Task runner is secure and maintainable

### Phase 5 Success

- [ ] CSV exports complete in <10s for 5000 records
- [ ] No timeout errors on large datasets
- [ ] Memory usage stable under load

---

## Resource Allocation

### Developer Hours (Estimated)

| Phase     | Issues | Total Hours | Developer-Weeks |
| --------- | ------ | ----------- | --------------- |
| Phase 1   | 2      | 6-10        | 0.25            |
| Phase 2   | 3      | 30-40       | 1.0             |
| Phase 3   | 4      | 20-30       | 0.75            |
| Phase 4   | 2      | 20-24       | 0.5             |
| Phase 5   | 1      | 8           | 0.2             |
| **Total** | **12** | **84-112**  | **2.7 weeks**   |

### Recommended Team

- 1 Senior Backend Developer (Phases 2-3, security & functions)
- 1 Full-stack Developer (Phase 2-3, API routes & UI)
- 1 DevOps/Infrastructure (Phase 1)
- 1 QA Engineer (Testing all phases)

### Timeline

- **Sprint 1 (Week 1):** Phases 1-2 (Environment + Critical Security)
- **Sprint 2 (Week 2):** Phase 3 (Financial Integrity)
- **Sprint 3 (Week 3):** Phase 4 (Code Quality)
- **Sprint 4 (Week 4):** Phase 5 (Performance) + Buffer

---

## Risk Mitigation

### High-Risk Items

1. **Duplicate ledger entries** - Test thoroughly with function retries
2. **Auth bypass** - Review all API routes, not just the listed ones
3. **Production data** - Backup before any schema changes

### Rollback Plans

- Keep old auth patterns in separate branch until new auth is tested
- Use feature flags for financial calculation changes
- Database backups before any Firestore rule updates

### Monitoring After Each Phase

- Firebase Console → Rules evaluation errors
- Cloud Functions → Logs for errors/warnings
- Application → User-reported auth/billing issues

---

## Creating GitHub Issues

Use this template for each issue:

```markdown
## [Issue Title from ACTIONABLE_ISSUES.md]

**Priority:** [🔴/🟡/🟢] [Critical/High/Medium]
**Phase:** [1-5]
**Estimated Time:** [X hours/days]

### Objective

[Copy from ACTIONABLE_ISSUES.md]

### Problem Statement

[Copy from ACTIONABLE_ISSUES.md]

### Acceptance Criteria

[Copy checklist from ACTIONABLE_ISSUES.md]

### Testing Steps

[Copy from ACTIONABLE_ISSUES.md]

### Implementation Notes

[Copy from ACTIONABLE_ISSUES.md]

### Related Files

[Copy from ACTIONABLE_ISSUES.md]

### Dependencies

- [ ] Requires completion of Issue #X
- [ ] Blocks Issue #Y

### Labels

- `priority:[critical|high|medium]`
- `type:[security|bug|enhancement]`
- `phase:[1|2|3|4|5]`
```

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Owner:** Development Team Lead
