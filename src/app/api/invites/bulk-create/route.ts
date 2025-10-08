import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, adminAuth, adminInit } from "@/lib/firebase.server";
import { generateInviteCode } from "@/lib/auth-utils";
import { generateShortCode } from "@/lib/types";
import { isUserOrgAdmin } from "@/lib/auth-utils";

const bulkCreateSchema = z.object({
  orgId: z.string(),
  users: z.array(
    z.object({
      email: z.string().email(),
      role: z.enum(["admin", "manager", "employee"]),
    }),
  ),
});

// Lazy initialize admin SDK
function getDb() {
  adminInit();
  return adminDb();
}

export async function POST(req: NextRequest) {
  try {
    // Verify session cookie
    const session = req.cookies.get("__session")?.value;
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth().verifySessionCookie(session, true).catch(() => null);
    if (!decoded?.uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const { orgId, users } = parsed.data;

    // Verify the requester has org admin access
    const isAdmin = await isUserOrgAdmin(decoded.uid, orgId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const invitesCollection = db.collection(`orgs/${orgId}/invites`);
    const batch = db.batch();
    let createdCount = 0;

    for (const user of users) {
      const code = generateInviteCode();
      const shortCode = generateShortCode(orgId, code);

      const docRef = invitesCollection.doc();
      const newInvite = {
        code,
        shortCode,
        role: user.role,
        email: user.email,
        createdAt: new Date(),
        isActive: true,
        currentUses: 0,
      };

      batch.set(docRef, newInvite);
      createdCount++;
    }

    await batch.commit();
    return NextResponse.json({ success: true, createdCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error("Bulk invite creation error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
