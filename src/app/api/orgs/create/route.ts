import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import { OrganizationSchema, sanitizeOrgId } from "@/lib/types";
import { createOrganization } from "@/lib/auth-utils";

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

    // Parse request body
    const body = await req.json().catch(() => ({}));
    
    // Validate organization data
    const { name, description, isPublic } = body;
    
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Organization name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: "Organization name must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (description && typeof description === "string" && description.length > 500) {
      return NextResponse.json(
        { success: false, error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Create organization
    const orgData = {
      name: name.trim(),
      description: description?.trim() || undefined,
      ownerUid: uid,
      isPublic: Boolean(isPublic),
      settings: {
        allowPublicJoinRequests: Boolean(isPublic),
        requireApprovalForJoin: true,
      },
      createdBy: uid,
    };

    const orgId = await createOrganization(orgData, uid);

    return NextResponse.json({
      success: true,
      orgId,
      orgName: orgData.name,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create organization" },
      { status: 500 }
    );
  }
}