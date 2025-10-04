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
import {
  getFirestore as getAdminFirestore,
  Firestore as AdminFirestore,
} from "firebase-admin/firestore";

let adminApp: AdminApp | undefined;

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    const isTestEnv = process.env.NODE_ENV === "test";
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
    }

    if (isBuildPhase || isTestEnv) {
      console.warn(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not set; using minimal configuration",
      );
      return null;
    }

    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }
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
  if (!sa) {
    // During build time or when no service account is available,
    // initialize with minimal config to prevent build errors
    const apps = getApps();
    if (apps.length) {
      adminApp = apps[0];
      return adminApp;
    }

    // Initialize with project ID only for build time
    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project";
    adminApp = initializeApp({
      projectId,
    });
    return adminApp;
  }

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

export function adminDb(): AdminFirestore {
  return getAdminFirestore(adminInit());
}
