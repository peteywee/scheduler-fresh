import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminInit } from "@/lib/firebase.server";
import { getFirestore } from "firebase-admin/firestore";
import { isUserOrgAdmin } from "@/lib/auth-utils";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!allowOrigin(req)) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }
  if (!validateCsrf(req)) {
    return new NextResponse("CSRF validation failed", { status: 403 });
  }

  // Verify session
  const session = req.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    const orgId = decoded.org_id || decoded.orgId; // Support both claim formats

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 }
      );
    }

    // Verify user is admin of the organization
    const isAdmin = await isUserOrgAdmin(uid, orgId);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // code is already destructured at the top

    // Update invite to set isActive = false
    const inviteRef = getDb().doc(`orgs/${orgId}/invites/${code}`);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    await inviteRef.update({
      isActive: false,
      revokedAt: new Date(),
      revokedBy: uid,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error revoking invite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke invite" },
      { status: 500 }
    );
  }
}