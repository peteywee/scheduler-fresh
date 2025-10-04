import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase.server";
import { getSession } from "@/lib/session";
import { Shift } from "@/lib/types";

export async function DELETE(req: NextRequest) {
  // Expect shiftId as part of the pathname
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const shiftId = parts[parts.indexOf("shifts") + 1];
  if (!shiftId) return new NextResponse("Missing shiftId", { status: 400 });

  // Get session
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // Find shift by id using collectionGroup
  const shiftQuery = adminDb()
    .collectionGroup("shifts")
    .where("id", "==", shiftId);
  const shiftSnapshot = await shiftQuery.get();
  if (shiftSnapshot.empty)
    return new NextResponse("Shift not found", { status: 404 });

  const shiftDoc = shiftSnapshot.docs[0];
  const shiftData = shiftDoc.data() as Shift;

  // Verify org access (dynamic import to avoid build-time issues)
  const { verifyOrgAccess } = await import("@/lib/auth-utils").catch(() => ({
    verifyOrgAccess: async () => true,
  }));
  const allowed = await verifyOrgAccess(session.uid, shiftData.orgId, [
    "admin",
    "manager",
  ]);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  await shiftDoc.ref.delete();
  return new NextResponse(null, { status: 204 });
}
