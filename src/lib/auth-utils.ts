import { adminAuth } from "@/lib/firebase.server";
import { CustomClaims, Organization } from "@/lib/types";
import { getFirestore } from "firebase-admin/firestore";
import { randomBytes } from "crypto";

// Lazy initialize Firestore to avoid build-time errors
let db: FirebaseFirestore.Firestore | null = null;

function getFirestore_() {
  if (!db) {
    db = getFirestore();
  }
  return db;
}

/**
 * Set custom claims for a user to support multi-org authentication
 */
export async function setUserCustomClaims(
  uid: string,
  claims: CustomClaims,
): Promise<void> {
  await adminAuth().setCustomUserClaims(uid, claims);
}

/**
 * Get user's current custom claims
 */
export async function getUserCustomClaims(uid: string): Promise<CustomClaims> {
  const user = await adminAuth().getUser(uid);
  return (user.customClaims as CustomClaims) || {};
}

/**
 * Add user to organization and update custom claims
 */
export async function addUserToOrg(
  uid: string,
  orgId: string,
  role: "admin" | "manager" | "employee",
  addedBy: string,
): Promise<void> {
  const batch = getFirestore_().batch();
  const now = new Date();

  // Add member document
  const memberRef = getFirestore_().doc(`orgs/${orgId}/members/${uid}`);
  batch.set(memberRef, {
    uid,
    orgId,
    role,
    joinedAt: now,
    addedBy,
  });

  // Update user's custom claims
  const currentClaims = await getUserCustomClaims(uid);
  const orgIds = currentClaims.orgIds || [];
  const orgRoles = currentClaims.orgRoles || {};

  const newClaims: CustomClaims = {
    ...currentClaims,
    orgIds: [...new Set([...orgIds, orgId])], // Add orgId if not present
    orgRoles: {
      ...orgRoles,
      [orgId]: role,
    },
  };

  // If this is the user's first org, make it primary
  if (!currentClaims.orgId) {
    newClaims.orgId = orgId;
    newClaims.orgRole = role;
    newClaims.admin = role === "admin";
  }

  await batch.commit();
  await setUserCustomClaims(uid, newClaims);

  // Update user document with primary org if needed
  const userRef = getFirestore_().doc(`users/${uid}`);
  const userDoc = await userRef.get();
  if (userDoc.exists && !userDoc.data()?.primaryOrgId) {
    await userRef.update({
      primaryOrgId: orgId,
      updatedAt: now,
    });
  }
}

/**
 * Remove user from organization and update custom claims
 */
export async function removeUserFromOrg(
  uid: string,
  orgId: string,
): Promise<void> {
  const batch = getFirestore_().batch();

  // Remove member document
  const memberRef = getFirestore_().doc(`orgs/${orgId}/members/${uid}`);
  batch.delete(memberRef);

  // Update user's custom claims
  const currentClaims = await getUserCustomClaims(uid);
  const orgIds = (currentClaims.orgIds || []).filter((id) => id !== orgId);
  const orgRoles = { ...currentClaims.orgRoles };
  delete orgRoles[orgId];

  const newClaims: CustomClaims = {
    ...currentClaims,
    orgIds,
    orgRoles,
  };

  // If this was the primary org, update to another org or clear
  if (currentClaims.orgId === orgId) {
    if (orgIds.length > 0) {
      const newPrimaryOrg = orgIds[0];
      newClaims.orgId = newPrimaryOrg;
      newClaims.orgRole = orgRoles[newPrimaryOrg];
      newClaims.admin = orgRoles[newPrimaryOrg] === "admin";
    } else {
      newClaims.orgId = undefined;
      newClaims.orgRole = undefined;
      newClaims.admin = false;
    }
  }

  await batch.commit();
  await setUserCustomClaims(uid, newClaims);

  // Update user document
  const userRef = getFirestore_().doc(`users/${uid}`);
  await userRef.update({
    primaryOrgId: newClaims.orgId || null,
    updatedAt: new Date(),
  });
}

/**
 * Switch user's primary organization
 */
export async function switchUserPrimaryOrg(
  uid: string,
  orgId: string,
): Promise<void> {
  const currentClaims = await getUserCustomClaims(uid);

  // Verify user belongs to the org
  if (!currentClaims.orgIds?.includes(orgId)) {
    throw new Error("User is not a member of the specified organization");
  }

  const role = currentClaims.orgRoles?.[orgId];
  if (!role) {
    throw new Error("User role not found for organization");
  }

  const newClaims: CustomClaims = {
    ...currentClaims,
    orgId,
    orgRole: role,
    admin: role === "admin",
  };

  await setUserCustomClaims(uid, newClaims);

  // Update user document
  const userRef = getFirestore_().doc(`users/${uid}`);
  await userRef.update({
    primaryOrgId: orgId,
    updatedAt: new Date(),
  });
}

/**
 * Get organizations user belongs to
 */
export async function getUserOrganizations(
  uid: string,
): Promise<Organization[]> {
  const claims = await getUserCustomClaims(uid);
  const orgIds = claims.orgIds || [];

  if (orgIds.length === 0) return [];

  const orgPromises = orgIds.map((orgId) =>
    getFirestore_().doc(`orgs/${orgId}`).get(),
  );

  const orgDocs = await Promise.all(orgPromises);

  return orgDocs
    .filter((doc) => doc.exists)
    .map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Organization,
    );
}

/**
 * Check if user is admin of an organization
 */
export async function isUserOrgAdmin(
  uid: string,
  orgId: string,
): Promise<boolean> {
  const claims = await getUserCustomClaims(uid);
  return claims.orgRoles?.[orgId] === "admin" || claims.admin === true;
}

/**
 * Get user's role in an organization
 */
export async function getUserOrgRole(
  uid: string,
  orgId: string,
): Promise<string | null> {
  const claims = await getUserCustomClaims(uid);
  return claims.orgRoles?.[orgId] || null;
}

/**
 * Create a new organization and make user the owner
 */
export async function createOrganization(
  orgData: Omit<Organization, "id" | "createdAt" | "updatedAt">,
  ownerUid: string,
): Promise<string> {
  const orgRef = getFirestore_().collection("orgs").doc();
  const orgId = orgRef.id;
  const now = new Date();

  const organization: Organization = {
    ...orgData,
    id: orgId,
    ownerUid,
    createdAt: now,
    updatedAt: now,
  };

  // Create organization
  await orgRef.set(organization);

  // Add owner as admin member
  await addUserToOrg(ownerUid, orgId, "admin", ownerUid);

  return orgId;
}

/**
 * Generate a secure invite code
 */
export function generateInviteCode(): string {
  return randomBytes(6).toString("hex"); // Generates a 12-character hex string
}

/**
 * Generate QR code URL for invite
 */
export function generateQRCodeUrl(shortCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const joinUrl = `${baseUrl}/join?code=${encodeURIComponent(shortCode)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;
}

/**
 * Revoke all refresh tokens for a user (for security)
 */
export async function revokeUserTokens(uid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(uid);
}
