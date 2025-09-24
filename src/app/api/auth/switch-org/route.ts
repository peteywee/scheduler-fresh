import { NextRequest, NextResponse } from "next/server";
import { SwitchOrgRequestSchema } from "@/lib/types";

// Dynamic import to avoid build-time Firebase initialization
async function loadFirebaseAdmin() {
  const { adminAuth } = await import("@/lib/firebase.server");
  const { switchUserPrimaryOrg } = await import("@/lib/auth-utils");
  return { adminAuth, switchUserPrimaryOrg };
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
    const { adminAuth, switchUserPrimaryOrg } = await loadFirebaseAdmin();
    
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = SwitchOrgRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { orgId } = parseResult.data;

    // Switch user's primary organization
    await switchUserPrimaryOrg(uid, orgId);

    // Force token refresh by revoking current tokens
    await adminAuth().revokeRefreshTokens(uid);

    return NextResponse.json({
      success: true,
      orgId,
    });
  } catch (error) {
    console.error("Error switching organization:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to switch organization";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}