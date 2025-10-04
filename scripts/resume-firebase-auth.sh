#!/usr/bin/env bash
set -u  # (avoid -e so we don’t stop on benign re-runs)

echo "==> Ensuring we’re in project root"
cd "$(dirname "$0")"

echo "==> Ensure npm present"
if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Please install Node and npm before continuing."
  exit 1
fi

echo "==> Install auth deps (safe to re-run)"
npm install --no-audit --no-fund firebase firebase-admin zod --save

echo "==> Create folders (no-op if they exist)"
mkdir -p src/lib
mkdir -p src/app/api/auth/session
mkdir -p src/app/api/auth/me
mkdir -p src/app/(auth)/login
mkdir -p src/app/(auth)/signup
mkdir -p src/app/(app)

echo "==> Ensure .env.example contains Firebase keys (append if missing)"
grep -q "NEXT_PUBLIC_FIREBASE_API_KEY" .env.example 2>/dev/null || cat >> .env.example <<'ENV'

# --- Firebase Web (Client) ---
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# --- Firebase Admin (Server) ---
# Paste the FULL service account JSON (or a base64 of it)
FIREBASE_SERVICE_ACCOUNT_JSON=
ENV

echo "==> Write src/lib/env.ts"
cat > src/lib/env.ts <<'TS'
import { z } from "zod";

const ClientEnv = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
});

const ServerEnv = z.object({
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1),
});

export const clientEnv = ClientEnv.parse({
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

export const serverEnv = ServerEnv.parse({
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
});
TS

echo "==> Write src/lib/firebase.client.ts"
cat > src/lib/firebase.client.ts <<'TS'
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { clientEnv } from "./env";

let app: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp({
      apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  }
  return app!;
}

export const auth = () => getAuth(getFirebaseApp());
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
TS

echo "==> Write src/lib/firebase.server.ts"
cat > src/lib/firebase.server.ts <<'TS'
import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { serverEnv } from "./env";

function parseServiceAccount(): Record<string, unknown> {
  const raw = serverEnv.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
  return raw.startsWith("{")
    ? JSON.parse(raw)
    : JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
}

function getAdminApp() {
  if (!getApps().length) {
    const sa = parseServiceAccount();
    initializeApp({ credential: cert(sa as any) });
  }
  return getApp();
}

export const adminAuth = () => getAuth(getAdminApp());
TS

echo "==> Write src/lib/auth.client.ts"
cat > src/lib/auth.client.ts <<'TS'
"use client";
import { auth, googleProvider } from "./firebase.client";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

async function setSessionFromCurrentUser() {
  const user = auth().currentUser;
  if (!user) throw new Error("No current user");
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to set server session");
}

export async function loginWithGoogle() {
  await signInWithPopup(auth(), googleProvider);
  await setSessionFromCurrentUser();
}

export async function signupWithGoogle() {
  await signInWithPopup(auth(), googleProvider);
  await setSessionFromCurrentUser();
}

export async function loginWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth(), email, password);
  await setSessionFromCurrentUser();
}

export async function signupWithEmail(email: string, password: string) {
  await createUserWithEmailAndPassword(auth(), email, password);
  await setSessionFromCurrentUser();
}

export async function logoutClient() {
  await fetch("/api/auth/session", { method: "DELETE" });
  await auth().signOut();
}
TS

echo "==> Write src/app/api/auth/session/route.ts"
cat > src/app/api/auth/session/route.ts <<'TS'
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const decoded = await adminAuth().verifyIdToken(idToken);

    cookies().set("session", idToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1h
    });

    return NextResponse.json({ uid: decoded.uid, email: decoded.email ?? null });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  cookies().delete("session");
  return NextResponse.json({ ok: true });
}
TS

echo "==> Write src/app/api/auth/me/route.ts"
cat > src/app/api/auth/me/route.ts <<'TS'
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase.server";

