# Actionable Issues with Clear Objectives and Testable Outcomes

This document converts all identified issues from code reviews, compliance checks, and user feedback into actionable prompts with clear objectives and testable outcomes.

## Table of Contents

1. [Environment Setup Issues](#environment-setup-issues)
2. [Security & Authentication Issues](#security--authentication-issues)
3. [Code Quality & Best Practices](#code-quality--best-practices)
4. [Performance & Scalability](#performance--scalability)
5. [Data Integrity & Business Logic](#data-integrity--business-logic)

---

## Environment Setup Issues

### Issue 1: Missing .env.local Configuration

**Priority:** 🔴 Critical (Blocks Development)

**Objective:** Provide a complete, working `.env.local` file with all required Firebase and GCP credentials to enable local development.

**Problem Statement:**
The `.env.local` file does not exist or is incomplete, preventing developers from:

- Starting the development server
- Testing Firebase Admin SDK functionality
- Using Google AI/Genkit features
- Running the full application stack locally

**Acceptance Criteria:**

- [ ] `.env.local` file exists in project root
- [ ] All required Firebase client variables are populated:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] Firebase Admin service account JSON is properly encoded (base64)
- [ ] `GOOGLE_GENAI_API_KEY` is configured
- [ ] Environment validation script passes: `./scripts/env-utils.sh validate .env.local`
- [ ] Dev server starts without credential errors: `pnpm run dev:web`
- [ ] Admin SDK initializes successfully

**Testing Steps:**

```bash
# 1. Validate environment configuration
./scripts/env-utils.sh validate .env.local

# 2. Test admin SDK initialization
node -e "require('dotenv').config({path:'.env.local'}); import('./src/lib/firebase.server.ts').then(()=>console.log('✓ Admin init OK')).catch(e=>console.error('✗ Failed:',e.message))"

# 3. Start dev server
pnpm run dev:web

# 4. Check for credential errors in console
curl http://localhost:3000 -I
```

**Implementation Guide:**

1. Copy `.env.example` to `.env.local`
2. Follow `docs/firebase-gcp-cli-setup.md` for detailed setup steps
3. Use `./scripts/service-accounts.sh create <project-id>` to generate service account
4. Use `./scripts/env-utils.sh update .env.local <KEY> <VALUE>` to populate variables
5. Verify with validation script

**Related Files:**

- `.env.example`
- `scripts/env-utils.sh`
- `scripts/service-accounts.sh`
- `docs/firebase-gcp-cli-setup.md`
- `src/lib/firebase.server.ts`

---

### Issue 2: Service Account Creation Script Failures

**Priority:** 🟡 High

**Objective:** Fix the service account creation script to properly handle project IDs and generate valid service account keys without errors.

**Problem Statement:**
Running `./scripts/service-accounts.sh create YOUR_PROJECT_ID` produces errors:

- Invalid project ID error when placeholder is used literally
- IAM binding failures
- Invalid service account identifier errors
- `.env.local` not being updated with the generated key

**Acceptance Criteria:**

- [ ] Script validates that a real project ID (not placeholder) is provided
- [ ] Script sets `gcloud config set project <project-id>` automatically
- [ ] Service account is created successfully with proper naming
- [ ] All required IAM roles are assigned without errors
- [ ] Service account key is generated and base64-encoded
- [ ] `.env.local` is automatically updated with the encoded key
- [ ] Script provides clear error messages with remediation steps
- [ ] Script is idempotent (can be run multiple times safely)

**Testing Steps:**

```bash
# 1. Ensure gcloud is authenticated
gcloud auth list

# 2. Run service account creation with real project ID
./scripts/service-accounts.sh create jordan-9697

# 3. Verify service account was created
gcloud iam service-accounts list --project=jordan-9697 | grep scheduler-fresh-firebase

# 4. Verify roles were assigned
gcloud projects get-iam-policy jordan-9697 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:scheduler-fresh-firebase@jordan-9697.iam.gserviceaccount.com" \
  --format="table(bindings.role)"

# 5. Verify .env.local was updated
grep "FIREBASE_SERVICE_ACCOUNT_JSON=" .env.local | grep -q "^FIREBASE_SERVICE_ACCOUNT_JSON=.\\{50,\\}" && echo "✓ Key populated"

# 6. Test decoding
./scripts/env-utils.sh service-account .env.local | jq .project_id
```

**Implementation Changes Needed:**

- Add project ID validation at script start
- Auto-configure gcloud project before operations
- Improve error handling with actionable messages
- Add rollback capability for partial failures
- Better separation of service account email construction

**Related Files:**

- `scripts/service-accounts.sh`
- `scripts/env-utils.sh`
- `.env.local`

---

## Security & Authentication Issues

### Issue 3: Missing Authorization Checks in API Routes

**Priority:** 🔴 Critical (Security Vulnerability)

**Objective:** Add authentication and authorization checks to all API endpoints that access organization data to prevent unauthorized data disclosure.

**Problem Statement:**
Multiple API routes return sensitive data without verifying:

- User authentication (valid Firebase ID token)
- User authorization (membership in the organization)
- User role permissions (admin/manager/staff)

**Affected Endpoints:**

- `GET /api/shifts` - Returns all shifts for orgId without auth check
- `GET /api/orgs/{orgId}/members` - Returns all members without verification
- `POST /api/invites/bulk-create` - Creates invites without auth
- `POST /api/shifts/create` - Creates shifts with fallback auth that defaults to `true`
- `DELETE /api/shifts/{shiftId}` - Deletes shifts with fallback auth

**Acceptance Criteria:**

- [ ] All API routes verify Firebase ID token from Authorization header
- [ ] Routes extract `uid` from verified token
- [ ] Routes check user membership in target org using `verifyOrgAccess()`
- [ ] Routes enforce minimum required role (admin, manager, or staff)
- [ ] Failed auth returns 401 Unauthorized
- [ ] Failed authz returns 403 Forbidden
- [ ] Error messages don't leak sensitive information
- [ ] No fallback that grants access on import/validation failure

**Testing Steps:**

```bash
# 1. Test without authentication
curl -X GET "http://localhost:3000/api/shifts?orgId=test-org"
# Expected: 401 Unauthorized

# 2. Test with invalid token
curl -X GET "http://localhost:3000/api/shifts?orgId=test-org" \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Unauthorized

# 3. Test with valid token but no membership
# (Get token for user not in test-org)
curl -X GET "http://localhost:3000/api/shifts?orgId=test-org" \
  -H "Authorization: Bearer $VALID_TOKEN_NO_MEMBERSHIP"
# Expected: 403 Forbidden

# 4. Test with valid token and membership
curl -X GET "http://localhost:3000/api/shifts?orgId=test-org" \
  -H "Authorization: Bearer $VALID_TOKEN_WITH_MEMBERSHIP"
# Expected: 200 OK with shift data

# 5. Test role enforcement (staff trying to create shifts)
curl -X POST "http://localhost:3000/api/shifts/create" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"test-org", ...}'
# Expected: 403 Forbidden (if only admin/manager can create)
```

**Implementation Pattern:**

```typescript
export async function GET(req: Request) {
  // 1. Extract and verify token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = authHeader.substring(7);
  let decodedToken;
  try {
    decodedToken = await adminAuth().verifyIdToken(token);
  } catch (err) {
    console.error("Token verification failed:", err);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Get orgId from request
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) {
    return new NextResponse("Missing orgId", { status: 400 });
  }

  // 3. Verify org access with required role
  const { verifyOrgAccess } = await import("@/lib/auth-utils");
  const hasAccess = await verifyOrgAccess(decodedToken.uid, orgId, [
    "admin",
    "manager",
  ]);
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 4. Proceed with authorized operation
  // ...
}
```

**Related Files:**

- `src/app/api/shifts/route.ts`
- `src/app/api/orgs/[orgId]/members/route.ts`
- `src/app/api/invites/bulk-create/route.ts`
- `src/app/api/shifts/create/route.ts`
- `src/app/api/shifts/[shiftId]/route.ts`
- `src/lib/auth-utils.ts`

---

### Issue 4: Insecure Invite Code Generation

**Priority:** 🟡 High (Security Risk)

**Objective:** Replace `Math.random()` with cryptographically secure random generation for invite codes to prevent predictable or colliding codes.

**Problem Statement:**
The bulk invite creation endpoint uses `Math.random().toString(36)` to generate invite codes, which:

- Is not cryptographically secure
- Can produce predictable patterns
- May generate collisions (duplicate codes)
- Creates a security vulnerability allowing unauthorized access

**Current Code Location:**

- `src/app/api/invites/bulk-create/route.ts` line ~25

**Acceptance Criteria:**

- [ ] Invite codes use Node.js `crypto.randomBytes()` for generation
- [ ] Code length provides sufficient entropy (minimum 128 bits)
- [ ] Codes are URL-safe (hex or base64url encoding)
- [ ] Uniqueness is enforced (check for existing code before writing)
- [ ] Short codes also use secure generation
- [ ] No use of `Math.random()` for security-sensitive operations
- [ ] Existing insecure codes remain valid (no breaking change)

**Testing Steps:**

```bash
# 1. Generate 10000 codes and check for duplicates
node -e "
const crypto = require('crypto');
const codes = new Set();
for (let i=0; i<10000; i++) {
  const code = crypto.randomBytes(5).toString('hex');
  if (codes.has(code)) {
    console.error('Duplicate found:', code);
    process.exit(1);
  }
  codes.add(code);
}
console.log('✓ No duplicates in 10,000 codes');
"

# 2. Verify entropy (code length)
node -e "
const crypto = require('crypto');
const code = crypto.randomBytes(5).toString('hex');
console.log('Code:', code, 'Length:', code.length, 'Entropy:', 5*8, 'bits');
"

# 3. Test invite creation endpoint
curl -X POST http://localhost:3000/api/invites/bulk-create \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "test-org",
    "users": [{"role": "staff", "email": "test@example.com"}]
  }'

# 4. Verify code format in Firestore
# Check that codes are hex strings of expected length
```

**Implementation:**

```typescript
import { randomBytes } from "crypto";

// Generate secure invite code (10 hex characters = 40 bits entropy minimum)
const code = randomBytes(5).toString("hex");
const shortCode = randomBytes(4).toString("hex");

// Before creating, verify uniqueness
const invitesCollection = adminDb().collection(`orgs/${orgId}/invites`);
const existing = await invitesCollection
  .where("code", "==", code)
  .limit(1)
  .get();
if (!existing.empty) {
  // Regenerate or handle collision
  console.warn("Invite code collision detected, regenerating");
  continue; // Retry logic
}
```

**Related Files:**

- `src/app/api/invites/bulk-create/route.ts`
- `src/app/api/invites/create/route.ts`

---

### Issue 5: Firestore Rules Missing exists() Checks

**Priority:** 🟡 High (Security & Stability)

**Objective:** Fix Firestore security rules to check `exists()` before accessing `.data` to prevent null reference errors and unauthorized access.

**Problem Statement:**
Security rules use `get(...).data.field` without first checking if the document exists using `exists(...)`. This can:

- Cause rule evaluation errors when documents are missing
- Allow unintended access due to failed rule evaluation
- Result in null dereference errors

**Affected Rules:**

- `hasOrgRole()` function
- `isOrgAdminOrManager()` function
- Any rule using `get()` without `exists()` check

**Current Vulnerable Pattern:**

```javascript
function hasOrgRole(orgId, role) {
  let userRole = get(/databases/$(database)/documents/orgs/$(orgId)/members/$(request.auth.uid)).data.role;
  return userRole == role;
}
```

**Acceptance Criteria:**

- [ ] All `get()` calls are preceded by `exists()` check
- [ ] Rules fail closed (deny access) when documents don't exist
- [ ] Helper functions return safe defaults (false) for missing docs
- [ ] Rules are tested with missing membership documents
- [ ] No rule evaluation errors in Firebase console

**Testing Steps:**

```bash
# 1. Run rules unit tests
pnpm run test:rules

# 2. Test with missing membership document
# Create test user
# Attempt to access org resources without membership doc
# Expected: Access denied, no rule errors

# 3. Test with existing membership
# Create membership document
# Attempt to access with correct role
# Expected: Access granted

# 4. Monitor Firebase console for rule evaluation errors
# Should show 0 errors after deployment
```

**Implementation Pattern:**

```javascript
function hasOrgRole(orgId, role) {
  let memberPath = /databases/$(database)/documents/orgs/$(orgId)/members/$(request.auth.uid);
  // First check if member document exists
  if (!exists(memberPath)) {
    return false; // Fail closed - no membership = no access
  }
  let userRole = get(memberPath).data.role;
  return userRole == role;
}

function isOrgAdminOrManager(orgId) {
  let memberPath = /databases/$(database)/documents/orgs/$(orgId)/members/$(request.auth.uid);
  if (!exists(memberPath)) {
    return false;
  }
  let userRole = get(memberPath).data.role;
  return userRole in ['admin', 'manager'];
}
```

**Related Files:**

- `firestore.rules`
- `src/test/firestore.rules.test.ts` (if exists)
- `vitest.rules.config.ts`

---

## Code Quality & Best Practices

### Issue 6: Unsafe Regex Escapes in Task Runner

**Priority:** 🟢 Medium (Code Quality)

**Objective:** Fix regex patterns in task runner to properly escape word boundaries and prevent destructive tasks from running.

**Problem Statement:**
The `DEFAULT_EXCLUDE_PATTERNS` in task-runner uses string literals like `"\\bkill\\b"` which compile to backspace characters (`\b`) instead of word boundaries (`\\b`) in the regex. This causes:

- Exclusion patterns to fail matching
- Potentially dangerous tasks (kill, stop) could run when they shouldn't
- Unexpected behavior when `ALLOW_DESTRUCTIVE` is false

**Current Code:**

```typescript
const DEFAULT_EXCLUDE_PATTERNS = [
  "\\bkill\\b",
  "\\bstop\\b",
  "\\btask-runner\\b",
];
```

**Acceptance Criteria:**

- [ ] Regex patterns use proper escaping for word boundaries
- [ ] Destructive tasks are excluded by default
- [ ] `pnpm run kill:*` commands are blocked when `ALLOW_DESTRUCTIVE=false`
- [ ] `pnpm run stop:*` commands are blocked when `ALLOW_DESTRUCTIVE=false`
- [ ] Task runner logs excluded tasks when in verbose mode
- [ ] Exclusion patterns can be overridden via config

**Testing Steps:**

```bash
# 1. Test exclusion with default config
TASK_PRESET=frontend-dev pnpm run task-runner
# Should NOT show kill:* or stop:* tasks in menu

# 2. Test with ALLOW_DESTRUCTIVE enabled
ALLOW_DESTRUCTIVE=true TASK_PRESET=frontend-dev pnpm run task-runner
# Should show destructive tasks

# 3. Verify regex matches correctly
node -e "
const pattern = '\\\\bkill\\\\b'; // Double escape for shell
const regex = new RegExp(pattern, 'i');
console.log('Matches kill:', regex.test('kill'));
console.log('Matches kill:ports:', regex.test('kill:ports'));
console.log('Matches skilled:', regex.test('skilled')); // Should be false
"

# 4. Check task-runner.config.json exclusions
cat task-runner.config.json | jq .exclude
```

**Implementation:**

```typescript
// Use raw string literal or double escaping
const DEFAULT_EXCLUDE_PATTERNS = [
  "\\bkill\\b", // Matches 'kill' as whole word
  "\\bstop\\b", // Matches 'stop' as whole word
  "\\btask-runner\\b",
];

// OR use regex literals
const DEFAULT_EXCLUDE_PATTERNS = [/\bkill\b/i, /\bstop\b/i, /\btask-runner\b/i];
```

**Related Files:**

- `scripts/task-runner.ts`
- `task-runner.config.json`

---

### Issue 7: Command Execution Security in Task Runner

**Priority:** 🟢 Medium (Security Hardening)

**Objective:** Improve task runner security by validating commands before execution and preventing shell injection.

**Problem Statement:**
Task runner spawns commands with `shell: true` and sources commands from package.json scripts. While exclusion patterns provide some protection:

- Untrusted package.json scripts could inject malicious commands
- `shell: true` enables shell metacharacter injection
- `ALLOW_DESTRUCTIVE` flag can bypass all safeguards
- No validation of command safety before execution

**Acceptance Criteria:**

- [ ] Commands are validated against an allowlist or safe pattern
- [ ] Shell metacharacters are detected and warned about
- [ ] Task runner logs the exact command before execution
- [ ] Confirmation prompt shown for destructive operations
- [ ] User can configure trust level per package.json
- [ ] Commands are executed without `shell: true` when possible
- [ ] Environment variables are sanitized

**Testing Steps:**

```bash
# 1. Add a malicious script to package.json (for testing only)
# "malicious": "rm -rf /tmp/test; echo 'executed'"

# 2. Run task runner and verify warning
pnpm run task-runner
# Should show security warning about destructive command

# 3. Test with injection attempt
# "inject": "echo $(whoami)"
# Should detect and warn about command substitution

# 4. Verify execution without shell when possible
# Scripts without pipes/redirects should use execFile
```

**Implementation Enhancements:**

```typescript
function validateCommand(cmd: string): { safe: boolean; reason?: string } {
  // Check for dangerous patterns
  const dangerous = [
    /rm\s+-rf/, // Recursive delete
    /;\s*rm\b/, // Command chaining with rm
    />\s*\/dev\//, // Writing to devices
    /curl.*\|\s*sh/, // Pipe to shell
    /wget.*\|\s*sh/,
    /\$\(/, // Command substitution
    /`[^`]+`/, // Backtick substitution
  ];

  for (const pattern of dangerous) {
    if (pattern.test(cmd)) {
      return { safe: false, reason: `Contains dangerous pattern: ${pattern}` };
    }
  }

  return { safe: true };
}

// Before executing
const validation = validateCommand(task.cmd);
if (!validation.safe) {
  console.warn(`⚠️  Potentially unsafe command: ${task.id}`);
  console.warn(`   Reason: ${validation.reason}`);
  console.warn(`   Command: ${task.cmd}`);
  // Require explicit confirmation or skip
}
```

**Related Files:**

- `scripts/task-runner.ts`

---

## Performance & Scalability

### Issue 8: Missing Pagination in CSV Export Endpoint

**Priority:** 🟢 Medium (Scalability)

**Objective:** Add pagination support to the parent ledger CSV export endpoint to prevent timeouts and memory issues with large datasets.

**Problem Statement:**
The `/api/parent/ledger/export` endpoint fetches all ledger lines for a period without pagination. This can cause:

- Request timeouts with >1000 records
- High memory usage on server
- Slow response times affecting user experience
- Potential Cloud Function timeout (60s max)

**Current Implementation:**

```typescript
const snap = await db
  .collection("parents")
  .doc(parentId)
  .collection("ledgers")
  .doc(periodId)
  .collection("lines")
  .get();
```

**Acceptance Criteria:**

- [ ] Endpoint accepts `limit` query parameter (default: 1000, max: 5000)
- [ ] Endpoint accepts `offset` or cursor-based pagination
- [ ] Response includes pagination metadata (total, hasMore, nextCursor)
- [ ] Large exports are batched automatically
- [ ] Export maintains sort order (by createdAt)
- [ ] Memory usage remains constant regardless of dataset size
- [ ] Export completes within Cloud Function timeout limits

**Testing Steps:**

```bash
# 1. Create test ledger with 5000 lines
# (Use seed script or test data generator)

# 2. Test without pagination (should work but warn if slow)
curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=2025-W01" \
  -H "Authorization: Bearer $PARENT_ADMIN_TOKEN"
# Measure time, should complete in <10s

# 3. Test with limit
curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=2025-W01&limit=100" \
  -H "Authorization: Bearer $PARENT_ADMIN_TOKEN"
# Should return 100 rows + pagination info

# 4. Test cursor-based pagination
curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=2025-W01&limit=100&cursor=$CURSOR" \
  -H "Authorization: Bearer $PARENT_ADMIN_TOKEN"

# 5. Load test with large dataset
# Create 10,000 records, export in batches
# Monitor memory usage and response time
```

**Implementation:**

```typescript
const limit = Math.min(
  parseInt(searchParams.get("limit") || "1000", 10),
  5000, // Max limit
);
const cursor = searchParams.get("cursor");

let query = db
  .collection("parents")
  .doc(parentId)
  .collection("ledgers")
  .doc(periodId)
  .collection("lines")
  .orderBy("createdAt", "asc")
  .limit(limit);

if (cursor) {
  // Cursor-based pagination (more efficient)
  const cursorDoc = await db
    .collection("parents")
    .doc(parentId)
    .collection("ledgers")
    .doc(periodId)
    .collection("lines")
    .doc(cursor)
    .get();
  if (cursorDoc.exists) {
    query = query.startAfter(cursorDoc);
  }
}

const snap = await query.get();

// Include pagination in response
const hasMore = snap.docs.length === limit;
const nextCursor = hasMore ? snap.docs[snap.docs.length - 1].id : null;

// Return with pagination metadata in headers or JSON wrapper
```

**Related Files:**

- `src/app/api/parent/ledger/export/route.ts`

---

## Data Integrity & Business Logic

### Issue 9: Prevent Billing Without clockOut Time

**Priority:** 🟡 High (Data Integrity)

**Objective:** Validate that attendance records have a `clockOut` time before processing them for billing to prevent incorrect calculations.

**Problem Statement:**
The `replicateApprovedAttendance` function uses `clockOut ?? Date.now()` as a fallback, which means:

- If an admin approves attendance without closing the shift, it bills using the function execution time
- This creates incorrect billing amounts
- Hours worked are miscalculated
- Parent organizations are billed incorrectly

**Current Code:**

```typescript
const clockOut = (after.clockOut ?? Date.now()) as number;
```

**Acceptance Criteria:**

- [ ] Function validates `clockOut` exists before processing
- [ ] Missing `clockOut` logs a warning with attendance ID
- [ ] Function returns early (skips replication) for invalid records
- [ ] Firestore rules prevent approval without `clockOut`
- [ ] UI prevents admins from approving without closing shift
- [ ] Existing records with missing `clockOut` are identified and fixed
- [ ] Monitoring alerts on skipped replications

**Testing Steps:**

```bash
# 1. Create attendance record without clockOut
# Approve the record
# Check Cloud Function logs for warning
# Expected: "Attendance {id} approved without a clockOut time. Skipping."

# 2. Verify no ledger line was created
# Check parents/{parentId}/ledgers/{periodId}/lines
# Should have no line with sourceAttendanceId matching the test record

# 3. Create attendance with clockOut
# Approve the record
# Verify ledger line is created with correct hours

# 4. Test Firestore rules (if implemented)
# Attempt to update attendance status to approved without clockOut
# Expected: Permission denied
```

**Implementation:**

```typescript
export async function replicateApprovedAttendance(
  change: Change<DocumentSnapshot>,
  db: admin.firestore.Firestore,
) {
  const after = change.after.data() as AttendanceRecord;
  const before = change.before.data() as AttendanceRecord | undefined;

  const becameApproved =
    after.status === "approved" && (!before || before.status !== "approved");
  if (!becameApproved) return;

  // CRITICAL: Validate clockOut exists
  if (!after.clockOut) {
    console.warn(
      `[BILLING] Attendance ${change.after.id} approved without clockOut. ` +
        `Skipping replication to prevent incorrect billing. ` +
        `orgId: ${after.tenantId}, staffId: ${after.staffId}`,
    );
    return; // Skip replication
  }

  const clockOut = after.clockOut as number;
  // Continue with billing calculation...
}
```

**Firestore Rules Enhancement:**

```javascript
function validAttendanceApproval() {
  let d = request.resource.data;
  let isApproving =
    d.status == "approved" && resource.data.status != "approved";
  let hasClockOut = "clockOut" in d && d.clockOut != null;
  // Only allow approval if clockOut is present
  return !isApproving || hasClockOut;
}
```

**Related Files:**

- `functions/src/replicateAttendance.ts`
- `firestore.rules`

---

### Issue 10: Prevent Duplicate Ledger Entries (Idempotency)

**Priority:** 🔴 Critical (Financial Accuracy)

**Objective:** Ensure Cloud Functions that create ledger entries are idempotent to prevent duplicate billing from function retries.

**Problem Statement:**
The `replicateApprovedAttendance` function uses `.add()` to create ledger lines, which:

- Generates a new document ID on each invocation
- Allows duplicates if the function is retried (common in Cloud Functions)
- Results in double-billing or triple-billing the same attendance record
- Creates financial discrepancies that are difficult to reconcile

**Acceptance Criteria:**

- [ ] Ledger line document IDs are deterministic (based on `sourceAttendanceId`)
- [ ] Function uses `.create()` instead of `.add()` to enforce uniqueness
- [ ] Function checks for existing ledger line before creating
- [ ] Retries of the function don't create duplicates
- [ ] Existing duplicate entries are identified and resolved
- [ ] Function logs when it skips duplicate creation
- [ ] Integration tests verify idempotency

**Testing Steps:**

```bash
# 1. Create and approve an attendance record
# Verify one ledger line is created

# 2. Manually invoke the function again with the same change
# (Simulate retry)
# Verify error or skip message, no new ledger line

# 3. Check for duplicate lines in production data
firebase firestore:export gs://backup-bucket/export
# Analyze export for duplicate sourceAttendanceId values

# 4. Load test: Approve 100 records concurrently
# Verify exactly 100 ledger lines are created (no duplicates)
```

**Implementation - Option 1: Deterministic ID**

```typescript
// Use attendance ID to create deterministic ledger line ID
const lineId = `att_${change.after.id}`;
const dest = db
  .collection("parents")
  .doc(parentId)
  .collection("ledgers")
  .doc(periodId)
  .collection("lines")
  .doc(lineId);

try {
  // create() will fail if document already exists
  await dest.create({
    parentId,
    subOrgId: orgId,
    staffRef: staffId,
    venueId,
    periodId,
    hours,
    billRate: contract.billRate || 0,
    amount,
    sourceAttendanceId: change.after.id,
    createdAt: Date.now(),
  });
  console.log(
    `[BILLING] Created ledger line ${lineId} for attendance ${change.after.id}`,
  );
} catch (err: any) {
  if (err.code === 6) {
    // ALREADY_EXISTS
    console.log(
      `[BILLING] Ledger line ${lineId} already exists, skipping (idempotent).`,
    );
    return; // Success - idempotent behavior
  }
  throw err; // Re-throw other errors
}
```

**Implementation - Option 2: Check Before Create**

```typescript
// Check if ledger line already exists
const existingQuery = await db
  .collectionGroup("lines")
  .where("sourceAttendanceId", "==", change.after.id)
  .limit(1)
  .get();

if (!existingQuery.empty) {
  console.log(
    `[BILLING] Ledger line for attendance ${change.after.id} already exists. ` +
      `Skipping (idempotent).`,
  );
  return;
}

// Proceed to create ledger line
const dest = db
  .collection("parents")
  .doc(parentId)
  .collection("ledgers")
  .doc(periodId)
  .collection("lines");
await dest.add({
  /* ... */
});
```

**Recommended: Use Option 1 (deterministic ID) for better performance and atomicity.**

**Related Files:**

- `functions/src/replicateAttendance.ts`
- `functions/src/test/replicateAttendance.test.ts` (create if doesn't exist)

---

### Issue 11: Validate periodId Format in Ledger Routes

**Priority:** 🟡 High (Security & Data Validation)

**Objective:** Add server-side validation to ensure `periodId` parameters match expected formats before using them in database queries.

**Problem Statement:**
The ledger export endpoint accepts `periodId` from query parameters without validation. This allows:

- Path traversal attacks using `../../other-document`
- Access to unintended documents
- Potential data leakage across tenants
- Confusing error messages for invalid formats

**Expected Formats:**

- Weekly: `YYYY-Www` (e.g., `2025-W01`)
- Biweekly: `YYYY-BWww` (e.g., `2025-BW01`)
- Monthly: `YYYY-Mmm` (e.g., `2025-M01`)

**Acceptance Criteria:**

- [ ] API routes validate `periodId` format before database queries
- [ ] Invalid formats return 400 Bad Request with clear message
- [ ] Firestore rules also validate `periodId` format (defense in depth)
- [ ] Valid period IDs are logged for audit purposes
- [ ] Error responses don't leak sensitive information
- [ ] Validation is consistent across all ledger-related endpoints

**Testing Steps:**

```bash
# 1. Test valid period formats
curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=2025-W01" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK

curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=2025-BW01" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK

curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=2025-M01" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK

# 2. Test invalid formats
curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=invalid" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 400 Bad Request

curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=../../other" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 400 Bad Request

curl "http://localhost:3000/api/parent/ledger/export?parentId=test&periodId=2025-W1" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 400 Bad Request (week should be 2 digits)

# 3. Test Firestore rules (if implemented)
# Attempt to read ledger with invalid periodId via SDK
# Expected: Permission denied
```

**Implementation - API Route:**

```typescript
// Period ID validation function
function isValidPeriodId(periodId: string): boolean {
  const patterns = [
    /^\d{4}-W\d{2}$/, // Weekly: YYYY-Www
    /^\d{4}-BW\d{2}$/, // Biweekly: YYYY-BWww
    /^\d{4}-M\d{2}$/, // Monthly: YYYY-Mmm
  ];
  return patterns.some((pattern) => pattern.test(periodId));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  const periodId = searchParams.get("periodId");

  if (!parentId || !periodId) {
    return new NextResponse("Missing parentId or periodId", { status: 400 });
  }

  // Validate periodId format
  if (!isValidPeriodId(periodId)) {
    return new NextResponse(
      "Invalid periodId format. Expected: YYYY-Www, YYYY-BWww, or YYYY-Mmm",
      { status: 400 },
    );
  }

  // Continue with authorized query...
}
```

**Implementation - Firestore Rules:**

```javascript
match /parents/{parentId}/ledgers/{periodId}/lines/{lineId} {
  function isValidPeriod(periodId) {
    // YYYY-Www, YYYY-BWww, or YYYY-Mmm
    return periodId.matches('^\\d{4}-W\\d{2}$') ||
           periodId.matches('^\\d{4}-BW\\d{2}$') ||
           periodId.matches('^\\d{4}-M\\d{2}$');
  }

  allow get, list: if isParentAdmin(parentId) && isValidPeriod(periodId);
  allow create, update, delete: if false; // Server-only writes
}
```

**Related Files:**

- `src/app/api/parent/ledger/export/route.ts`
- `firestore.rules`
- `src/lib/validation/period.ts` (create for reusable validation)

---

### Issue 12: Prevent staffId Modification in Attendance Updates

**Priority:** 🟡 High (Data Integrity)

**Objective:** Make the `staffId` field immutable after attendance record creation to prevent reassignment of hours to different staff members.

**Problem Statement:**
The `validAttendanceUpdate()` function in Firestore rules doesn't prevent changing `staffId` on updates. This allows:

- Malicious or mistaken admins to reassign attendance to different staff
- Billing discrepancies when hours are attributed to wrong person
- Payroll errors and potential financial disputes
- Audit trail issues

**Acceptance Criteria:**

- [ ] Firestore rules enforce `staffId` immutability on updates
- [ ] Attempts to change `staffId` are rejected with clear error
- [ ] New attendance records can set any valid `staffId`
- [ ] Rules are tested with both valid and invalid update attempts
- [ ] Client UI prevents staffId modification (disabled field)
- [ ] Audit logs record attempted unauthorized changes

**Testing Steps:**

```bash
# 1. Create attendance record
# staffId: "user123"

# 2. Attempt to update with same staffId (should succeed)
# Update clockOut time, keep staffId: "user123"
# Expected: Success

# 3. Attempt to update with different staffId (should fail)
# Update staffId to "user456"
# Expected: Permission denied with message about immutable staffId

# 4. Run rules unit tests
pnpm run test:rules
# Should include tests for staffId immutability
```

**Implementation - Firestore Rules:**

```javascript
function validAttendanceUpdate(orgId) {
  let d = request.resource.data;
  let hasBase = d
    .keys()
    .hasAll(["id", "tenantId", "staffId", "venueId", "clockIn", "status"]);
  let belongs = "tenantId" in d && d.tenantId == orgId;
  let statusOk =
    "status" in d && d.status in ["pending", "approved", "rejected"];

  // NEW: Ensure staffId cannot be changed on update
  let staffIdUnchanged = d.staffId == resource.data.staffId;

  return hasBase && belongs && statusOk && staffIdUnchanged;
}
```

**Implementation - Rules Unit Test:**

```typescript
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

test("cannot change staffId on attendance update", async () => {
  const db = testEnv.authenticatedContext("admin123").firestore();

  // Create attendance record
  const attendanceRef = db.doc("orgs/org1/attendance/att1");
  await adminDb.doc("orgs/org1/attendance/att1").set({
    id: "att1",
    tenantId: "org1",
    staffId: "user123", // Original staff
    venueId: "venue1",
    clockIn: Date.now(),
    status: "pending",
  });

  // Attempt to update staffId (should fail)
  await assertFails(
    attendanceRef.update({
      staffId: "user456", // Different staff - should be rejected
    }),
  );

  // Update other fields keeping staffId (should succeed)
  await assertSucceeds(
    attendanceRef.update({
      clockOut: Date.now(),
      status: "approved",
    }),
  );
});
```

**Related Files:**

- `firestore.rules`
- `src/test/firestore.rules.test.ts`
- `vitest.rules.config.ts`

---

## Summary

This document provides **12 actionable issues** with:

- Clear objectives stated upfront
- Detailed problem statements with context
- Specific acceptance criteria (checkboxes)
- Concrete testing steps with commands
- Implementation guidance with code examples
- References to related files

### Priority Breakdown:

- 🔴 **Critical (4 issues):** Blocking development or causing security/financial risks
- 🟡 **High (6 issues):** Important security, data integrity, or correctness issues
- 🟢 **Medium (2 issues):** Code quality and scalability improvements

### Next Steps:

1. Address critical issues first (environment setup, auth, financial integrity)
2. Create GitHub issues from these templates with appropriate labels
3. Assign owners and set sprint milestones
4. Track completion via acceptance criteria checkboxes
5. Update this document as issues are resolved

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Maintained By:** Development Team
