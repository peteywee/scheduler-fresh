import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock Firebase admin and auth utils
vi.mock("@/lib/firebase.server", () => ({
  adminAuth: vi.fn(() => ({
    verifySessionCookie: vi.fn(),
  })),
}));

vi.mock("@/lib/auth-utils", () => ({
  switchUserPrimaryOrg: vi.fn(),
}));

describe("/api/auth/switch-org", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe("CSRF Protection", () => {
    it("should require CSRF token in header and cookie", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/switch-org",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: "__session=valid-session",
          },
          body: JSON.stringify({ orgId: "org-1" }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("CSRF validation failed");
    });

    it("should accept matching CSRF token in header and cookie", async () => {
      const { adminAuth } = await import("@/lib/firebase.server");
      const { switchUserPrimaryOrg } = await import("@/lib/auth-utils");

      const mockVerifySessionCookie = vi.fn().mockResolvedValue({
        uid: "test-uid",
      });
      (adminAuth as any).mockReturnValue({
        verifySessionCookie: mockVerifySessionCookie,
        revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
      });
      (switchUserPrimaryOrg as any).mockResolvedValue(undefined);

      const csrfToken = "test-csrf-token";
      const request = new NextRequest(
        "http://localhost:3000/api/auth/switch-org",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
            origin: "http://localhost:3000",
            cookie: `__session=valid-session; XSRF-TOKEN=${csrfToken}`,
          },
          body: JSON.stringify({ orgId: "org-1" }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should reject mismatched CSRF tokens", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/switch-org",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": "header-token",
            origin: "http://localhost:3000",
            cookie: "__session=valid-session; XSRF-TOKEN=cookie-token",
          },
          body: JSON.stringify({ orgId: "org-1" }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("CSRF validation failed");
    });

    it("should reject missing CSRF header", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/switch-org",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: "__session=valid-session; XSRF-TOKEN=cookie-token",
          },
          body: JSON.stringify({ orgId: "org-1" }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("CSRF validation failed");
    });

    it("should reject missing CSRF cookie", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/switch-org",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": "header-token",
            origin: "http://localhost:3000",
            cookie: "__session=valid-session",
          },
          body: JSON.stringify({ orgId: "org-1" }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("CSRF validation failed");
    });
  });

  describe("Origin Validation", () => {
    it("should block requests from unauthorized origins", async () => {
      const csrfToken = "test-csrf-token";
      const request = new NextRequest("https://evil.com/api/auth/switch-org", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
          origin: "https://evil.com",
          cookie: `__session=valid-session; XSRF-TOKEN=${csrfToken}`,
        },
        body: JSON.stringify({ orgId: "org-1" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("Forbidden origin");
    });

    it("should allow requests from configured origins", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com";

      const { adminAuth } = await import("@/lib/firebase.server");
      const { switchUserPrimaryOrg } = await import("@/lib/auth-utils");

      const mockVerifySessionCookie = vi.fn().mockResolvedValue({
        uid: "test-uid",
      });
      (adminAuth as any).mockReturnValue({
        verifySessionCookie: mockVerifySessionCookie,
        revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
      });
      (switchUserPrimaryOrg as any).mockResolvedValue(undefined);

      const csrfToken = "test-csrf-token";
      const request = new NextRequest("https://myapp.com/api/auth/switch-org", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
          origin: "https://myapp.com",
          cookie: `__session=valid-session; XSRF-TOKEN=${csrfToken}`,
        },
        body: JSON.stringify({ orgId: "org-1" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Authentication", () => {
    it("should require valid session", async () => {
      const csrfToken = "test-csrf-token";
      const request = new NextRequest(
        "http://localhost:3000/api/auth/switch-org",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
            origin: "http://localhost:3000",
            cookie: `XSRF-TOKEN=${csrfToken}`,
          },
          body: JSON.stringify({ orgId: "org-1" }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentication required");
    });

    it("should handle invalid session tokens", async () => {
      const { adminAuth } = await import("@/lib/firebase.server");
      const mockVerifySessionCookie = vi
        .fn()
        .mockRejectedValue(new Error("Invalid session"));
      (adminAuth as any).mockReturnValue({
        verifySessionCookie: mockVerifySessionCookie,
      });

      const csrfToken = "test-csrf-token";
      const request = new NextRequest(
        "http://localhost:3000/api/auth/switch-org",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
            origin: "http://localhost:3000",
            cookie: `__session=invalid-session; XSRF-TOKEN=${csrfToken}`,
          },
          body: JSON.stringify({ orgId: "org-1" }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid session");
    });
  });
});
