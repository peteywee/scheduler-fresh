import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase.server";
import { generateInviteCode } from "@/lib/auth-utils";
import { generateShortCode } from "@/lib/types";

// Types for bulk invite creation
interface BulkInviteUserInput {
  email: string;
  role: "admin" | "manager" | "employee";
}

interface BulkInviteRequestBody {
  orgId: string;
  users: BulkInviteUserInput[];
}

const bulkCreateSchema = z.object({
  orgId: z.string(),
  users: z.array(
    z.object({
      email: z.string().email(),
      role: z.enum(["admin", "manager", "employee"]),
    }),
  ),
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // TODO: Implement getSession from auth context
    // const session = await getSession(req);
    const session: { uid: string } | null = null;
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const { uid: _uid } = session; // placeholder until auth implemented

    const json: unknown = await req.json();
    const { orgId, users } = bulkCreateSchema.parse(
      json as BulkInviteRequestBody,
    );

    // TODO: Implement verifyOrgAccess for org-level permissions
    // const allowed = await verifyOrgAccess(session.uid, orgId, ["admin", "manager"]);
    const allowed = false;
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
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
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues },
        { status: 400 },
      );
    }
    // Intentionally minimal logging to avoid leaking PII; include message only.
     
    console.error("Bulk invite creation error", (error as Error).message);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
