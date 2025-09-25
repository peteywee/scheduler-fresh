import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminInit } from "@/lib/firebase.server";
import { getFirestore } from "firebase-admin/firestore";
import { RequestAccessSchema, JoinRequest } from "@/lib/types";

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
      { status: 401 }
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    const user = await adminAuth().getUser(uid);
    if (decoded.email_verified === false) {
      return NextResponse.json(
        { success: false, error: "Email must be verified to request access" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = RequestAccessSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { orgId, message } = parseResult.data;

    // Verify organization exists and allows join requests
    const orgDoc = await getDb().doc(`orgs/${orgId}`).get();
    if (!orgDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgData = orgDoc.data();
    if (!orgData?.settings?.allowPublicJoinRequests) {
      return NextResponse.json(
        { success: false, error: "Organization does not accept join requests" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const memberDoc = await getDb().doc(`orgs/${orgId}/members/${uid}`).get();
    if (memberDoc.exists) {
      return NextResponse.json(
        { success: false, error: "You are already a member of this organization" },
        { status: 400 }
      );
    }

    // Check if user already has a pending request
    const existingRequestQuery = await db
      .collection(`orgs/${orgId}/joinRequests`)
      .where("requestedBy", "==", uid)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingRequestQuery.empty) {
      return NextResponse.json(
        { success: false, error: "You already have a pending request for this organization" },
        { status: 400 }
      );
    }

    // Create join request
    const requestRef = getDb().collection(`orgs/${orgId}/joinRequests`).doc();
    const now = new Date();
    
    const joinRequest: JoinRequest = {
      id: requestRef.id,
      orgId,
      requestedBy: uid,
      requestedByEmail: user.email || "",
      requestedByName: user.displayName || "",
      message,
      status: "pending",
      createdAt: now,
    };

    await requestRef.set(joinRequest);

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
    });
  } catch (error) {
    console.error("Error requesting access:", error);
    return NextResponse.json(
      { success: false, error: "Failed to request access" },
      { status: 500 }
    );
  }
}