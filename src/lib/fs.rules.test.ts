import { describe, it, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";

// Comprehensive Firestore rules tests for attendance nested under
// orgs/{orgId}/parents/{parentId}/attendance/{docId}
// According to firestore.rules:
// - Parent (authenticated user whose uid == parentId) may create a pending attendance doc
//   with ONLY keys: status,date,hours,createdAt,updatedAt and status must be 'pending'.
// - Admin (member with role owner|admin) may update status (and updatedAt) from pending -> approved|rejected.
// - Deletes are always denied client-side.
// - Non-admins cannot update status.

// Only run when Firestore emulator host is present (rules test mode)
const EMULATOR_ACTIVE = !!process.env.FIRESTORE_EMULATOR_HOST;

const suite = EMULATOR_ACTIVE ? describe : describe.skip;

suite("Firestore Security Rules: attendance (org parent scoped)", () => {
  let testEnv: RulesTestEnvironment | undefined;

  const ORG_ID = "org-att";
  const PARENT_ID = "parent-1"; // parent user id
  const ADMIN_UID = "alice";
  const MEMBER_UID = "bob";

  beforeAll(async () => {
    if (!EMULATOR_ACTIVE) return; // safety
    testEnv = await initializeTestEnvironment({
      projectId: "demo-scheduler-fresh",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });

    // Seed required membership docs under security disabled context
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = new Date().toISOString();
      await db.doc(`orgs/${ORG_ID}`).set({ orgId: ORG_ID, name: "Attendance Test", createdAt: now, updatedAt: now });
      await db.doc(`orgs/${ORG_ID}/members/${ADMIN_UID}`).set({ uid: ADMIN_UID, orgId: ORG_ID, role: "admin", createdAt: now });
      await db.doc(`orgs/${ORG_ID}/members/${MEMBER_UID}`).set({ uid: MEMBER_UID, orgId: ORG_ID, role: "member", createdAt: now });
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it("parent can create pending attendance with allowed keys only", async () => {
  const parentCtx = testEnv!.authenticatedContext(PARENT_ID, { orgId: ORG_ID });
    const db = parentCtx.firestore();
    const ref = db.doc(`orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att1`);
    const now = new Date().toISOString();
    await assertSucceeds(
      ref.set({ status: "pending", date: now.slice(0, 10), hours: 5, createdAt: now, updatedAt: now }),
    );
  });

  it("parent cannot create attendance with extra disallowed field", async () => {
  const parentCtx = testEnv!.authenticatedContext(PARENT_ID, { orgId: ORG_ID });
    const db = parentCtx.firestore();
    const ref = db.doc(`orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att-extra`);
    const now = new Date().toISOString();
    await assertFails(
      ref.set({ status: "pending", date: now.slice(0, 10), hours: 4, createdAt: now, updatedAt: now, note: "oops" }),
    );
  });

  it("parent cannot create attendance with non-pending status", async () => {
  const parentCtx = testEnv!.authenticatedContext(PARENT_ID, { orgId: ORG_ID });
    const db = parentCtx.firestore();
    const ref = db.doc(`orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att-badstatus`);
    const now = new Date().toISOString();
    await assertFails(
      ref.set({ status: "approved", date: now.slice(0, 10), hours: 3, createdAt: now, updatedAt: now }),
    );
  });

  it("admin can transition status pending -> approved with only status & updatedAt changed", async () => {
  const parentCtx = testEnv!.authenticatedContext(PARENT_ID, { orgId: ORG_ID });
  const adminCtx = testEnv!.authenticatedContext(ADMIN_UID, { orgId: ORG_ID, admin: true });
    const parentDb = parentCtx.firestore();
    const adminDb = adminCtx.firestore();
    const now = new Date().toISOString();
    const refPath = `orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att2`;
    await parentDb.doc(refPath).set({ status: "pending", date: now.slice(0, 10), hours: 2, createdAt: now, updatedAt: now });
    await assertSucceeds(
      adminDb.doc(refPath).update({ status: "approved", updatedAt: new Date().toISOString() }),
    );
  });

  it("member (non-admin) cannot approve attendance", async () => {
  const parentCtx = testEnv!.authenticatedContext(PARENT_ID, { orgId: ORG_ID });
  const memberCtx = testEnv!.authenticatedContext(MEMBER_UID, { orgId: ORG_ID });
    const parentDb = parentCtx.firestore();
    const memberDb = memberCtx.firestore();
    const now = new Date().toISOString();
    const refPath = `orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att3`;
    await parentDb.doc(refPath).set({ status: "pending", date: now.slice(0, 10), hours: 1.5, createdAt: now, updatedAt: now });
    await assertFails(
      memberDb.doc(refPath).update({ status: "approved", updatedAt: new Date().toISOString() }),
    );
  });

  it("parent cannot delete attendance entry", async () => {
  const parentCtx = testEnv!.authenticatedContext(PARENT_ID, { orgId: ORG_ID });
    const db = parentCtx.firestore();
    const now = new Date().toISOString();
    const refPath = `orgs/${ORG_ID}/parents/${PARENT_ID}/attendance/att4`;
    await db.doc(refPath).set({ status: "pending", date: now.slice(0, 10), hours: 1, createdAt: now, updatedAt: now });
    await assertFails(db.doc(refPath).delete());
  });
});
