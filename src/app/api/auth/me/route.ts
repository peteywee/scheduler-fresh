import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";

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
  if (!session)
    return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const user = await adminAuth().getUser(decoded.uid);
    return NextResponse.json({
      authenticated: true,
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      customClaims: user.customClaims ?? {},
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
