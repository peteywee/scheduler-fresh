import * as functions from "firebase-functions";
import { replicateApprovedAttendance } from "./replicateAttendance";

// Trigger on updates to org attendance documents
export const onAttendanceWrite = functions.firestore
  .document("orgs/{orgId}/attendance/{eventId}")
  .onWrite(async (change: unknown, context: unknown) => {
    try {
      await replicateApprovedAttendance(change as any, context as any);
    } catch (err) {
      console.error("replicateApprovedAttendance failed:", err);
      throw err;
    }
  });
