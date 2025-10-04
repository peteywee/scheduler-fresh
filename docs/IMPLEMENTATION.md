# Multi-Tenant Contractor/Subcontractor Implementation

This document describes the multi-tenant staff scheduler implementation with contractor/subcontractor model and strict data isolation.

## Architecture Overview

### Data Model

The implementation follows a parent-child organizational model where:

- **Parents (contractors)**: Organizations that manage multiple sub-organizations and receive consolidated billing information
- **Sub-organizations**: Individual organizations that track their own staff, attendance, and schedules
- **Strict data isolation**: Sub-organizations cannot access each other's data; parent organizations only see aggregated billing data without PII

### Firestore Collections

```
orgs/{orgId}/                           # Sub-organization data
  attendance/{eventId}                  # Clock in/out events
  members/{uid}                         # Organization membership
  invites/{inviteId}                    # Role-scoped invite codes (admin managed)
  joinRequests/{requestId}              # Pending access requests (staff initiated)
  public/profile                        # Optional directory metadata (listed flag gated)
  shifts/{shiftId}                      # Scheduling entries (admin/manager)

parents/{parentId}/                     # Parent organization data (read-only via claims)
  contracts/{subOrgId}                  # Billing contracts with sub-orgs
  ledgers/{periodId}/                   # Billing period ledgers
    lines/{lineId}                      # Individual billing line items (append-only)
```

## Security highlights

- Members must exist in `orgs/{orgId}/members/{uid}` to read org data; admins/managers control membership.
- Attendance is append-only for staff (pending only) with approvals mediated by admins/managers.
- Join requests can be submitted by authenticated users but only org admins/managers may adjudicate.
- Invite and shift management remain restricted to admin/manager roles; public profiles expose data only when explicitly flagged `listed`.
- Parent ledgers/contracts are client read-only for users bearing `{ parentAdmin: true, parentId }` claims—writes remain server-only.

## Implementation Details

### 1. Cloud Functions (functions/)

**Location**: `functions/src/`

#### Main Function

- `functions/src/index.ts`: Exports the `onAttendanceWrite` trigger

#### Replication Logic

- `functions/src/replicateAttendance.ts`: Handles attendance approval → ledger replication
  - Triggers when attendance status becomes "approved"
  - Loads contract for the sub-organization
  - Calculates hours with rounding policy
  - Creates append-only ledger line entry

#### Utility Modules

- `functions/src/lib/time.ts`: Time calculation utilities
  - `computeHours()`: Calculates hours with rounding (nearest-15, nearest-5, or none)
  - `derivePeriodId()`: Generates period identifiers (weekly, biweekly, monthly)
- `functions/src/lib/contracts.ts`: Contract management
  - `getParentForOrg()`: Maps sub-organization to parent organization
  - `getContract()`: Retrieves billing contract details

### 2. Firestore Security Rules

**Location**: `firestore.rules`

Key security features:

- **Null-safe access**: All document reads check `exists()` before calling `get().data`
- **Parent admin claims**: Uses custom claims (`parentAdmin: true`, `parentId: string`) for access control
- **Attendance rules**:
  - Members can create pending attendance records for themselves
  - Admins can approve/reject attendance
- **Parent ledger rules**:
  - Read-only access for parent admins with matching `parentId` claim
  - No client writes (enforced server-side only via Admin SDK)
  - Contracts readable by parent admins, writable only by server

### 3. API Routes

**Location**: `src/app/api/parent/ledger/export/route.ts`

#### CSV Export Endpoint

- **Route**: `GET /api/parent/ledger/export?parentId=X&periodId=Y`
- **Authentication**: Requires Bearer token with `parentAdmin` claim matching `parentId`
- **Output**: CSV file with ledger lines (no PII, only staffRef IDs)
- **Fields**: parentId, subOrgId, staffRef, venueId, periodId, hours, billRate, amount, sourceAttendanceId, createdAt

### 4. Tests

**Location**: `src/test/firestore.parents.rules.test.ts`

Tests validate:

- Client writes to `parents/**` are denied
- Parent admins can read their ledgers
- Strangers cannot access parent ledgers
- Staff members can create pending attendance
- Admins can approve attendance

### 5. Emulator Seed Script

**Location**: `scripts/seed/seed.emulator.ts`

Seeds emulator with:

- Sample organization with parent relationship
- Admin user membership
- Contract with billing rate and rounding policy
- Parent admin user with custom claims

## Setup Instructions

### Prerequisites

- Node.js 20+
- pnpm package manager
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Install dependencies**:

   ```bash
   # Root project
   pnpm install

   # Functions
   cd functions
   npm install
   npm run build
   cd ..
   ```

2. **Configure Firebase**:
   - Update `.firebaserc` with your project ID
   - Set up Firebase Admin SDK credentials in `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable

### Running Tests

#### Rules Tests

```bash
# Start firestore emulator and run rules tests
pnpm run test:rules
```

This command:

1. Starts the Firestore emulator
2. Loads security rules from `firestore.rules`
3. Runs tests from `src/test/firestore.parents.rules.test.ts`
4. Shuts down the emulator

#### Seeding the Emulator

```bash
# Start emulators
firebase emulators:start --only auth,firestore,functions

