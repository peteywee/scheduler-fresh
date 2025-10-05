import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminInit } from "@/lib/firebase.server";
import { getFirestore } from "firebase-admin/firestore";
import { ApproveRequestSchema } from "@/lib/types";

interface JoinRequestShape {
  id: string;
  orgId: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedByName: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string | null;
}
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
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    if (decoded.email_verified === false) {
      return NextResponse.json(
        { success: false, error: "Email must be verified to request access" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = ApproveRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 },
      );
    }

    const { orgId, requestId, approved, role, notes } = parseResult.data;

    // Verify organization exists and allows join requests
    const orgDoc = await getDb().doc(`orgs/${orgId}`).get();
    if (!orgDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    const orgData = orgDoc.data();
    if (!orgData?.settings?.allowPublicJoinRequests) {
      return NextResponse.json(
        { success: false, error: "Organization does not accept join requests" },
        { status: 400 },
      );
    }

    // Transactionally approve or reject the join request
    const requestRef = getDb().doc(`orgs/${orgId}/joinRequests/${requestId}`);
    const result = await getDb().runTransaction(async (tx) => {
      const snap = await tx.get(requestRef);
      if (!snap.exists) {
        return { status: 404 as const };
      }
      const data = snap.data() as JoinRequestShape;
      if (data.status !== "pending") {
        return { status: 409 as const };
      }
      const reviewedAt = new Date();
      if (approved) {
        // Add user to org (outside transaction addUserToOrg performs its own writes)
        await addUserToOrg(data.requestedBy, orgId, role, uid);
      }
      tx.update(requestRef, {
        status: approved ? "approved" : "rejected",
        reviewedAt,
        reviewedBy: uid,
        reviewNotes: notes ?? null,
      });
      return { status: 200 as const };
    });

    if (result.status === 404) {
      return NextResponse.json(
        { success: false, error: "Join request not found" },
        { status: 404 },
      );
    }
    if (result.status === 409) {
      return NextResponse.json(
        { success: false, error: "Join request already processed" },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error requesting access:", error);
    return NextResponse.json(
      { success: false, error: "Failed to request access" },
      { status: 500 },
    );
  }
}
