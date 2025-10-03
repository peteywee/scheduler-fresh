"use client";
import { auth, googleProvider } from "./firebase.client";
import {
  onIdTokenChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

function getCsrf(): string | undefined {
  const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

async function postSession(idToken: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": getCsrf() || "",
    },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to set session");
}

export async function loginWithGoogle() {
  await signInWithPopup(auth(), googleProvider);
  const t = await auth().currentUser?.getIdToken(true);
  if (t) await postSession(t);
}

export async function signupWithGoogle() {
  await loginWithGoogle();
}

export async function loginWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth(), email, password);
  const t = await auth().currentUser?.getIdToken(true);
  if (t) await postSession(t);
}

export async function signupWithEmail(email: string, password: string) {
  await createUserWithEmailAndPassword(auth(), email, password);
  const t = await auth().currentUser?.getIdToken(true);
  if (t) await postSession(t);
}

export async function logoutClient() {
  await fetch("/api/auth/session", { method: "DELETE" });
  await auth().signOut();
}

/** Optional: call this once in a top-level client layout to keep session cookie fresh. */
export function installAuthSessionSync() {
  onIdTokenChanged(auth(), async (user) => {
    if (!user) return;
    const t = await user.getIdToken();
    try {
      await postSession(t);
    } catch {
      // Ignore session sync errors
    }
  });
}