# In another terminal, seed data
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
TS_NODE_TRANSPILE_ONLY=1 \
pnpm ts-node scripts/seed/seed.emulator.ts
```

### Development Workflow

1. **Start all emulators**:

   ```bash
   pnpm run dev:api
   ```

   This starts:
   - Auth emulator (port 9099)
   - Firestore emulator (port 8080)
   - Storage emulator (port 9199)
   - Functions emulator (port 5001)
   - Emulator UI (port 4000)

2. **Start web app**:

   ```bash
   pnpm run dev:web
   ```

3. **Run both concurrently**:
   ```bash
   pnpm run dev
   ```

## Usage

### Setting Custom Claims for Parent Admins

Parent admin users require custom claims to access ledger data:

```typescript
import { adminAuth } from "@/lib/firebase.server";

// Set claims for parent admin
await adminAuth().setCustomUserClaims(uid, {
  parentAdmin: true,
  parentId: "parent-1",
});
```

### Creating Contracts

Contracts must be created server-side using Admin SDK:

```typescript
import { adminDb } from "@/lib/firebase.server";

await adminDb()
  .collection("parents")
  .doc(parentId)
  .collection("contracts")
  .doc(subOrgId)
  .set({
    billRate: 22.5,
    rounding: "nearest-15", // or "nearest-5", "none"
    period: "biweekly", // or "weekly", "monthly"
  });
```

### Attendance Flow

1. **Staff clocks in**:

   ```typescript
   await db.collection(`orgs/${orgId}/attendance`).add({
     id: ulid(),
     tenantId: orgId,
     staffId: currentUserId,
     venueId: "venue-1",
     clockIn: Date.now(),
     status: "pending",
   });
   ```

2. **Admin approves**:

   ```typescript
   await db.doc(`orgs/${orgId}/attendance/${eventId}`).update({
     clockOut: Date.now(),
     status: "approved",
     approvedBy: adminUserId,
     approvedAt: Date.now(),
   });
   ```

3. **Cloud Function triggers**: Automatically creates ledger line in `parents/{parentId}/ledgers/{periodId}/lines/`

### Exporting Ledger Data

Parent admins can export billing data:

```typescript
const response = await fetch(
  `/api/parent/ledger/export?parentId=parent-1&periodId=2025-W40`,
  {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  },
);
const csv = await response.text();
```

## Data Contracts

### Attendance Event

```typescript
{
  id: string;
  tenantId: string;           // orgId
  staffId: string;            // User ID
  venueId: string;
  shiftId?: string;
  clockIn: number;            // timestamp
  clockOut?: number;          // timestamp
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: number;
}
```

### Parent Ledger Line

```typescript
{
  id: string;
  parentId: string;
  subOrgId: string;
  staffRef: string; // Staff user ID (no PII)
  venueId: string;
  periodId: string; // e.g., "2025-W40"
  hours: number;
  billRate: number;
  amount: number;
  sourceAttendanceId: string;
  createdAt: number;
}
```

### Contract

```typescript
{
  parentId: string;
  subOrgId: string;
  billRate: number;
  rounding: "nearest-15" | "nearest-5" | "none";
  period: "weekly" | "biweekly" | "monthly";
}
```

## Security Considerations

### PII Protection

- Parent ledgers contain only `staffRef` (user ID), not names or other PII
- If names needed for reports, resolve server-side with proper access controls
- Never expose PII to parent organizations without explicit consent

### Append-Only Ledgers

- Ledger lines are immutable once created
- Corrections done via reversal (negative amount) + new line
- Maintains complete audit trail

### Access Control

- Sub-organizations isolated via Firestore rules
- Parent access controlled via custom claims
- All mutations to parent ledgers are server-side only

## Deployment

### Deploy Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Deploy Rules

```bash
firebase deploy --only firestore:rules
```

### Deploy Everything

```bash
firebase deploy
```

## Troubleshooting

### Rules Tests Fail with "Null value error"

- Ensure all document reads check `exists()` before `get().data`
- Seed test data using `testEnv.withSecurityRulesDisabled()`

### Function Not Triggering

- Check function logs: `firebase functions:log`
- Verify trigger path matches: `orgs/{orgId}/attendance/{eventId}`
- Ensure contract exists for parent/sub-org relationship

### CSV Export Returns 403

- Verify user has custom claim: `parentAdmin: true`
- Check `parentId` claim matches requested `parentId` parameter
- Ensure ID token is valid and not expired

## Future Enhancements

- [ ] Dispute workflow for contested hours
- [ ] Batch period close and finalization
- [ ] Automated email reports to parent admins
- [ ] Mobile app for clock in/out with geofencing
- [ ] Rate limiting on attendance creation
- [ ] Archive old ledger data to Cloud Storage
