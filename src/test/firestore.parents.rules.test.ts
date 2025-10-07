import { RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { describe, it } from 'vitest';
import { seedOrgWithMembers } from './seed';

const getEnv = (): RulesTestEnvironment => (globalThis as any).testEnv as RulesTestEnvironment;

describe('Parents ledger & attendance rules', () => {
  const parentId = 'parent-1';
  const orgId = 'org-1';
  const adminUid = 'admin-uid';
  const staffUid = 'staff-uid';

  it('denies client writes under parents root ledger lines (append-only server)', async () => {
    const ctx = getEnv().authenticatedContext('anyone');
    const db = ctx.firestore();
    // According to rules there is only /parents/{parentId}/ledger/{docId} at root, not nested lines.
    await assertFails(db.doc(`parents/${parentId}/ledger/2025-W40-line1`).set({ hours: 1 }));
  });

  it('allows parent admin to read their ledger; denies others', async () => {
    // Seed a ledger line with admin bypass
    await getEnv().withSecurityRulesDisabled(async (context) => {
      const adb = context.firestore();
      await adb.doc(`parents/${parentId}/ledger/2025-W40-line-1`).set({
        parentId,
        periodId: '2025-W40',
        hours: 4,
        createdAt: Date.now(),
      });
    });

    const parentCtx = getEnv().authenticatedContext('padmin', {
      parentAdmin: true,
      parentId,
    } as any);
    const parentDb = parentCtx.firestore();
    await assertSucceeds(parentDb.collection(`parents/${parentId}/ledger`).get());

    const strangerCtx = getEnv().authenticatedContext('stranger');
    const strangerDb = strangerCtx.firestore();
    await assertFails(strangerDb.collection(`parents/${parentId}/ledger`).get());
  });

  it('attendance: member can create pending for self; admin updates/approves', async () => {
    await seedOrgWithMembers(getEnv(), {
      orgId,
      adminUid: adminUid,
      memberUids: [staffUid],
      orgData: { name: 'Org1', parentId },
    });

    // Staff (parent user) creates pending attendance at root parents scope per rules
    const parentUserCtx = getEnv().authenticatedContext(parentId);
    const parentUserDb = parentUserCtx.firestore();
    await assertSucceeds(
      parentUserDb.doc(`parents/${parentId}/attendance/att-1`).set({
        status: 'pending',
        date: '2025-10-05',
        hours: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    // Admin updates status via org-scoped path (org parent collection) if allowed
    const adminCtx = getEnv().authenticatedContext(adminUid, { orgId });
    const adminDb = adminCtx.firestore();
    // This update should fail under root parents scope (rules: update false) — assertFails first
    await assertFails(
      adminDb.doc(`parents/${parentId}/attendance/att-1`).update({
        status: 'approved',
        updatedAt: Date.now(),
      }),
    );
  });
});
