"use server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase.server";

export async function getServerUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

/**
 * getSession(request?)
 * - When called with a Request (API routes) it will parse the __session cookie
 *   from the request headers and verify it with the Admin SDK.
 * - When called with no args (server components) it delegates to getServerUser.
 */
export async function getSession(request?: Request) {
  if (!request) return getServerUser();

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.split(";").map(s => s.trim()).find(s => s.startsWith("__session="));
  const session = match ? decodeURIComponent(match.split("=")[1] || "") : null;
  if (!session) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
