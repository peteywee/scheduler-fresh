import { getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Singleton admin initialization with emulator awareness.
// Uses environment variables already expected for local dev.

const adminApp: App = !getApps().length ? initializeApp() : getApps()[0]!;

const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

// Emulator config (only apply if env flags set)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  db.settings({ ignoreUndefinedProperties: true });
}

export { adminApp, db, auth };
