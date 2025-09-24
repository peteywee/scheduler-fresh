import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  JoinOrgRequestSchema,
  JoinOrgResponse,
  validateInviteCode,
  InviteCode,
} from "@/lib/types";
import { addUserToOrg } from "@/lib/auth-utils";

const db = getFirestore();

function getAllowedOrigins(): string[] {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  return envOrigin ? [envOrigin, ...defaults] : defaults;
}

function validateCsrf(req: NextRequest): boolean {
  const header = req.headers.get("x-csrf-token");
  const cookie = req.cookies.get("XSRF-TOKEN")?.value;
  return Boolean(header && cookie && header === cookie);
}

function allowOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

export async function POST(req: NextRequest) {
  if (!allowOrigin(req)) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }
  if (!validateCsrf(req)) {
    return new NextResponse("CSRF validation failed", { status: 403 });
  }

  // Verify session
  const session = req.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.json<JoinOrgResponse>(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = JoinOrgRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json<JoinOrgResponse>(
        { success: false, error: "Invalid request data" },
        { status: 400 },
      );
    }

    const { inviteCode, orgId: directOrgId } = parseResult.data;

    let orgId: string;
    let role: "admin" | "manager" | "employee" = "employee";

    if (inviteCode) {
      // Join via invite code
      const parsed = validateInviteCode(inviteCode);
      if (!parsed) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Invalid invite code format" },
          { status: 400 },
        );
      }

      orgId = parsed.orgId;
      const code = parsed.inviteCode;

      // Get invite document
      const inviteDoc = await db.doc(`orgs/${orgId}/invites/${code}`).get();
      if (!inviteDoc.exists) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Invite code not found" },
          { status: 404 },
        );
      }

      const invite = inviteDoc.data() as InviteCode;

      // Validate invite
      if (!invite.isActive) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Invite code is no longer active" },
          { status: 400 },
        );
      }

      if (invite.expiresAt && new Date() > invite.expiresAt) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Invite code has expired" },
          { status: 400 },
        );
      }

      if (invite.maxUses && invite.currentUses >= invite.maxUses) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Invite code has reached maximum uses" },
          { status: 400 },
        );
      }

      role = invite.role;

      // Update invite usage atomically
      await inviteDoc.ref.update({
        currentUses: FieldValue.increment(1),
      });
    } else if (directOrgId) {
      // Direct join (for bootstrap case)
      orgId = directOrgId;

      // Verify organization exists and allows direct joining
      const orgDoc = await db.doc(`orgs/${orgId}`).get();
      if (!orgDoc.exists) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Organization not found" },
          { status: 404 },
        );
      }

      // Only allow direct join if no members exist (bootstrap)
      const membersSnapshot = await db
        .collection(`orgs/${orgId}/members`)
        .limit(1)
        .get();
      if (!membersSnapshot.empty) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Organization requires an invite code" },
          { status: 400 },
        );
      }

      role = "admin"; // First user becomes admin
    } else {
      return NextResponse.json<JoinOrgResponse>(
        { success: false, error: "Either inviteCode or orgId is required" },
        { status: 400 },
      );
    }

    // Verify organization exists
    const orgDoc = await db.doc(`orgs/${orgId}`).get();
    if (!orgDoc.exists) {
      return NextResponse.json<JoinOrgResponse>(
        { success: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    const orgData = orgDoc.data();

    // Check if user is already a member
    const memberDoc = await db.doc(`orgs/${orgId}/members/${uid}`).get();
    if (memberDoc.exists) {
      return NextResponse.json<JoinOrgResponse>(
        {
          success: false,
          error: "You are already a member of this organization",
        },
        { status: 400 },
      );
    }

    // Add user to organization
    await addUserToOrg(uid, orgId, role, uid);

    return NextResponse.json<JoinOrgResponse>({
      success: true,
      orgId,
      orgName: orgData?.name,
      role,
    });
  } catch (error) {
    console.error("Error joining organization:", error);
    return NextResponse.json<JoinOrgResponse>(
      { success: false, error: "Failed to join organization" },
      { status: 500 },
    );
  }
}
