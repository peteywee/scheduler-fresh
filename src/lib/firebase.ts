import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'demo-app-id',
};

// Only initialize Firebase if not in build phase
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let googleProvider: any = null;

if (process.env.NEXT_PHASE !== 'phase-production-build') {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firebase Auth with Google provider
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Configure Google provider
  googleProvider.addScope("email");
  googleProvider.addScope("profile");

  // Initialize Firestore
  db = getFirestore(app);

  // Initialize Storage
  storage = getStorage(app);

  // Connect to emulators in development
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    } catch (error) {
      // Emulators may already be connected, ignore errors
      console.log("Firebase emulators connection info:", error);
    }
  }
}

export { auth, googleProvider, db, storage };

export default app;
