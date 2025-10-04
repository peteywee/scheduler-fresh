import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminInit } from "@/lib/firebase.server";
import { getFirestore } from "firebase-admin/firestore";

import { isUserOrgAdmin } from "@/lib/auth-utils";

interface InviteData {
  code: string;
  role: string;
  expiresAt?: FirebaseFirestore.Timestamp;
  maxUses: number;
  currentUses?: number;
  createdAt?: FirebaseFirestore.Timestamp;
  isActive: boolean;
  notes?: string;
  qrCodeUrl?: string;
}

interface InviteResponse {
  code: string;
  shortCode: string;
  role: string;
  expiresAt: string | undefined;
  maxUses: number;
  currentUses: number;
  createdAt: string | undefined;
  isActive: boolean;
  notes?: string;
  qrCodeUrl?: string;
}

interface ListInvitesResponse {
  success: boolean;
  invites?: InviteResponse[];
  error?: string;
}

// Lazy initialize to avoid build-time errors
function getDb(): FirebaseFirestore.Firestore {
  adminInit();
  return getFirestore();
}

function getAllowedOrigins(): string[] {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  return envOrigin ? [envOrigin, ...defaults] : defaults;
}

function allowOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ListInvitesResponse>> {
  if (!allowOrigin(req)) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }

  // Verify session
  const session = req.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    const orgId = decoded.org_id || decoded.orgId; // Support both claim formats

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 },
      );
    }

    // Verify user is admin of the organization
    const isAdmin = await isUserOrgAdmin(uid, orgId);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get all invites for the organization
    const invitesSnapshot = await getDb()
      .collection(`orgs/${orgId}/invites`)
      .where("isActive", "==", true) // Only fetch active invites
      .orderBy("createdAt", "desc")
      .get();

    const invites: InviteResponse[] = invitesSnapshot.docs.map((doc) => {
      const data = doc.data() as InviteData;
      return {
        code: data.code,
        shortCode: `${orgId}-${data.code}`,
        role: data.role,
        expiresAt: data.expiresAt?.toDate().toISOString(),
        maxUses: data.maxUses,
        currentUses: data.currentUses || 0,
        createdAt: data.createdAt?.toDate().toISOString(),
        isActive: data.isActive,
        notes: data.notes,
        qrCodeUrl: data.qrCodeUrl,
      };
    });

    return NextResponse.json({
      success: true,
      invites,
    });
  } catch (error) {
    console.error("Error listing invites:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list invites" },
      { status: 500 },
    );
  }
}
