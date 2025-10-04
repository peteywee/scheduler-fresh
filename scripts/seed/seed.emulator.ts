// Run with: TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/seed/seed.emulator.ts
import * as admin from "firebase-admin";

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      "Set FIRESTORE_EMULATOR_HOST (and AUTH) to seed the emulator.",
    );
    process.exit(1);
  }
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  const auth = admin.auth();

  const parentId = "parent-1";
  const orgId = "org-1";
  const adminUid = "admin-uid";
  const parentAdminUid = "padmin-uid";

  await db.doc(`orgs/${orgId}`).set({ orgId, name: "Org1", parentId });
  await db
    .doc(`orgs/${orgId}/members/${adminUid}`)
    .set({ uid: adminUid, orgId, role: "admin", createdAt: Date.now() });

  await db.doc(`parents/${parentId}/contracts/${orgId}`).set({
    billRate: 22.5,
    rounding: "nearest-15",
    period: "biweekly",
  });

  // Create parent admin user in emulator and set claims
  try {
    await auth.createUser({ uid: parentAdminUid, email: "padmin@example.com" });
  } catch {
    // User may already exist - ignore error
  }
  await auth.setCustomUserClaims(parentAdminUid, {
    parentAdmin: true,
    parentId,
  });

  console.log("Seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
