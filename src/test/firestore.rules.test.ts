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

const ORG_ID = "org-1";

describe("Firestore security rules", () => {
  let testEnv: RulesTestEnvironment;
  let adminCtx: RulesTestContext;
  let memberCtx: RulesTestContext;
  let outsiderCtx: RulesTestContext;
  let unauthCtx: RulesTestContext;

  let orgSeed: {
    orgId: string;
    name: string;
    ownerUid: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
  };

  beforeEach(async () => {
    testEnv = global.testEnv;
    await testEnv.clearFirestore();

    const now = new Date().toISOString();

    orgSeed = {
      orgId: ORG_ID,
      name: "Test Organization",
      ownerUid: "alice",
      createdBy: "alice",
      createdAt: now,
      updatedAt: now,
      updatedBy: "alice",
    };

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await db.doc(`users/alice`).set({
        uid: "alice",
        orgId: ORG_ID,
        createdAt: now,
      });

      await db.doc(`users/bob`).set({
        uid: "bob",
        orgId: ORG_ID,
        createdAt: now,
      });

      await db.doc(`orgs/${ORG_ID}`).set(orgSeed);

      await db.doc(`orgs/${ORG_ID}/members/alice`).set({
        uid: "alice",
        orgId: ORG_ID,
        role: "admin",
        addedBy: "alice",
        createdAt: now,
      });

      await db.doc(`orgs/${ORG_ID}/members/bob`).set({
        uid: "bob",
        orgId: ORG_ID,
        role: "member",
        addedBy: "alice",
        createdAt: now,
      });
    });

    adminCtx = testEnv.authenticatedContext("alice", {
      orgId: ORG_ID,
      orgIds: [ORG_ID],
      orgRole: "admin",
      orgRoles: { [ORG_ID]: "admin" },
      admin: true,
    });

    memberCtx = testEnv.authenticatedContext("bob", {
      orgId: ORG_ID,
      orgIds: [ORG_ID],
      orgRole: "employee",
      orgRoles: { [ORG_ID]: "employee" },
      admin: false,
    });

    outsiderCtx = testEnv.authenticatedContext("eve", {
      orgId: "org-2",
      orgIds: ["org-2"],
      orgRole: "employee",
      orgRoles: { "org-2": "employee" },
      admin: false,
    });

    unauthCtx = testEnv.unauthenticatedContext();
  });

  describe("organization documents", () => {
    it("allows members to read their organization", async () => {
      await assertSucceeds(memberCtx.firestore().doc(`orgs/${ORG_ID}`).get());
    });

    it("denies access to non-members", async () => {
      await assertFails(outsiderCtx.firestore().doc(`orgs/${ORG_ID}`).get());
    });

    it("allows admins to update when claim matches user doc", async () => {
      await assertSucceeds(
        adminCtx.firestore().doc(`orgs/${ORG_ID}`).update({
          orgId: orgSeed.orgId,
          name: "Updated Organization",
          updatedAt: new Date().toISOString(),
        }),
      );
    });

    it("denies admins when user document orgId mismatches claim", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`users/alice`).update({ orgId: "org-2" });
      });

      await assertFails(
        adminCtx.firestore().doc(`orgs/${ORG_ID}`).update({
          orgId: orgSeed.orgId,
          name: "Should fail",
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  });

  describe("organization members", () => {
    it("allows admins to add members", async () => {
      await assertSucceeds(
        adminCtx.firestore().doc(`orgs/${ORG_ID}/members/charlie`).set({
          uid: "charlie",
          orgId: ORG_ID,
          role: "member",
          addedBy: "alice",
          createdAt: new Date().toISOString(),
        }),
      );
    });

    it("blocks non-admins from adding members", async () => {
      await assertFails(
        memberCtx.firestore().doc(`orgs/${ORG_ID}/members/charlie`).set({
          uid: "charlie",
          orgId: ORG_ID,
          role: "member",
          addedBy: "bob",
          createdAt: new Date().toISOString(),
        }),
      );
    });

    it("allows members to read their membership", async () => {
      await assertSucceeds(
        memberCtx.firestore().doc(`orgs/${ORG_ID}/members/bob`).get(),
      );
    });
  });

  describe("unauthenticated users", () => {
    it("cannot access org documents", async () => {
      await assertFails(unauthCtx.firestore().doc(`orgs/${ORG_ID}`).get());
    });
  });
});
