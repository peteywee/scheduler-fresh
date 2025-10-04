import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/join",
  "/discover",
  "/onboarding",
  "/api/auth/session",
  "/api/auth/me",
  "/api/auth/csrf",
  "/api/discovery/search",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie for protected routes
  const sessionCookie = request.cookies.get("__session");

  if (!sessionCookie) {
    // Redirect to login for unauthenticated users
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // For Edge Runtime, we can't verify the session here
  // Session verification will happen in individual API routes and pages
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
