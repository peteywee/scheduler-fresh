import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_COOKIE = "csrf";
export const CSRF_HEADER = "x-csrf-token";

/** Sets (if missing) and returns the CSRF token stored in a non-HTTPOnly cookie. */
export function ensureCsrfToken(): string {
  const jar = cookies();
  const current = jar.get(CSRF_COOKIE)?.value;
  if (current) return current;
  const token = crypto.randomBytes(24).toString("base64url");
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  return token;
}

/** Validates the CSRF token by comparing header with the cookie value. */
export function validateCsrf(headerToken?: string | null): boolean {
  const cookieToken = cookies().get(CSRF_COOKIE)?.value;
  return !!cookieToken && !!headerToken && cookieToken === headerToken;
}
