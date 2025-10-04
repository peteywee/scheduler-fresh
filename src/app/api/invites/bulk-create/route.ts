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
    const json = await req.json();
    const { orgId, users } = bulkCreateSchema.parse(json);

    const invitesCollection = adminDb().collection(`orgs/${orgId}/invites`);
    let createdCount = 0;

    for (const user of users) {
      const code = generateInviteCode();
      const shortCode = generateShortCode(orgId, code);

      const newInvite = {
        code,
        shortCode,
        role: user.role,
        email: user.email, // Storing email for reference
        createdAt: new Date(),
        isActive: true,
        currentUses: 0,
      };

      await invitesCollection.add(newInvite);
      createdCount++;
    }

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
