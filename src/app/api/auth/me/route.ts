import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import { getUserCustomClaims, getUserOrganizations } from "@/lib/auth-utils";
import type { CustomClaims, Organization } from "@/lib/types";

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

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export async function GET(req: NextRequest) {
  if (!allowOrigin(req)) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }

  const session = req.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const auth = adminAuth();
    const decoded = await auth.verifySessionCookie(session, true);
    const user = await auth.getUser(decoded.uid);

    const claims: CustomClaims =
      (user.customClaims as CustomClaims | undefined) ??
      (await getUserCustomClaims(user.uid));

    let organizations: Organization[] = [];
    if (!isBuildPhase()) {
      organizations = await getUserOrganizations(user.uid);
    }

    const emailVerified =
      typeof user.emailVerified === "boolean"
        ? user.emailVerified
        : Boolean(decoded.email_verified);

    return NextResponse.json({
      authenticated: true,
      uid: user.uid,
      email: user.email ?? null,
      emailVerified,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      claims,
      organizations,
    });
  } catch (error) {
    console.warn("Failed to verify auth session", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
