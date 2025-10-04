import { beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import type {
  RulesTestContext,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

declare global {
  // Provided by src/test/rules-setup.ts
  var testEnv: RulesTestEnvironment;
}

const ORG1_ID = "org-1";
const ORG2_ID = "org-2";
const CORP_ID = "corp-1";

describe("Firestore Multi-Tenant Security Rules", () => {
  let testEnv: RulesTestEnvironment;
  let org1AdminCtx: RulesTestContext;
  let org1MemberCtx: RulesTestContext;
  let _org2MemberCtx: RulesTestContext;
  let corpAdminCtx: RulesTestContext;
  let unauthCtx: RulesTestContext;

  beforeEach(async () => {
    testEnv = global.testEnv;
    await testEnv.clearFirestore();

    const now = new Date().toISOString();

    // Seed test data with security rules disabled
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      // Organization 1
      await db.doc(`orgs/${ORG1_ID}`).set({
        id: ORG1_ID,
        name: "Organization 1",
        ownerUid: "alice",
        createdBy: "alice",
        createdAt: now,
        updatedAt: now,
      });

      await db.doc(`orgs/${ORG1_ID}/staff/alice`).set({
        id: "alice",
        orgId: ORG1_ID,
        role: "admin",
        firstName: "Alice",
        lastName: "Admin",
        email: "alice@org1.com",
        createdAt: now,
        updatedAt: now,
      });

      await db.doc(`orgs/${ORG1_ID}/staff/bob`).set({
        id: "bob",
        orgId: ORG1_ID,
        role: "employee",
        firstName: "Bob",
        lastName: "Employee",
        email: "bob@org1.com",
        createdAt: now,
        updatedAt: now,
      });

      // Organization 2
      await db.doc(`orgs/${ORG2_ID}`).set({
        id: ORG2_ID,
        name: "Organization 2",
        ownerUid: "eve",
        createdBy: "eve",
        createdAt: now,
        updatedAt: now,
      });

      await db.doc(`orgs/${ORG2_ID}/staff/eve`).set({
        id: "eve",
        orgId: ORG2_ID,
        role: "admin",
        firstName: "Eve",
        lastName: "Admin",
        email: "eve@org2.com",
        createdAt: now,
        updatedAt: now,
      });

      // Corporate Account
      await db.doc(`corporate_accounts/${CORP_ID}`).set({
        id: CORP_ID,
        name: "Corporate Account 1",
        createdAt: now,
        updatedAt: now,
      });

      await db.doc(`corporate_accounts/${CORP_ID}/ledgers/2024-W12`).set({
        periodId: "2024-W12",
        parentId: CORP_ID,
        createdAt: Date.now(),
      });

      await db
        .doc(`corporate_accounts/${CORP_ID}/ledgers/2024-W12/lines/line1`)
        .set({
          id: "line1",
          parentId: CORP_ID,
          periodId: "2024-W12",
          subOrgId: ORG1_ID,
          staffRef: "alice",
          hoursWorked: 8,
          billRate: 25,
          amountBilled: 200,
          createdAt: Date.now(),
        });
    });

    // Create authenticated contexts
    org1AdminCtx = testEnv.authenticatedContext("alice", {
      orgId: ORG1_ID,
      orgIds: [ORG1_ID],
      orgRole: "admin",
    });

    org1MemberCtx = testEnv.authenticatedContext("bob", {
      orgId: ORG1_ID,
      orgIds: [ORG1_ID],
      orgRole: "employee",
    });

    _org2MemberCtx = testEnv.authenticatedContext("eve", {
      orgId: ORG2_ID,
      orgIds: [ORG2_ID],
      orgRole: "admin",
    });

    corpAdminCtx = testEnv.authenticatedContext("corporate-admin", {
      parentAdmin: true,
      parentId: CORP_ID,
    });

    unauthCtx = testEnv.unauthenticatedContext();
  });

  describe("Organization Isolation", () => {
    it("allows members to read their own organization", async () => {
      await assertSucceeds(
        org1MemberCtx.firestore().doc(`orgs/${ORG1_ID}`).get(),
      );
    });

    it("prevents members from reading other organizations", async () => {
      await assertFails(org1MemberCtx.firestore().doc(`orgs/${ORG2_ID}`).get());
    });

    it("allows members to read staff in their organization", async () => {
      await assertSucceeds(
        org1MemberCtx.firestore().doc(`orgs/${ORG1_ID}/staff/alice`).get(),
      );
    });

    it("prevents members from reading staff in other organizations", async () => {
      await assertFails(
        org1MemberCtx.firestore().doc(`orgs/${ORG2_ID}/staff/eve`).get(),
      );
    });
  });

  describe("Attendance Rules", () => {
    it("allows staff to create their own pending attendance", async () => {
      await assertSucceeds(
        org1MemberCtx.firestore().doc(`orgs/${ORG1_ID}/attendance/att1`).set({
          id: "att1",
          tenantId: ORG1_ID,
          staffId: "bob",
          clockIn: Date.now(),
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      );
    });

    it("prevents staff from creating attendance for others", async () => {
      await assertFails(
        org1MemberCtx.firestore().doc(`orgs/${ORG1_ID}/attendance/att2`).set({
          id: "att2",
          tenantId: ORG1_ID,
          staffId: "alice", // Bob trying to create for Alice
          clockIn: Date.now(),
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      );
    });

    it("allows admins to approve attendance", async () => {
      // First create pending attendance
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc(`orgs/${ORG1_ID}/attendance/att3`).set({
          id: "att3",
          tenantId: ORG1_ID,
          staffId: "bob",
          clockIn: Date.now(),
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Admin approves
      await assertSucceeds(
        org1AdminCtx.firestore().doc(`orgs/${ORG1_ID}/attendance/att3`).update({
          staffId: "bob",
          tenantId: ORG1_ID,
          status: "approved",
          approvedBy: "alice",
          approvedAt: Date.now(),
        }),
      );
    });

    it("prevents client-side deletion of attendance", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc(`orgs/${ORG1_ID}/attendance/att4`).set({
          id: "att4",
          tenantId: ORG1_ID,
          staffId: "bob",
          clockIn: Date.now(),
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await assertFails(
        org1AdminCtx
          .firestore()
          .doc(`orgs/${ORG1_ID}/attendance/att4`)
          .delete(),
      );
    });
  });

  describe("Corporate Account Ledger Access", () => {
    it("allows corporate admins to read their ledgers", async () => {
      await assertSucceeds(
        corpAdminCtx
          .firestore()
          .doc(`corporate_accounts/${CORP_ID}/ledgers/2024-W12`)
          .get(),
      );
    });

    it("allows corporate admins to read ledger lines", async () => {
      await assertSucceeds(
        corpAdminCtx
          .firestore()
          .doc(`corporate_accounts/${CORP_ID}/ledgers/2024-W12/lines/line1`)
          .get(),
      );
    });

    it("prevents org admins from reading corporate ledgers", async () => {
      await assertFails(
        org1AdminCtx
          .firestore()
          .doc(`corporate_accounts/${CORP_ID}/ledgers/2024-W12`)
          .get(),
      );
    });

    it("prevents any client from writing to ledgers", async () => {
      await assertFails(
        corpAdminCtx
          .firestore()
          .doc(`corporate_accounts/${CORP_ID}/ledgers/2024-W12/lines/line2`)
          .set({
            id: "line2",
            parentId: CORP_ID,
            periodId: "2024-W12",
            subOrgId: ORG1_ID,
            staffRef: "bob",
            hoursWorked: 4,
            billRate: 25,
            amountBilled: 100,
            createdAt: Date.now(),
          }),
      );
    });
  });

  describe("Location Hierarchy", () => {
    it("allows admins to create venues", async () => {
      await assertSucceeds(
        org1AdminCtx.firestore().doc(`orgs/${ORG1_ID}/venues/venue1`).set({
          id: "venue1",
          orgId: ORG1_ID,
          name: "Test Venue",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it("allows admins to create zones", async () => {
      await assertSucceeds(
        org1AdminCtx.firestore().doc(`orgs/${ORG1_ID}/zones/zone1`).set({
          id: "zone1",
          venueId: "venue1",
          orgId: ORG1_ID,
          name: "Test Zone",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it("allows admins to create positions", async () => {
      await assertSucceeds(
        org1AdminCtx.firestore().doc(`orgs/${ORG1_ID}/positions/pos1`).set({
          id: "pos1",
          zoneId: "zone1",
          venueId: "venue1",
          orgId: ORG1_ID,
          name: "Test Position",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it("prevents members from creating venues", async () => {
      await assertFails(
        org1MemberCtx.firestore().doc(`orgs/${ORG1_ID}/venues/venue2`).set({
          id: "venue2",
          orgId: ORG1_ID,
          name: "Unauthorized Venue",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });
  });

  describe("Unauthenticated Access", () => {
    it("prevents unauthenticated users from reading any data", async () => {
      await assertFails(unauthCtx.firestore().doc(`orgs/${ORG1_ID}`).get());
    });

    it("prevents unauthenticated users from writing any data", async () => {
      await assertFails(
        unauthCtx.firestore().doc(`orgs/${ORG1_ID}/staff/malicious`).set({
          id: "malicious",
          orgId: ORG1_ID,
          role: "admin",
          firstName: "Malicious",
          lastName: "User",
          email: "malicious@test.com",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });
  });
});
