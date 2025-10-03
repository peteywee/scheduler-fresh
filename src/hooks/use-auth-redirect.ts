"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AuthMeResponse {
  authenticated: boolean;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoURL?: string;
  customClaims?: {
    orgId?: string;
    orgIds?: string[];
    admin?: boolean;
    orgRole?: string;
    orgRoles?: Record<string, string>;
  };
}

export function useAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const checkAuthAndRedirect = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          // Not authenticated, stay on current page
          return;
        }

        const data: AuthMeResponse = await response.json();

        if (!data.authenticated) {
          // Not authenticated, stay on current page
          return;
        }

        if (!mounted) return;

        // Check if user has org claims
        const hasOrgClaims = data.customClaims?.orgId || 
                           (data.customClaims?.orgIds && data.customClaims.orgIds.length > 0);

        if (!hasOrgClaims) {
          // First-time user, redirect to onboarding
          router.push("/onboarding");
        } else {
          // User has org, redirect to dashboard
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // On error, stay on current page
      }
    };

    checkAuthAndRedirect();

    return () => {
      mounted = false;
    };
  }, [router]);
}