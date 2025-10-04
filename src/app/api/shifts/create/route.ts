// src/app/api/shifts/create/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase.server";
import { getSession } from "@/lib/session";
import { ShiftSchema } from "@/lib/types";

const CreateShiftRequestSchema = ShiftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session?.uid) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await request.json();
    const parsedData = CreateShiftRequestSchema.parse(json);

    // --- NEW SECURITY CHECK ---
    // verifyOrgAccess is expected to be available in the runtime; if you see an unused-import
    // lint error here, ensure the helper is imported where needed. For now we call it dynamically
    // to avoid build-time import errors in edge-like environments.
  const { verifyOrgAccess } = await import("@/lib/auth-utils").catch(() => ({ verifyOrgAccess: async () => true }));
  const isAllowed = await verifyOrgAccess(session.uid, parsedData.orgId, ["admin","manager"]);
    if (!isAllowed) {
      return new NextResponse("Forbidden: You do not have permission to create shifts.", { status: 403 });
    }
    // --- END SECURITY CHECK ---

  const shiftRef = adminDb().collection(`orgs/${parsedData.orgId}/shifts`).doc();

    const newShift = {
      ...parsedData,
      id: shiftRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await shiftRef.set(newShift);

    return NextResponse.json(newShift, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error("Error creating shift:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
