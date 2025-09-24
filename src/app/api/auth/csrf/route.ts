import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

function getAllowedOrigins(): string[] {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  return envOrigin ? [envOrigin, ...defaults] : defaults;
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = getAllowedOrigins();
  if (origin && !allowed.includes(origin)) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("XSRF-TOKEN", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
