import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase.server";
import { generateInviteCode } from "@/lib/auth-utils";
import { generateShortCode } from "@/lib/types";

const bulkCreateSchema = z.object({
  orgId: z.string(),
  users: z.array(
    z.object({
      email: z.string().email(),
      role: z.enum(["admin", "manager", "employee"]),
    }),
  ),
});

export async function POST(req: Request) {
  try {
    // AuthN
    const session = await getSession(req);
    if (!session?.uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const { orgId, users } = bulkCreateSchema.parse(json);

    // AuthZ
    const allowed = await verifyOrgAccess(session.uid, orgId, ["admin", "manager"]);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const db = adminDb();
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
      return NextResponse.json(
        { success: false, error: error.issues },
        { status: 400 },
      );
    }
    console.error("Bulk invite creation error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
