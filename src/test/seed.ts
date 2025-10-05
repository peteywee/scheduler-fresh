import { RulesTestEnvironment } from "@firebase/rules-unit-testing";

export interface SeedOrgMembersOptions {
  orgId: string;
  adminUid: string; // primary admin
  memberUids?: string[]; // additional member (non-admin) user ids
  includeUserDocs?: boolean; // default true
  roles?: Record<string, string>; // optional explicit role mapping per uid
  orgData?: Record<string, any>; // additional org fields
}

export interface SeedResult {
  now: string;
  orgPath: string;
  adminUid: string;
  memberUids: string[];
}

/**
 * Seeds an organization document plus user + membership documents using a security-rules-disabled context.
 * Returns timestamp and basic metadata. Idempotent (overwrites existing docs) for convenience inside beforeEach.
 */
export async function seedOrgWithMembers(
  env: RulesTestEnvironment,
  opts: SeedOrgMembersOptions,
): Promise<SeedResult> {
  const {
    orgId,
    adminUid,
    memberUids = [],
    includeUserDocs = true,
    roles = {},
    orgData = {},
  } = opts;

  const now = new Date().toISOString();

  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await db.doc(`orgs/${orgId}`).set({
      orgId,
      name: orgData.name || `Org ${orgId}`,
      ownerUid: adminUid,
      createdBy: adminUid,
      createdAt: now,
      updatedAt: now,
      updatedBy: adminUid,
      ...orgData,
    });

    const allMembers = [adminUid, ...memberUids];
    for (const uid of allMembers) {
      const role = roles[uid] || (uid === adminUid ? "admin" : "member");

      if (includeUserDocs) {
        await db.doc(`users/${uid}`).set({ uid, orgId, createdAt: now });
      }

      await db.doc(`orgs/${orgId}/members/${uid}`).set({
        uid,
        orgId,
        role,
        addedBy: adminUid,
        createdAt: now,
      });
    }
  });

  return { now, orgPath: `orgs/${orgId}`, adminUid, memberUids };
}
