import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import { getFirestore } from "firebase-admin/firestore";
import {
  CreateInviteRequestSchema,
  CreateInviteResponse,
  InviteCode,
  generateShortCode,
} from "@/lib/types";
import {
  generateInviteCode,
  generateQRCodeUrl,
  getUserCustomClaims,
  isUserOrgAdmin,
} from "@/lib/auth-utils";

// Lazy initialize Firestore to avoid build-time errors
let db: FirebaseFirestore.Firestore | null = null;

function getFirestore_() {
  if (!db) {
    db = getFirestore();
  }
  return db;
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
    return NextResponse.json<CreateInviteResponse>(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = CreateInviteRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json<CreateInviteResponse>(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { orgId, role, expiresIn, maxUses, notes } = parseResult.data;

    // Verify user is admin of the organization
    const isAdmin = await isUserOrgAdmin(uid, orgId);
    if (!isAdmin) {
      return NextResponse.json<CreateInviteResponse>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Verify organization exists
    const orgDoc = await getFirestore_().doc(`orgs/${orgId}`).get();
    if (!orgDoc.exists) {
      return NextResponse.json<CreateInviteResponse>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // Generate invite code
    const code = generateInviteCode();
    const now = new Date();
    const expiresAt = expiresIn ? new Date(now.getTime() + expiresIn * 24 * 60 * 60 * 1000) : undefined;

    const inviteData: InviteCode = {
      code,
      orgId,
      createdBy: uid,
      createdAt: now,
      expiresAt,
      maxUses,
      currentUses: 0,
      isActive: true,
      role,
      notes,
    };

    // Save invite to Firestore
    await getFirestore_().doc(`orgs/${orgId}/invites/${code}`).set(inviteData);

    // Generate response data
    const shortCode = generateShortCode(orgId, code);
    const qrCodeUrl = generateQRCodeUrl(shortCode);

    return NextResponse.json<CreateInviteResponse>({
      success: true,
      invite: {
        code,
        shortCode,
        qrCodeUrl,
        expiresAt: expiresAt?.toISOString(),
        maxUses,
      },
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json<CreateInviteResponse>(
      { success: false, error: "Failed to create invite" },
      { status: 500 }
    );
  }
}