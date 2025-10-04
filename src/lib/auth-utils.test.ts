import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setUserCustomClaims,
  getUserCustomClaims,
  addUserToOrg,
} from "@/lib/auth-utils";
import type { CustomClaims } from "@/lib/types";

// Mock Firebase Admin
const { adminAuthMock, adminInitMock } = vi.hoisted(() => {
  return {
    adminAuthMock: vi.fn(() => ({
      setCustomUserClaims: vi.fn(),
      getUser: vi.fn(),
    })),
    adminInitMock: vi.fn(),
  };
});

vi.mock("@/lib/firebase.server", () => ({
  adminAuth: adminAuthMock,
  adminInit: adminInitMock,
}));

// Mock Firestore
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
    })),
    batch: vi.fn(() => ({
      set: vi.fn(),
      commit: vi.fn(),
    })),
  })),
}));

describe("Auth Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setUserCustomClaims", () => {
    it("should set custom claims for a user", async () => {
      const { adminAuth } = await import("./firebase.server");
      const mockSetCustomUserClaims = vi.fn().mockResolvedValue(undefined);
      (adminAuth as any).mockReturnValue({
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      const uid = "test-uid";
      const claims: CustomClaims = {
        orgId: "org-123",
        orgRole: "admin",
        admin: true,
      };

      await setUserCustomClaims(uid, claims);

      expect(mockSetCustomUserClaims).toHaveBeenCalledWith(uid, claims);
    });
  });

  describe("getUserCustomClaims", () => {
    it("should return user custom claims", async () => {
      const { adminAuth } = await import("@/lib/firebase.server");
      const mockClaims: CustomClaims = {
        orgId: "org-123",
        orgRole: "admin",
        admin: true,
      };

      const mockGetUser = vi.fn().mockResolvedValue({
        uid: "test-uid",
        customClaims: mockClaims,
      });
      (adminAuth as any).mockReturnValue({
        getUser: mockGetUser,
      });

      const result = await getUserCustomClaims("test-uid");

      expect(mockGetUser).toHaveBeenCalledWith("test-uid");
      expect(result).toEqual(mockClaims);
    });

    it("should return empty object when no custom claims exist", async () => {
      const { adminAuth } = await import("@/lib/firebase.server");
      const mockGetUser = vi.fn().mockResolvedValue({
        uid: "test-uid",
        customClaims: null,
      });
      (adminAuth as any).mockReturnValue({
        getUser: mockGetUser,
      });

      const result = await getUserCustomClaims("test-uid");

      expect(result).toEqual({});
    });
  });

  describe("addUserToOrg", () => {
    it("should add user to organization and update claims", async () => {
      const { adminAuth } = await import("@/lib/firebase.server");
      const { getFirestore } = await import("firebase-admin/firestore");

      // Mock Firestore batch operations
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      const mockDoc = vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          exists: false,
          data: () => null,
        }),
        update: vi.fn().mockResolvedValue(undefined),
      }));
      (getFirestore as any).mockReturnValue({
        doc: mockDoc,
        batch: vi.fn(() => mockBatch),
      });

      // Mock admin auth
      const mockGetUser = vi.fn().mockResolvedValue({
        uid: "test-uid",
        customClaims: {},
      });
      const mockSetCustomUserClaims = vi.fn().mockResolvedValue(undefined);
      (adminAuth as any).mockReturnValue({
        getUser: mockGetUser,
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      await addUserToOrg("test-uid", "org-123", "admin", "admin-uid");

      expect(mockBatch.set).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith("test-uid", {
        orgId: "org-123",
        orgRole: "admin",
        admin: true,
        orgIds: ["org-123"],
        orgRoles: { "org-123": "admin" },
      });
    });
  });
});
