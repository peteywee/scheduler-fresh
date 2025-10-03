import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const CSRF_COOKIE = "csrf";
export const CSRF_HEADER = "x-csrf-token";

/** Sets (if missing) and returns the CSRF token stored in a non-HTTPOnly cookie. */
export async function createCsrfToken() {
  const jar = await cookies();
  const current = jar.get(CSRF_COOKIE)?.value;
  const token = current || randomBytes(32).toString("hex");

  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/** Validates the CSRF token by comparing header with the cookie value. */
export async function validateCsrf(
  headerToken?: string | null,
): Promise<boolean> {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  return !!cookieToken && !!headerToken && cookieToken === headerToken;
}
