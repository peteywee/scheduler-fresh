import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { replicateApprovedAttendance } from './replicateAttendance';

// Initialize Admin SDK once per instance
initializeApp();

/**
 * Triggers when attendance documents are written in any organization
 * Path: orgs/{orgId}/attendance/{eventId}
 */
export const onAttendanceWrite = onDocumentWritten(
  'orgs/{orgId}/attendance/{eventId}',
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after = event.data?.after?.data() ?? null;
    const { orgId, eventId } = event.params;

    console.log(`Attendance write trigger: org=${orgId}, event=${eventId}`);

    // Only process when status changes to "approved"
    if (after?.status === 'approved' && before?.status !== 'approved') {
      if (!event.data) return;
      try {
        await replicateApprovedAttendance(event.data, {
          orgId,
          eventId,
        });
        console.log(`Successfully replicated attendance ${eventId} for org ${orgId}`);
      } catch (error) {
        console.error(`Failed to replicate attendance ${eventId}:`, error);
        throw error; // Re-throw to trigger Firebase Functions retry
      }
    }
  },
);
