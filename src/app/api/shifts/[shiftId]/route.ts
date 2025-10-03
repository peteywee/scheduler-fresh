// src/app/api/shifts/[shiftId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase.server";
import { getSession } from "@/lib/session";
import { ShiftSchema } from "@/lib/types";
import { verifyOrgAccess } from "@/lib/auth-utils";

const UpdateShiftRequestSchema = ShiftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export async function PUT(request: Request, { params }: { params: { shiftId: string } }) {
  try {
    const session = await getSession(request);
    if (!session?.uid) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await request.json();
    const parsedData = UpdateShiftRequestSchema.parse(json);

    if (!parsedData.orgId) {
        return new NextResponse("Organization ID is required", { status: 400 });
    }

    // --- NEW SECURITY CHECK ---
    const isAllowed = await verifyOrgAccess(session.uid, parsedData.orgId, [
      "admin",
      "manager",
    ]);
    if (!isAllowed) {
      return new NextResponse("Forbidden: You do not have permission to update shifts.", { status: 403 });
    }
    // --- END SECURITY CHECK ---

    const shiftRef = adminDb.collection(`orgs/${parsedData.orgId}/shifts`).doc(params.shiftId);

    const updatedShift = {
      ...parsedData,
      updatedAt: new Date(),
    };

    await shiftRef.update(updatedShift);

    return NextResponse.json({ ...updatedShift, id: params.shiftId }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error("Error updating shift:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { shiftId: string } }) {
  try {
    const session = await getSession(request);
    if (!session?.uid) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { orgId } = await request.json();

    // --- NEW SECURITY CHECK ---
    const isAllowed = await verifyOrgAccess(session.uid, orgId, [
        "admin",
        "manager",
    ]);
    if (!isAllowed) {
        return new NextResponse("Forbidden: You do not have permission to delete shifts.", { status: 403 });
    }
    // --- END SECURITY CHECK ---

    const shiftRef = adminDb.collection(`orgs/${orgId}/shifts`).doc(params.shiftId);

    await shiftRef.delete();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting shift:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
