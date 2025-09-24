import {
  cert,
  getApps,
  initializeApp,
  App as AdminApp,
} from "firebase-admin/app";
import {
  getAuth as getAdminAuth,
  Auth as AdminAuth,
} from "firebase-admin/auth";

let adminApp: AdminApp | undefined;

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  try {
    // Support base64-encoded or raw JSON
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON format");
  }
}

export function adminInit(): AdminApp {
  if (adminApp) return adminApp;
  const sa = getServiceAccountFromEnv();
  const apps = getApps();
  if (apps.length) {
    adminApp = apps[0];
  } else {
    adminApp = initializeApp({
      credential: cert(sa as Record<string, unknown>),
    });
  }
  return adminApp;
}

export function adminAuth(): AdminAuth {
  return getAdminAuth(adminInit());
}
