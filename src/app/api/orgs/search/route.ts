import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminInit } from "@/lib/firebase.server";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { ApproveRequestSchema } from "@/lib/types";
import { addUserToOrg, isUserOrgAdmin } from "@/lib/auth-utils";

// Lazy init Firestore (avoids init at build)
function db(): Firestore {
  adminInit();
  return getFirestore();
}

const ALLOWED_ROLES = ["member", "manager", "admin"] as const;

function allowedOrigins(): string[] {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  return envOrigin ? [envOrigin, ...defaults] : defaults;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins().includes(origin.replace(/\/+$/, ""));
}

function validateCsrf(req: NextRequest): boolean {
  const header = req.headers.get("x-csrf-token");
  const cookie = req.cookies.get("XSRF-TOKEN")?.value;
  return Boolean(header && cookie && header === cookie);
}

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return new NextResponse(JSON.stringify({ code, message, details }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Vary": "Origin"
    }
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return errorResponse(403, "forbidden-origin", "Origin is not allowed.");
  }

  if (!validateCsrf(req)) {
    return errorResponse(403, "csrf-failed", "CSRF validation failed.");
  }

  const session = req.cookies.get("__session")?.value;
  if (!session) {
    return errorResponse(401, "unauthenticated", "Authentication required.");
  }

  let decoded;
  try {
    decoded = await adminAuth().verifySessionCookie(session, true);
  } catch {
    return errorResponse(401, "invalid-session", "Session is invalid or expired.");
  }
  const actorUid = decoded.uid;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid-json", "Request body must be valid JSON.");
  }

  const parsed = ApproveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "validation-error", "Invalid request payload.", parsed.error.flatten());
  }

  const { requestId, approved, role, notes, orgId } = parsed.data;

  if (!ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
    return errorResponse(400, "invalid-role", "Role not permitted.");
  }

  // Authorization (early)
  if (!orgId) {
    return errorResponse(400, "missing-org-id", "Organization ID is required.");
  }
  const hasAdminRights = await isUserOrgAdmin(actorUid, orgId);
  if (!hasAdminRights) {
    return errorResponse(403, "forbidden", "Admin access required for this organization.");
  }

  const firestore = db();
  const requestRef = firestore.doc(`orgs/${orgId}/joinRequests/${requestId}`);

  try {
    const result = await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(requestRef);
      if (!snap.exists) {
        return { status: 404 as const, error: errorResponse(404, "not-found", "Join request not found.") };
      }

      const data = snap.data() as {
        status: string;
        requestedBy: string;
        createdAt: FirebaseFirestore.Timestamp;
      };

      if (data.status !== "pending") {
        return { status: 409 as const, error: errorResponse(409, "already-processed", "Request has already been processed.") };
      }

      const reviewedAt = new Date();

      if (approved) {
        // Add membership before marking approved (still inside transaction)
        await addUserToOrg(data.requestedBy, orgId!, role, actorUid);
      }

      tx.update(requestRef, {
        status: approved ? "approved" : "rejected",
        reviewedAt,
        reviewedBy: actorUid,
        reviewNotes: notes ?? null
      });

      return {
        status: 200 as const,
        success: {
          status: approved ? "approved" : "rejected",
          reviewedAt: reviewedAt.toISOString()
        }
      };
    });

    if ("error" in result) {
      return result.error;
    }

    return NextResponse.json(result.success, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Vary": "Origin"
      }
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({
      event: "approve_join_request_failed",
      orgId,
      requestId,
      actorUid,
      error: errorMessage
    }));
    return errorResponse(500, "internal-error", "Failed to process request.");
  }
}

// (Optional) Explicit method handler: Next automatically rejects others, but can be added if needed.
// export function GET() { return errorResponse(405, "method-not-allowed", "Use POST."); }