import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import { OrganizationSchema } from "@/lib/types";
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
      { status: 401 },
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    // Parse request body
    const body = await req.json().catch(() => ({}));

    // Validate organization data using Zod schema
    const parseResult = OrganizationSchema.pick({
      name: true,
      description: true,
      isPublic: true,
    }).safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parseResult.error.issues[0]?.message || "Invalid organization data",
        },
        { status: 400 },
      );
    }

    const { name, description, isPublic } = parseResult.data;

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
      { status: 500 },
    );
  }
}
