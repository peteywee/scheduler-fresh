import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import { getFirestore } from "firebase-admin/firestore";
import { ApproveRequestSchema, JoinRequest } from "@/lib/types";
import { addUserToOrg, isUserOrgAdmin } from "@/lib/auth-utils";

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
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = ApproveRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 },
      );
    }

    const {
      requestId,
      approved,
      role,
      notes,
      orgId: requestOrgId,
    } = parseResult.data;

    // Require orgId to avoid inefficient scans
    if (!requestOrgId) {
      return NextResponse.json(
        { success: false, error: "orgId is required" },
        { status: 400 },
      );
    }

    const orgId: string = requestOrgId;
    const requestRef = db.doc(`orgs/${orgId}/joinRequests/${requestId}`);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Join request not found" },
        { status: 404 },
      );
    }

    const requestData = requestDoc.data() as JoinRequest;

    // Verify user is admin of the organization
    const isAdmin = await isUserOrgAdmin(uid, orgId);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    // Verify request is still pending
    if (requestData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Request has already been processed" },
        { status: 400 },
      );
    }

    const now = new Date();

    if (approved) {
      // Add user to organization
      await addUserToOrg(requestData.requestedBy, orgId, role, uid);
    }

    // Update request status
    await requestRef.update({
      status: approved ? "approved" : "rejected",
      reviewedAt: now,
      reviewedBy: uid,
      reviewNotes: notes,
    });

    return NextResponse.json({
      success: true,
      status: approved ? "approved" : "rejected",
    });
  } catch (error) {
    console.error("Error processing join request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}
