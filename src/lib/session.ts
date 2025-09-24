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
