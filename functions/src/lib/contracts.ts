import * as admin from "firebase-admin";

export type Contract = {
  parentId: string;
  subOrgId: string;
  billRate: number;
  rounding?: "nearest-15" | "nearest-5" | "none";
  period?: "weekly" | "biweekly" | "monthly";
};

export async function getParentForOrg(db: admin.firestore.Firestore, orgId: string): Promise<string | null> {
  const orgRef = db.collection("orgs").doc(orgId);
  const snap = await orgRef.get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return (data.parentId as string) || null;
}

export async function getContract(
  db: admin.firestore.Firestore,
  parentId: string,
  subOrgId: string
): Promise<Contract | null> {
  const ref = db.collection("parents").doc(parentId).collection("contracts").doc(subOrgId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  return {
    parentId,
    subOrgId,
    billRate: Number(data?.billRate || 0),
    rounding: (data?.rounding || "none"),
    period: (data?.period || "biweekly"),
  };
}
