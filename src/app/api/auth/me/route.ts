import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import { getFirestore } from "firebase-admin/firestore";
import { AuthMeResponse, Organization } from "@/lib/types";
import { getUserOrganizations, getUserCustomClaims } from "@/lib/auth-utils";

function allowOrigin(req: NextRequest): boolean {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = envOrigin ? [envOrigin, ...defaults] : defaults;
  return allowed.includes(origin);
}

export async function GET(req: NextRequest) {
  if (!allowOrigin(req))
    return new NextResponse("Forbidden origin", { status: 403 });
  
  const session = req.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.json<AuthMeResponse>(
      { authenticated: false }, 
      { status: 401 }
    );
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const user = await adminAuth().getUser(decoded.uid);
    
    // During build time, don't try to access Firestore
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json<AuthMeResponse>({
        authenticated: true,
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        customClaims: user.customClaims as any,
      });
    }
    
    const customClaims = await getUserCustomClaims(decoded.uid);
    
    // Get user's organizations
    const organizations = await getUserOrganizations(decoded.uid);
    
    // Get primary organization details
    let primaryOrg: Organization | undefined;
    if (customClaims.orgId) {
      primaryOrg = organizations.find(org => org.id === customClaims.orgId);
    }

    return NextResponse.json<AuthMeResponse>({
      authenticated: true,
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      customClaims,
      primaryOrg,
      organizations,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json<AuthMeResponse>(
      { authenticated: false }, 
      { status: 401 }
    );
  }
}
