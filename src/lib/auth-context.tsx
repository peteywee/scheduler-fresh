"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

async function seedCsrf() {
  try {
    await fetch("/api/auth/csrf", { method: "GET", credentials: "include" });
  } catch {
    // ignore
  }
}

async function getCsrfTokenFromCookie(): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seed CSRF token early
    seedCsrf();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      try {
        const csrf = await getCsrfTokenFromCookie();
        if (!csrf) await seedCsrf();
        const idToken = u ? await u.getIdToken(/* forceRefresh */ true) : null;
        if (idToken) {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": (await getCsrfTokenFromCookie()) || "",
            },
            credentials: "include",
            body: JSON.stringify({ idToken }),
          });
        }
      } catch {
        // ignore session sync errors; client auth still works
      }
    });

    // Lightweight heartbeat: refresh session cookie every ~50 minutes if signed in
    const interval = setInterval(
      async () => {
        try {
          const u = auth.currentUser;
          if (!u) return;
          const idToken = await u.getIdToken(true);
          await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": (await getCsrfTokenFromCookie()) || "",
            },
            credentials: "include",
            body: JSON.stringify({ idToken }),
          });
        } catch {
          // ignore background refresh errors
        }
      },
      50 * 60 * 1000,
    );

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with email:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing up with email:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Try to revoke server session first
      const csrf = (await getCsrfTokenFromCookie()) || "";
      await fetch("/api/auth/session", {
        method: "DELETE",
        headers: { "x-csrf-token": csrf },
        credentials: "include",
      }).catch(() => {});
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
