'use server';

import { flagConflicts } from "@/ai/flows/conflict-flagging";

export async function detectConflictsAction(
    prevState: any,
    formData: FormData,
) {
    const employeeAvailabilityDocs = formData.get('employeeAvailabilityDocs') as string;
    const currentSchedule = formData.get('currentSchedule') as string;

    if (!employeeAvailabilityDocs || !currentSchedule) {
        return { result: null, error: "Please provide both availability and schedule information." };
    }

    try {
        const result = await flagConflicts({
            employeeAvailabilityDocs,
            currentSchedule,
        });
        return { result, error: null };
    } catch (error) {
        console.error("Error in conflict detection:", error);
        return { result: null, error: "An unexpected error occurred while analyzing the schedule." };
    }
}
