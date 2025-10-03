import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminInit } from "@/lib/firebase.server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  JoinOrgRequestSchema,
  JoinOrgResponse,
  validateInviteCode,
  InviteCode,
} from "@/lib/types";
import { addUserToOrg } from "@/lib/auth-utils";

// Lazy initialize to avoid build-time errors
function getDb() {
  adminInit();
  return getFirestore();
}

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

      // Consume invite in a transaction: validate constraints then increment usage
      await getDb().runTransaction(async (tx) => {
        const ref = getDb().doc(`orgs/${orgId}/invites/${code}`);
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error("Invite code not found");
        }
        const invite = snap.data() as InviteCode;
        if (!invite.isActive) {
          throw new Error("Invite code is no longer active");
        }
        if (invite.orgId !== orgId) {
          throw new Error("Invite code does not belong to this organization");
        }
        if (invite.expiresAt && new Date() > invite.expiresAt) {
          throw new Error("Invite code has expired");
        }
        if (invite.maxUses && (invite.currentUses ?? 0) >= invite.maxUses) {
          throw new Error("Invite code has reached maximum uses");
        }
        // Stash role for outer scope via closure capture
        role = invite.role;
        tx.update(ref, {
          currentUses: FieldValue.increment(1),
          lastUsedAt: new Date(),
        });
      });
    } else if (directOrgId) {
      // Direct join (for bootstrap case)
      orgId = directOrgId;

      // Verify organization exists and allows direct joining
      const orgDoc = await getDb().doc(`orgs/${orgId}`).get();
      if (!orgDoc.exists) {
        return NextResponse.json<JoinOrgResponse>(
          { success: false, error: "Organization not found" },
          { status: 404 },
        );
      }

      // Only allow direct join if no members exist (bootstrap)
      const membersSnapshot = await getDb()
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
    const orgDoc = await getDb().doc(`orgs/${orgId}`).get();
    if (!orgDoc.exists) {
      return NextResponse.json<JoinOrgResponse>(
        { success: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    const orgData = orgDoc.data();

    // Check if user is already a member
    const memberDoc = await getDb().doc(`orgs/${orgId}/members/${uid}`).get();
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