export async function GET() {
  const token = cookies().get("session")?.value;
  if (!token) return NextResponse.json({ user: null });

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return NextResponse.json({
      user: { uid: decoded.uid, email: decoded.email ?? null },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
TS

echo "==> Write protected src/app/(app)/layout.tsx"
cat > src/app/(app)/layout.tsx <<'TSX'
import { ReactNode } from "react";
import { redirect } from "next/navigation";

async function getUser() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/auth/me`, { cache: "no-store" }).catch(() => null);
  const data = await res?.json().catch(() => ({ user: null })) ?? { user: null };
  return data.user as { uid: string; email: string | null } | null;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
TSX

echo "==> Google button component"
mkdir -p src/components/auth
cat > src/components/auth/GoogleButton.tsx <<'TSX'
"use client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.3 14.6 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.9 0 9.5-4.8 9.5-7.2 0-.5-.1-.8-.1-1.1H12z"/>
    </svg>
  );
}

export function GoogleButton({
  onClick,
  label = "Continue with Google",
  disabled,
}: {
  onClick: () => Promise<void> | void;
  label?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      disabled={busy || disabled}
      onClick={async () => {
        try { setBusy(true); await onClick(); }
        finally { setBusy(false); }
      }}
    >
      <GoogleIcon className="h-4 w-4" />
      {busy ? "Working..." : label}
    </Button>
  );
}
TSX

echo "==> Write login page"
cat > src/app/(auth)/login/page.tsx <<'TSX'
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { loginWithGoogle, loginWithEmail } from "@/lib/auth.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setErr(null);
    try {
      await loginWithGoogle();
      r.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed");
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await loginWithEmail(email, password);
      r.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Email login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Log in</h1>

        <GoogleButton onClick={handleGoogle} label="Continue with Google" />

        <div className="text-center text-sm text-muted-foreground">or</div>

        <form className="space-y-3" onSubmit={handleEmail}>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          <Button className="w-full" disabled={busy} type="submit">{busy ? "Signing in..." : "Log in"}</Button>
        </form>

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <p className="text-sm text-muted-foreground">
          New here? <Link className="underline" href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
TSX

echo "==> Write signup page"
cat > src/app/(auth)/signup/page.tsx <<'TSX'
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { signupWithGoogle, signupWithEmail } from "@/lib/auth.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SignupPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setErr(null);
    try {
      await signupWithGoogle();
      r.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-up failed");
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await signupWithEmail(email, password);
      r.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Email sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Create your account</h1>

        <GoogleButton onClick={handleGoogle} label="Sign up with Google" />

        <div className="text-center text-sm text-muted-foreground">or</div>

        <form className="space-y-3" onSubmit={handleEmail}>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e)=>setPassword(e.target.value)} minLength={6} required />
          <Button className="w-full" disabled={busy} type="submit">{busy ? "Creating..." : "Create account"}</Button>
        </form>

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <p className="text-sm text-muted-foreground">
          Already have an account? <Link className="underline" href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
TSX

echo "==> Minimal signed-in landing: src/app/(app)/dashboard/page.tsx"
cat > src/app/(app)/dashboard/page.tsx <<'TSX'
export default async function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">You are signed in.</p>
    </div>
  );
}
TSX

echo "==> Optional middleware to bounce signed-in users off /login /signup"
cat > src/middleware.ts <<'TS'
import { NextResponse, type NextRequest } from "next/server";
const AUTH_ROUTES = ["/login", "/signup"];

export default function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const { pathname } = req.nextUrl;

  if (session && AUTH_ROUTES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup"]
};
TS

echo "==> Resume complete."
echo "Next steps:"
echo "  1) Fill .env.local with your Firebase values (copy from .env.example)."
echo "  2) Enable Google provider in Firebase Console → Authentication → Sign-in method."
echo "  3) Add localhost to authorized domains in Firebase Auth settings."
echo "  4) Start dev: pnpm dev   (or VS Code Task: Start All (Web + API))"
