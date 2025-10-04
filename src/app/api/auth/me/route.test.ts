import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

// Mock Firebase admin
vi.mock("@/lib/firebase.server", () => ({
  adminAuth: vi.fn(() => ({
    verifySessionCookie: vi.fn(),
    getUser: vi.fn(),
  })),
}));

// Mock auth utils
vi.mock("@/lib/auth-utils", () => ({
  getUserCustomClaims: vi.fn(),
  getUserOrganizations: vi.fn(),
}));

describe("/api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.NEXT_PHASE;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe("Origin Validation", () => {
    it("should allow requests from localhost", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const response = await GET(request);
      expect(response.status).not.toBe(403);
    });

    it("should allow requests from 127.0.0.1", async () => {
      const request = new NextRequest("http://127.0.0.1:3000/api/auth/me", {
        headers: {
          origin: "http://127.0.0.1:3000",
        },
      });

      const response = await GET(request);
      expect(response.status).not.toBe(403);
    });

    it("should allow requests from configured app URL", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com";

      const request = new NextRequest("https://myapp.com/api/auth/me", {
        headers: {
          origin: "https://myapp.com",
        },
      });

      const response = await GET(request);
      expect(response.status).not.toBe(403);
    });

    it("should block requests from unauthorized origins", async () => {
      const request = new NextRequest("https://evil.com/api/auth/me", {
        headers: {
          origin: "https://evil.com",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("Forbidden origin");
    });

    it("should allow requests without origin header", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/me");

      const response = await GET(request);
      expect(response.status).not.toBe(403);
    });
  });

  describe("Authentication", () => {
    it("should return 401 when no session cookie", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/me");

      const response = await GET(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ authenticated: false });
    });

    it("should return user data when valid session", async () => {
      const { adminAuth } = await import("@/lib/firebase.server");
      const { getUserCustomClaims, getUserOrganizations } = await import(
        "@/lib/auth-utils"
      );

      const mockVerifySessionCookie = vi.fn().mockResolvedValue({
        uid: "test-uid",
      });
      const mockGetUser = vi.fn().mockResolvedValue({
        uid: "test-uid",
        email: "test@example.com",
        emailVerified: true,
        displayName: "Test User",
        photoURL: null,
      });
      (adminAuth as any).mockReturnValue({
        verifySessionCookie: mockVerifySessionCookie,
        getUser: mockGetUser,
      });
      (getUserCustomClaims as any).mockResolvedValue({
        orgId: "org-1",
        orgRole: "admin",
      });
      (getUserOrganizations as any).mockResolvedValue([
        { id: "org-1", name: "Test Org" },
      ]);

      const request = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          cookie: "__session=valid-session-token",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.authenticated).toBe(true);
      expect(data.uid).toBe("test-uid");
      expect(data.email).toBe("test@example.com");
    });

    it("should handle build-time phase gracefully", async () => {
      process.env.NEXT_PHASE = "phase-production-build";

      const { adminAuth } = await import("@/lib/firebase.server");
      const mockVerifySessionCookie = vi.fn().mockResolvedValue({
        uid: "test-uid",
      });
      const mockGetUser = vi.fn().mockResolvedValue({
        uid: "test-uid",
        email: "test@example.com",
        emailVerified: true,
        displayName: "Test User",
        photoURL: null,
        customClaims: { orgId: "org-1" },
      });
      (adminAuth as any).mockReturnValue({
        verifySessionCookie: mockVerifySessionCookie,
        getUser: mockGetUser,
      });

      const request = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          cookie: "__session=valid-session-token",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.authenticated).toBe(true);
      expect(data.uid).toBe("test-uid");
      // Should not try to access Firestore during build
    });

    it("should return 401 for invalid session", async () => {
      const { adminAuth } = await import("@/lib/firebase.server");
      const mockVerifySessionCookie = vi
        .fn()
        .mockRejectedValue(new Error("Invalid session"));
      (adminAuth as any).mockReturnValue({
        verifySessionCookie: mockVerifySessionCookie,
      });

      const request = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          cookie: "__session=invalid-session-token",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ authenticated: false });
    });
  });
});
