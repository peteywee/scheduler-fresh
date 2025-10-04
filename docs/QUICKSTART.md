# Quickstart Guide - Multi-Tenant Staff Scheduler

## Quick Stats

- **Total Lines of Code**: 363 (TypeScript/JavaScript)
- **Configuration Lines**: 270 (Rules, JSON configs)
- **Documentation Lines**: 606 (Markdown guides)
- **New Files Created**: 16
- **Modified Files**: 6

## Files Created

### Cloud Functions (`functions/`)

```
functions/
├── .gitignore                          # Ignore compiled lib/ and node_modules/
├── package.json                        # Dependencies (firebase-admin, firebase-functions, date-fns, zod)
├── tsconfig.json                       # TypeScript config (CommonJS, ES2020)
├── src/
│   ├── index.ts                        # Main entry point (14 lines)
│   ├── replicateAttendance.ts          # Core replication logic (75 lines)
│   └── lib/
│       ├── contracts.ts                # Contract & parent mapping (35 lines)
│       └── time.ts                     # Time calculations & rounding (39 lines)
```

### API Routes (`src/app/api/`)

```
src/app/api/parent/ledger/export/
└── route.ts                            # CSV export endpoint (65 lines)
```

### Tests (`src/test/`)

```
src/test/
└── firestore.parents.rules.test.ts     # Rules tests (96 lines)
```

### Scripts (`scripts/`)

```
scripts/seed/
└── seed.emulator.ts                    # Emulator seed script (39 lines)
```

### Documentation

```
IMPLEMENTATION.md                       # Detailed implementation guide (384 lines)
DELIVERY_SUMMARY.md                     # What was delivered (222 lines)
```

## Files Modified

### Security Rules

- `firestore.rules` - Added 62 lines for parent ledgers, attendance, and custom claims

### Configuration

- `firebase.json` - Added functions configuration and port 5001 for functions emulator
- `eslint.config.js` - Added functions/lib to ignore list

### Package Management

- `package.json` - Added ts-node dev dependency
- `pnpm-lock.yaml` - Updated lockfile

### Documentation

- `README.md` - Added link to IMPLEMENTATION.md

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  (Staff clock in/out, Admin approvals, Parent CSV export)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Auth                             │
│  (Custom claims: parentAdmin, parentId)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│   Firestore      │        │  API Routes      │
│   (Rules)        │        │  (Next.js)       │
│                  │        │                  │
│  orgs/{orgId}/   │        │  /api/parent/    │
│    attendance/   │◄───────┤  ledger/export   │
│    members/      │        │                  │
│                  │        └──────────────────┘
│  parents/{id}/   │
│    contracts/    │
│    ledgers/      │
│                  │
└────────┬─────────┘
         │
         │ (triggers)
         ▼
┌──────────────────┐
│ Cloud Functions  │
│                  │
│ onAttendanceWrite│
│                  │
│  ├─ contracts.ts │
│  ├─ time.ts      │
│  └─ replicate... │
└──────────────────┘
```

## Data Flow: Attendance → Ledger

```
1. Staff creates pending attendance
   └─> orgs/{orgId}/attendance/{eventId} { status: "pending" }

2. Admin approves
   └─> Update { status: "approved", clockOut, approvedBy, approvedAt }

3. Cloud Function triggers (onAttendanceWrite)
   ├─> Load parent ID from org doc
   ├─> Load contract (billRate, rounding, period)
   ├─> Calculate hours with rounding
   ├─> Derive period ID (weekly/biweekly/monthly)
   └─> Create ledger line in parents/{parentId}/ledgers/{periodId}/lines/

4. Parent admin exports
   └─> GET /api/parent/ledger/export?parentId=X&periodId=Y
       └─> Returns CSV with billing data
```

## Security Model

### Firestore Rules

```
✅ Sub-orgs: Members can read own org data only
✅ Attendance: Staff create pending, admins approve
✅ Parents: Only parent admins with matching claim can read
❌ Client writes to parents/** blocked (server-only)
❌ Cross-tenant reads blocked
```

### Custom Claims

```typescript
{
  parentAdmin: true,
  parentId: "parent-1"
}
```

### API Authentication

```
Authorization: Bearer <Firebase ID Token>
Must have: parentAdmin === true && parentId === <requested parentId>
```

## Key Features

### ✅ Multi-Tenant Isolation

- Sub-organizations cannot access each other's data
- Parent organizations see only aggregated billing data
- No PII (personally identifiable information) in parent views

### ✅ Append-Only Ledgers

- Ledger lines are immutable once created
- Corrections via reversal entries (negative amounts)
- Complete audit trail for billing disputes

### ✅ Flexible Billing

- Rounding policies: nearest-15, nearest-5, none
- Period types: weekly, biweekly, monthly
- Configurable billing rates per contract

### ✅ Type Safety

- All code written in TypeScript
- Zod schemas for runtime validation (in contract types)
- Strict mode enabled throughout

### ✅ Testing

- Firestore rules unit tests
- Emulator support for local development
- Seed script for test data

## Commands Reference

### Development

```bash
# Install dependencies
pnpm install
cd functions && npm install && cd ..

# Start all emulators
pnpm run dev:api

# Start web app
pnpm run dev:web

# Both together
pnpm run dev
```

### Testing

```bash
# Run rules tests
pnpm run test:rules

# Seed emulator
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
pnpm ts-node scripts/seed/seed.emulator.ts
```

### Building

```bash
# Build functions
cd functions && npm run build

# Typecheck web
pnpm run typecheck

# Lint
pnpm run lint
```

### Deployment

```bash
# Deploy functions
firebase deploy --only functions

# Deploy rules
firebase deploy --only firestore:rules

# Deploy everything
firebase deploy
```

## Next Steps

1. **Test with Emulators**:

   ```bash
   firebase emulators:start --only auth,firestore,functions
   ```

2. **Create First Parent Organization**:

   ```typescript
   await adminDb().collection("parents").doc("parent-1").set({
     name: "Parent Org",
     createdAt: Date.now(),
   });
   ```

3. **Create Contract**:

   ```typescript
   await adminDb()
     .collection("parents")
     .doc("parent-1")
     .collection("contracts")
     .doc("org-1")
     .set({
       billRate: 25.0,
       rounding: "nearest-15",
       period: "biweekly",
     });
   ```

4. **Set Parent Admin Claims**:

   ```typescript
   await adminAuth().setCustomUserClaims(uid, {
     parentAdmin: true,
     parentId: "parent-1",
   });
   ```

5. **Test Full Flow**:
   - Staff clocks in/out
   - Admin approves attendance
   - Verify ledger line created
   - Export CSV as parent admin

## Support

- **Implementation Details**: See [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Delivery Summary**: See `DELIVERY_SUMMARY.md`
- **Project README**: See `README.md`
- **Copilot Instructions**: See `.github/copilot-instructions.md`

---

**Status**: ✅ Complete and production-ready
**Date**: 2025-10-03
**Total Implementation Time**: ~2 hours
**Code Quality**: TypeScript strict mode, zero lint warnings
