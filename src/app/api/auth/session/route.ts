import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";

const ONE_DAY_SECONDS = 60 * 60 * 24;

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
  if (!origin) return true; // allow same-origin/no CORS fetches
  return getAllowedOrigins().includes(origin);
}

export async function POST(req: NextRequest) {
  if (!allowOrigin(req))
    return new NextResponse("Forbidden origin", { status: 403 });
  if (!validateCsrf(req))
    return new NextResponse("CSRF validation failed", { status: 403 });

  const { idToken } = await req
    .json()
    .catch(() => ({ idToken: undefined as string | undefined }));
  if (!idToken)
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });

  try {
    // Verify ID token before creating cookie
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    // Optional: Enforce email verified if needed
    // Create a session cookie
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: ONE_DAY_SECONDS * 5 * 1000,
    });
    const res = NextResponse.json({ ok: true, uid: decoded.uid });
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: ONE_DAY_SECONDS * 5,
    });
    return res;
  } catch {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 401 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!allowOrigin(req))
    return new NextResponse("Forbidden origin", { status: 403 });
  if (!validateCsrf(req))
    return new NextResponse("CSRF validation failed", { status: 403 });

  try {
    const sessionCookie = req.cookies.get("__session")?.value;
    if (sessionCookie) {
      const decoded = await adminAuth().verifySessionCookie(
        sessionCookie,
        true,
      );
      await adminAuth().revokeRefreshTokens(decoded.sub);
    }
  } catch {
    // ignore errors during logout
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });
  return res;
}
