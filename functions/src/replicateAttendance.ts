import * as admin from "firebase-admin";
import { Change, EventContext } from "firebase-functions";
import { computeHours, derivePeriodId } from "./lib/time";
import { getParentForOrg, getContract } from "./lib/contracts";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export async function replicateApprovedAttendance(
  change: Change<admin.firestore.DocumentSnapshot>,
  ctx: EventContext,
) {
  const after = change.after.exists ? change.after.data() : null;
  const before = change.before.exists ? change.before.data() : null;

  if (!after) return; // deleted
  const becameApproved =
    after.status === "approved" && (!before || before.status !== "approved");
  if (!becameApproved) return;

  const orgId = ctx.params.orgId as string;
  const parentId = await getParentForOrg(db, orgId);
  if (!parentId) {
    console.warn(`No parentId for org ${orgId}, skipping ledger replication`);
    return;
  }

  // Required fields
  const staffId = after.staffId as string;
  const venueId = after.venueId as string;
  const clockIn = after.clockIn as number;
  const clockOut = (after.clockOut ?? Date.now()) as number;

  if (!staffId || !clockIn) {
    console.warn("Attendance missing staffId/clockIn, skipping");
    return;
  }
  if (clockOut < clockIn) {
    console.warn("clockOut < clockIn, skipping");
    return;
  }

  const contract = await getContract(db, parentId, orgId);
  if (!contract) {
    console.warn(`Missing contract for parent=${parentId} org=${orgId}`);
    return;
  }

  const hours = computeHours(clockIn, clockOut, contract.rounding || "none");
  const periodId = derivePeriodId(clockOut, contract.period || "biweekly");
  const amount = Math.round(hours * (contract.billRate || 0) * 100) / 100;

  const line = {
    parentId,
    subOrgId: orgId,
    staffRef: staffId, // no PII here; parent sees only a reference
    venueId,
    periodId,
    hours,
    billRate: contract.billRate || 0,
    amount,
    sourceAttendanceId: change.after.id,
    createdAt: Date.now(),
  };

  const dest = db
    .collection("parents")
    .doc(parentId)
    .collection("ledgers")
    .doc(periodId)
    .collection("lines");

  // Append-only write
  await dest.add(line);
}
