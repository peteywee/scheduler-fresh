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

export async function GET(req: NextRequest) {
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
    const orgId = decoded.org_id || decoded.orgId;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 },
      );
    }

    // Verify user is admin
    const isAdmin = await isUserOrgAdmin(uid, orgId);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get current public profile
    const publicDoc = await getDb().doc(`orgs/${orgId}/public/profile`).get();
    const publicData = publicDoc.exists ? publicDoc.data() : null;

    return NextResponse.json({
      success: true,
      profile: publicData || {
        listed: false,
        name: "",
        city: "",
        tags: [],
      },
    });
  } catch (error) {
    console.error("Error getting public profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get public profile" },
      { status: 500 },
    );
  }
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
    const orgId = decoded.org_id || decoded.orgId;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 },
      );
    }

    // Verify user is admin
    const isAdmin = await isUserOrgAdmin(uid, orgId);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { listed, name, city, tags } = body;

    // Validate input
    if (typeof listed !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Listed must be a boolean" },
        { status: 400 },
      );
    }

    if (
      listed &&
      (!name || typeof name !== "string" || name.trim().length === 0)
    ) {
      return NextResponse.json(
        { success: false, error: "Name is required when listing organization" },
        { status: 400 },
      );
    }

    const profileData = {
      listed,
      name: name?.trim() || "",
      city: city?.trim() || "",
      tags: Array.isArray(tags)
        ? tags.filter((t) => typeof t === "string")
        : [],
      updatedAt: new Date(),
      updatedBy: uid,
    };

    // Update public profile
    await getDb()
      .doc(`orgs/${orgId}/public/profile`)
      .set(profileData, { merge: true });

    return NextResponse.json({
      success: true,
      profile: profileData,
    });
  } catch (error) {
    console.error("Error updating public profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update public profile" },
      { status: 500 },
    );
  }
}
