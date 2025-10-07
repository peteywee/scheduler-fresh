import { beforeAll, beforeEach, describe, it } from 'vitest';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Get global testEnv or lazily create one (idempotent safety for isolated run)
let localEnv: RulesTestEnvironment | undefined;
const getEnv = async (): Promise<RulesTestEnvironment> => {
  if ((globalThis as any).testEnv) return (globalThis as any).testEnv as RulesTestEnvironment;
  if (localEnv) return localEnv;
  const rulesPath = resolve(__dirname, '../../firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');
  localEnv = await initializeTestEnvironment({
    projectId: 'demo-fs-rules-attendance',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
  (globalThis as any).testEnv = localEnv;
  return localEnv;
};

describe('Firestore Security Rules: attendance (org parent scoped)', () => {
  const ORG_ID = 'org-att';
  const PARENT_ID = 'parent-1'; // parent user id
  const ADMIN_UID = 'alice';
  const MEMBER_UID = 'bob';

  beforeAll(async () => {
    await getEnv();
  });

  beforeEach(async () => {
    const env = await getEnv();
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = new Date().toISOString();
      await db.doc(`orgs/${ORG_ID}`).set({
        orgId: ORG_ID,
        name: 'Attendance Test',
        createdAt: now,
        updatedAt: now,
      });
      await db
        .doc(`orgs/${ORG_ID}/members/${ADMIN_UID}`)
        .set({ uid: ADMIN_UID, orgId: ORG_ID, role: 'admin', createdAt: now });
      await db.doc(`orgs/${ORG_ID}/members/${MEMBER_UID}`).set({
        uid: MEMBER_UID,
        orgId: ORG_ID,
        role: 'member',
        createdAt: now,
      });
    });
  });

  it('parent can create pending attendance with allowed keys only', async () => {
    const testEnv = await getEnv();
    const parentCtx = testEnv.authenticatedContext(PARENT_ID, {
      orgId: ORG_ID,
    });
    const db = parentCtx.firestore();
    const ref = db.doc(`orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att1`);
    const now = new Date().toISOString();
    await assertSucceeds(
      ref.set({
        status: 'pending',
        date: now.slice(0, 10),
        hours: 5,
        createdAt: now,
        updatedAt: now,
      }),
    );
  });

  it('parent cannot create attendance with extra disallowed field', async () => {
    const testEnv = await getEnv();
    const parentCtx = testEnv.authenticatedContext(PARENT_ID, {
      orgId: ORG_ID,
    });
    const db = parentCtx.firestore();
    const ref = db.doc(`orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att-extra`);
    const now = new Date().toISOString();
    await assertFails(
      ref.set({
        status: 'pending',
        date: now.slice(0, 10),
        hours: 4,
        createdAt: now,
        updatedAt: now,
        note: 'oops',
      }),
    );
  });

  it('parent cannot create attendance with non-pending status', async () => {
    const testEnv = await getEnv();
    const parentCtx = testEnv.authenticatedContext(PARENT_ID, {
      orgId: ORG_ID,
    });
    const db = parentCtx.firestore();
    const ref = db.doc(`orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att-badstatus`);
    const now = new Date().toISOString();
    await assertFails(
      ref.set({
        status: 'approved',
        date: now.slice(0, 10),
        hours: 3,
        createdAt: now,
        updatedAt: now,
      }),
    );
  });

  it('admin can transition status pending -> approved with only status & updatedAt changed', async () => {
    const testEnv = await getEnv();
    const parentCtx = testEnv.authenticatedContext(PARENT_ID, {
      orgId: ORG_ID,
    });
    const adminCtx = testEnv.authenticatedContext(ADMIN_UID, {
      orgId: ORG_ID,
      admin: true,
    });
    const parentDb = parentCtx.firestore();
    const adminDb = adminCtx.firestore();
    const now = new Date().toISOString();
    const refPath = `orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att2`;
    await parentDb.doc(refPath).set({
      status: 'pending',
      date: now.slice(0, 10),
      hours: 2,
      createdAt: now,
      updatedAt: now,
    });
    await assertSucceeds(
      adminDb.doc(refPath).update({ status: 'approved', updatedAt: new Date().toISOString() }),
    );
  });

  it('member (non-admin) cannot approve attendance', async () => {
    const testEnv = await getEnv();
    const parentCtx = testEnv.authenticatedContext(PARENT_ID, {
      orgId: ORG_ID,
    });
    const memberCtx = testEnv.authenticatedContext(MEMBER_UID, {
      orgId: ORG_ID,
    });
    const parentDb = parentCtx.firestore();
    const memberDb = memberCtx.firestore();
    const now = new Date().toISOString();
    const refPath = `orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att3`;
    await parentDb.doc(refPath).set({
      status: 'pending',
      date: now.slice(0, 10),
      hours: 1.5,
      createdAt: now,
      updatedAt: now,
    });
    await assertFails(
      memberDb.doc(refPath).update({ status: 'approved', updatedAt: new Date().toISOString() }),
    );
  });

  it('parent cannot delete attendance entry', async () => {
    const testEnv = await getEnv();
    const parentCtx = testEnv.authenticatedContext(PARENT_ID, {
      orgId: ORG_ID,
    });
    const db = parentCtx.firestore();
    const now = new Date().toISOString();
    const refPath = `orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att4`;
    await db.doc(refPath).set({
      status: 'pending',
      date: now.slice(0, 10),
      hours: 1,
      createdAt: now,
      updatedAt: now,
    });
    await assertFails(db.doc(refPath).delete());
  });
});
