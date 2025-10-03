import { initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { describe, it, beforeAll, afterAll } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-test-project",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Parents ledger & attendance rules", () => {
  const parentId = "parent-1";
  const orgId = "org-1";
  const adminUid = "admin-uid";
  const staffUid = "staff-uid";

  it("denies client writes under parents/**", async () => {
    const ctx = testEnv.authenticatedContext("anyone");
    const db = ctx.firestore();
    await assertFails(
      db.doc(`parents/${parentId}/ledgers/2025-W40/lines/x`).set({ hello: "world" })
    );
  });

  it("allows parent admin to read their ledger; denies others", async () => {
    // Seed a ledger line with admin bypass
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adb = context.firestore();
      await adb.doc(`parents/${parentId}/ledgers/2025-W40/lines/line-1`).set({
        parentId, subOrgId: orgId, staffRef: staffUid, venueId: "v1",
        periodId: "2025-W40", hours: 4, billRate: 20, amount: 80,
        sourceAttendanceId: "att-1", createdAt: Date.now(),
      });
    });

    const parentCtx = testEnv.authenticatedContext("padmin", {
      parentAdmin: true,
      parentId,
    } as any);
    const parentDb = parentCtx.firestore();
    await assertSucceeds(
      parentDb.collection(`parents/${parentId}/ledgers/2025-W40/lines`).get()
    );

    const strangerCtx = testEnv.authenticatedContext("stranger");
    const strangerDb = strangerCtx.firestore();
    await assertFails(
      strangerDb.collection(`parents/${parentId}/ledgers/2025-W40/lines`).get()
    );
  });

  it("attendance: member can create pending for self; admin updates/approves", async () => {
    // Seed org and membership
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adb = context.firestore();
      await adb.doc(`orgs/${orgId}`).set({ orgId, name: "Org1", parentId });
      await adb.doc(`orgs/${orgId}/members/${adminUid}`).set({ uid: adminUid, orgId, role: "admin", createdAt: Date.now() });
      await adb.doc(`orgs/${orgId}/members/${staffUid}`).set({ uid: staffUid, orgId, role: "member", createdAt: Date.now() });
    });

    // staff creates pending
    const staffCtx = testEnv.authenticatedContext(staffUid);
    const sdb = staffCtx.firestore();
    await assertSucceeds(
      sdb.doc(`orgs/${orgId}/attendance/att-1`).set({
        id: "att-1",
        tenantId: orgId,
        staffId: staffUid,
        venueId: "v1",
        clockIn: Date.now() - 60*60*1000,
        status: "pending",
      })
    );

    // admin approves
    const adminCtx = testEnv.authenticatedContext(adminUid);
    const adb = adminCtx.firestore();
    await assertSucceeds(
      adb.doc(`orgs/${orgId}/attendance/att-1`).update({
        clockOut: Date.now(),
        status: "approved",
        approvedBy: adminUid,
        approvedAt: Date.now(),
      })
    );
  });
});
