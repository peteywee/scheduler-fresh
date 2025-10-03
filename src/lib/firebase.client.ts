import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp;
if (!getApps().length) app = initializeApp(firebaseConfig);
else app = getApps()[0]!;

let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function firebaseApp(): FirebaseApp {
  return app;
}

export function auth(): Auth {
  if (!_auth) {
    _auth = getAuth(app);
    if (
      typeof window !== "undefined" &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ) {
      try {
        connectAuthEmulator(_auth, "http://127.0.0.1:9099", {
          disableWarnings: true,
        });
      } catch {
        // Emulator may already be connected
      }
    }
  }
  return _auth!;
}

export function db(): Firestore {
  if (!_db) {
    _db = getFirestore(app);
    if (
      typeof window !== "undefined" &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ) {
      try {
        connectFirestoreEmulator(_db, "127.0.0.1", 8080);
      } catch {
        // Emulator may already be connected
      }
    }
  }
  return _db!;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
