import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.json(
      { code: "auth/unauthorized", message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const decoded: DecodedIdToken = await adminAuth().verifySessionCookie(session, true);
    return NextResponse.json({
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: !!decoded.email_verified,
    });
  } catch {
    return NextResponse.json(
      { code: "auth/invalid-session", message: "Invalid session" },
      { status: 401 },
    );
  }
}